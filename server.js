// server.js
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer as createHttpServer } from "node:http";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer as useWsServer } from "graphql-ws/lib/use/ws";

import * as db from "./mongodb.js";
import { authMiddleware, handleLogin, handleSignUp } from "./auth.js";
import { resolvers } from "./resolvers.js";
import { PubSub } from "graphql-subscriptions";

// ----- config -----
const PORT = process.env.PORT || 9000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----- read schema.graphql (robust path) -----
const schemaPath = resolve(__dirname, "schema.graphql");
const typeDefs = await readFile(schemaPath, "utf8");

// ----- prepare executable schema (for both HTTP & WS) -----
const schema = makeExecutableSchema({ typeDefs, resolvers });

// ----- app + middleware -----
const app = express();

// ✅ Helmet with CSP allowing Google Fonts
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", ...((process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean))],
      },
    })
  );

// CORS origins from env (comma-separated), allow no-origin (Postman)
const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS denied for ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(authMiddleware); // attach req.auth if token present

// ----- public auth routes -----
app.post("/login", handleLogin);
app.post("/signup", handleSignUp);
app.get("/", (req, res) => {
    res.send("✅ Employee backend is running");
  });

// ----- Apollo Server (HTTP) -----
const apollo = new ApolloServer({
  schema
});

await apollo.start();

// expressMiddleware expects a function returning context or an object
app.use(
  "/graphql",
  express.json(),
  expressMiddleware(apollo, {
    context: async ({ req }) => {
      // Pass req.auth (if present) and helpers to resolvers
      return {
        user: req.auth || null,
        loaders: {}, // placeholder for dataloader if needed
      };
    },
  })
);

// ----- HTTP server and WS server for subscriptions -----
const httpServer = createHttpServer(app);

// create WebSocket server and bind graphql-ws to it
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

// graphql-ws needs an onConnect-like context function; we'll provide a simple one
const serverCleanup = useWsServer(
  {
    schema,
    // connectionParams and extra are available on 'onConnect' in some setups.
    // graphql-ws will call the execute/subscribe directly using the schema.
    context: (ctx, msg, args) => {
      // No automatic auth here. If you want auth for subscriptions,
      // include token in connectionParams and verify here.
      // e.g., const token = ctx.connectionParams?.authorization
      return {};
    },
  },
  wsServer
);

// ----- Start HTTP server -----
httpServer.listen(PORT, async () => {
  // ensure DB connection
  try {
    await db.connectDB();
  } catch (err) {
    console.error("Failed to connect to DB on startup:", err);
    // still start - it may reconnect later
  }

  console.log(`Server running on port ${PORT}`);
  console.log(`GraphQL HTTP endpoint: http://localhost:${PORT}/graphql`);
  console.log(`GraphQL WS endpoint  : wss://<your-domain>:${PORT}/graphql`);
});

// ----- Graceful shutdown -----
process.on("SIGTERM", async () => {
  console.log("SIGTERM received: shutting down");
  serverCleanup.dispose();
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
