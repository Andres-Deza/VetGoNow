import express from 'express';
import { 
  login, 
  forgotPassword, 
  resetPassword,
  sendVerificationToken,
  verifyToken as verifyTokenHandler
} from '../controllers/authController.js';

const authRouter = express.Router();

// Rutas de autenticación
authRouter.post('/login', login);

// Rutas de verificación de correo electrónico
authRouter.post('/send-token', sendVerificationToken);
authRouter.post('/verify-token', verifyTokenHandler);

// Rutas de restablecimiento de contraseña
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

export default authRouter;
