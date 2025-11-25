import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { JWT_SECRET, SMTP_CONFIG, EMAIL_FROM } from "../config.js";

import User from "../models/User.js";
import Vet from "../models/Veterinarian.js";
import Admin from "../models/Admin.js";

// Transporter de email unificado usando SMTP_CONFIG
const emailTransporter = nodemailer.createTransport({
  host: SMTP_CONFIG.host,
  port: Number(SMTP_CONFIG.port),
  secure: SMTP_CONFIG.secure,
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.pass,
  },
});

// ------------------ LOGIN FUNCTION ------------------
export const login = async (req, res) => {
  const { email, password, role } = req.body;
  console.log("🔵 Login Attempt - Email:", email, "Role:", role);

  try {
    let user;

    // Role-based user fetching
    if (role === "user") {
      console.log("🟢 Searching for user...");
      user = await User.findOne({ email });
    } else if (role === "vet") {
      console.log("🟢 Searching for vet...");
      user = await Vet.findOne({ email });
    } else if (role === "admin") {
      console.log("🟢 Searching for admin...");
      user = await Admin.findOne({ email });
    } else {
      console.log("🔴 Invalid Role:", role);
      return res.status(400).json({ message: "Invalid role. Please select a valid role." });
    }

    // Check if user exists
    if (!user) {
      console.log("🔴 User Not Found - Email:", email);
  return res.status(401).json({ message: "Correo o contraseña inválidos" });
    }

    console.log("User Found:", user.email);
    console.log("Password Entered:", password);
    console.log("Stored Password:", user.password);



    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("🔴 Password Mismatch - Email:", email);
  return res.status(401).json({ message: "Correo o contraseña inválidos" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Respond with token, user info, and approval status (if vet)
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      approved: role === "vet" ? user.isApproved : true,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// --------------------------------------------
// Email verification token handling
// --------------------------------------------

// Temporary in-memory store for tokens (use Redis or DB for production)
const tokenStore = new Map();

// Generate 6-digit numeric token
const generateToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification token via email
export const sendVerificationToken = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Generate a new token
    const token = generateToken();

    // Save the token with an expiry of 10 minutes
    tokenStore.set(email, { token, expires: Date.now() + 10 * 60 * 1000 });

    // Email content
    const mailOptions = {
      from: EMAIL_FROM || SMTP_CONFIG.user,
      to: email,
      subject: 'Código de verificación - VetGoNow',
      text: `Tu código de verificación es: ${token}. Expirará en 10 minutos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">Código de verificación</h2>
          <p>Tu código de verificación es:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7c3aed; border-radius: 8px; margin: 20px 0;">
            ${token}
          </div>
          <p>Este código expirará en 10 minutos.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Si no solicitaste este código, puedes ignorar este correo.</p>
        </div>
      `,
    };

    // Send the email
    await emailTransporter.sendMail(mailOptions);

    console.log(`Código de verificación enviado a: ${email}`);

    return res.status(200).json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ success: false, message: "Failed to send verification code" });
  }
};

// Helper function to verify token (export if needed elsewhere)
export const verifyToken = (email, token) => {
  const record = tokenStore.get(email);
  if (!record) return false;

  if (record.token === token && record.expires > Date.now()) {
    tokenStore.delete(email); // Remove token after successful verification
    return true;
  }
  return false;
};

// Handler for verifying token via API
export const verifyTokenHandler = (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ success: false, message: "Email and token are required" });
  }

  const isValid = verifyToken(email, token);

  if (isValid) {
    return res.status(200).json({ success: true, message: "Token verified successfully" });
  } else {
    return res.status(400).json({ success: false, message: "Invalid or expired token" });
  }
};

// emailTransporter ya está definido arriba

// Generate reset token and save it to the user
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Forgot password request
// Forgot password request
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔵 Iniciando solicitud de recuperación para:', email);
    console.log('🔵 Configuración SMTP:', {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      user: SMTP_CONFIG.user ? '***' : 'No configurado',
      pass: SMTP_CONFIG.pass ? '***' : 'No configurado'
    });

    if (!email) {
      console.log('🔴 Error: No se proporcionó correo electrónico');
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Buscar el usuario en todos los modelos
    let user = await User.findOne({ email });
    let userType = 'user';
    
    if (!user) {
      user = await Vet.findOne({ email });
      userType = 'vet';
    }
    
    if (!user) {
      user = await Admin.findOne({ email });
      userType = 'admin';
    }

    if (!user) {
      console.log('🔴 Usuario no encontrado, pero no se revelará por seguridad');
      // No revelar que el correo no existe por razones de seguridad
      return res.status(200).json({
        success: true,
        message: 'Si el correo existe, se ha enviado un enlace de recuperación',
      });
    }

    // Generar token de restablecimiento
    const resetToken = generateResetToken();
    const resetTokenExpiry = Date.now() + 3600000; // 1 hora de expiración

    // Guardar el token en el usuario
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Crear el enlace de restablecimiento
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Enviar correo electrónico
    const mailOptions = {
      to: email,
      from: EMAIL_FROM || 'noreply@vetgonow.com',
      subject: 'Restablece tu contraseña en VetGoNow',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Restablecer contraseña</h2>
          <p>Hola,</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>Por favor, haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Restablecer contraseña
            </a>
          </p>
          <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Saludos,<br>El equipo de VetGoNow</p>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Si el correo existe, se ha enviado un enlace de recuperación',
    });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud de restablecimiento de contraseña',
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token, email y nueva contraseña son requeridos',
      });
    }

    // Buscar el usuario en todos los modelos
    let user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      user = await Vet.findOne({
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
    }

    if (!user) {
      user = await Admin.findOne({
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'El token es inválido o ha expirado',
      });
    }

    // Actualizar la contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña',
    });
  }
};
