// auth.js
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as db from "./mongodb.js";

const JWT_SECRET = process.env.JWT_SECRET || "please-change-this-in-prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // token lifetime

// Simple auth middleware: parses Authorization: Bearer <token>
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
  } catch (err) {
    // invalid token -> ignore (credentialsRequired=false like behavior)
    console.warn("Invalid JWT:", err.message);
  }
  return next();
}

// Login handler
export async function handleLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email & password required" });

  const user = await db.getEmployeeByEmail(email);
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "invalid credentials" });

  const claims = { sub: user._id.toString(), email: user.email };
  const token = jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.json({ token, user: { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
}

// Signup handler (creates user and returns basic info)
export async function handleSignUp(req, res) {
  const {
    email,
    password,
    firstName = "",
    lastName = "",
    dob = null,
    mobileNo = "",
    pan = "",
    gender = "",
    team = "",
    designation = "",
    address = "",
    address2 = "",
    city = "",
    zip = "",
  } = req.body || {};

  if (!email || !password) return res.status(400).json({ error: "email & password required" });

  const existing = await db.getEmployeeByEmail(email);
  if (existing) return res.status(409).json({ error: "email already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const inserted = await db.signup({
    email,
    password: hashed,
    firstName,
    lastName,
    dob,
    mobileNo,
    pan,
    gender,
    team,
    designation,
    address,
    address2,
    city,
    zip,
  });

  // mongodb insertOne returns insertedId; fetch the document
  // mongodb.js .signup returns the result of insertOne, so adapt
  // If signup returns insertedId, we fetch
  let created;
  if (inserted?.insertedId) {
    created = await db.getEmployee(inserted.insertedId.toString());
  } else {
    // if signup returned the document itself
    created = inserted;
  }

  if (!created) return res.status(500).json({ error: "failed to create user" });

  // optional: sign token for new user
  const claims = { sub: created._id.toString(), email: created.email };
  const token = jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.status(201).json({ token, user: { _id: created._id, email: created.email, firstName: created.firstName, lastName: created.lastName } });
}
