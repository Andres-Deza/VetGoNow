import express from 'express';
import { sendVerificationToken, verifyTokenHandler } from '../controllers/authController.js';

const emailRouter = express.Router();

emailRouter.post('/toemail', sendVerificationToken);
emailRouter.post('/verify-token', verifyTokenHandler); // <-- Add this

export default emailRouter;
