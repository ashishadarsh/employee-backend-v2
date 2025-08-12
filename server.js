import { ApolloServer } from "@apollo/server";

import { expressMiddleware } from "@apollo/server/express4";
import cors from 'cors';
import {readFile} from 'node:fs/promises'
import express from 'express'
import { createServer as createHttpServer} from 'node:http'
import { useServer as useWsServer } from "graphql-ws/lib/use/ws";

import {resolvers} from './resolvers.js'
import { authMiddleware, handleLogin, handleSignUp } from "./auth.js";
import { getEmployee } from "./mongodb.js";
import { WebSocketServer } from "ws";
import { makeExecutableSchema } from "@graphql-tools/schema";

const PORT = 9000;

const app = express();

app.use(cors(), express.json(), authMiddleware);

app.post('/login', handleLogin);
app.post('/signup', handleSignUp);

const typeDefs = await readFile('./schema.graphql', 'utf8');
const schema = makeExecutableSchema({ typeDefs, resolvers })

async function getContext({req}) {
    if(req.auth) {
        const user = await getEmployee(req.auth.sub);
        return {user};
    }
    return {};
}

const apolloServer = new ApolloServer({ schema });
await apolloServer.start();
app.use('/graphql', expressMiddleware(apolloServer, {context: getContext}));

const httpServer = createHttpServer(app)

const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' })

useWsServer({ schema }, wsServer)

httpServer.listen({port: PORT}, ()=> {
    console.log(`Server running at ${PORT}`);
    console.log(`GraphQl endpoint: http://localhost:${PORT}/graphql`);
    
})