// auth.js
import { expressjwt } from 'express-jwt';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getEmployeeByEmail, signup } from './mongodb.js';

const JWT_SECRET = process.env.JWT_SECRET || "please-change-this-in-prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // Token valid for 1 hour

// Middleware to authenticate JWT token
export const authMiddleware = expressjwt({
    algorithms: ['HS256'],
    credentialsRequired: false, // Allow routes without token too
    secret: JWT_SECRET
});

// Handle user login
export async function handleLogin(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await getEmployeeByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const claims = { sub: user._id, email: user.email };
        const token = jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.json({ token, user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login.' });
    }
}

// Handle user sign-up
export async function handleSignUp(req, res) {
    const {
        email, password, firstName, lastName,
        dob, mobileNo, pan, gender, team,
        designation, address, address2, city, zip
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Required fields are missing.' });
    }

    try {
        const existingUser = await getEmployeeByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await signup({
            email,
            password: hashedPassword,
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
            zip
        });

        const claims = { sub: newUser._id, email: newUser.email };
        const token = jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.status(201).json({ token, user: { id: newUser._id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during signup.' });
    }
}
