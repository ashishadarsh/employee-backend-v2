import {expressjwt} from 'express-jwt';
import jwt from 'jsonwebtoken';
import {getEmployeeByEmail, signup} from './mongodb.js'
// import {signupEmployee} from './resolvers.js'

const secret = Buffer.from('this is my personal i mean secure and personal key','base64');

export const authMiddleware = expressjwt({
    algorithms: ['HS256'],
    credentialsRequired: false,
    secret
});

export async function handleLogin(req, res) {
    const {email, password} = req.body;
    const user = await getEmployeeByEmail(email);
    if(!user || user.email !== email || user.password !== password) {
        res.sendStatus(401);
    } else {
        const claims = {sub: user._id, email: user.email}
        const token = jwt.sign(claims, secret);
        res.json({token});
    }
}

export async function handleSignUp(req, res) {
    const {email, password, firstName, lastName, dob, mobileNo, pan, gender, team, designation, address, address2, city, zip} = req.body;
    const user = await signup({email, password, firstName, lastName, dob, mobileNo, pan, gender, team, designation, address, address2, city, zip});
    if(!user || user.email !== email || user.password !== password) {
        res.sendStatus(302);
    }
    
}