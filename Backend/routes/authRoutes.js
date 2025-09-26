import express from 'express';
import { login } from '../controllers/authController.js';

const authRouter = express.Router(); // ✅ Changed from `router` to `authRouter`

// Login route
authRouter.post('/login', login); // ✅ Use `authRouter` instead of `router`


export default authRouter; // ✅ Export it with the new name
