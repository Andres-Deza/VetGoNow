import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { JWT_SECRET } from "../config.js";

import User from "../models/User.js";
import Vet from "../models/Veterinarian.js";
import Admin from "../models/Admin.js";

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

    console.log("✅ User Found:", user.email);
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
    console.error("❌ Login Error:", error);
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

    console.log('working1')

    // Generate a new token
    const token = generateToken();

    // Save the token with an expiry of 10 minutes
    tokenStore.set(email, { token, expires: Date.now() + 10 * 60 * 1000 });

    console.log('working2')

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,      // Your email address
        pass: process.env.EMAIL_PASSWORD,  // Your email password or app-specific password
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${token}. It will expire in 10 minutes.`,
    };

    console.log('working3')
    // Send the email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: "Verification code sent" });

    console.log('working4')
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
