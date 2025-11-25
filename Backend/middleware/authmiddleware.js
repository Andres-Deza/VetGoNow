import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Vet from "../models/Veterinarian.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Not authorized, no token or invalid format" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ message: "Not authorized, invalid token structure" });
    }

    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id).select("-password");
    } else if (decoded.role === "Vet") {
      user = await Vet.findById(decoded.id).select("-password");
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      console.log(`User not found for ID: ${decoded.id}, role: ${decoded.role}`);
      return res.status(401).json({ message: "User not found" });
    }

    const normalizedId = user._id.toString();
    req.user = { id: normalizedId, role: decoded.role, name: user.name, email: user.email };
    req.userId = normalizedId;
    console.log("Authenticated user:", req.user);
    next();
  } catch (error) {
    console.error("JWT Verification Failed:", error.message);
    return res.status(401).json({ message: `Not authorized, token error: ${error.message}` });
  }
};

export const authenticate = async (req, res, next) => {
  // Usar req.headers.authorization en lugar de req.header() para consistencia
  const authHeader = req.headers.authorization || req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token or invalid format, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ message: "Invalid token structure" });
    }

    const userId = decoded.id || decoded._id;
    let userRecord = null;

    if (decoded.role === "admin") {
      userRecord = await Admin.findById(userId).select("-password");
    } else if (decoded.role === "Vet") {
      userRecord = await Vet.findById(userId).select("-password");
    } else {
      userRecord = await User.findById(userId).select("-password");
    }

    if (!userRecord) {
      return res.status(401).json({ message: "User not found" });
    }

    const normalizedId = userRecord._id.toString();
    req.user = {
      id: normalizedId,
      role: decoded.role,
      name: userRecord.name,
      email: userRecord.email
    };
    req.userId = normalizedId;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({ message: `Invalid token: ${error.message}` });
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    console.log("Checking Authorization...");
    console.log("Required Roles:", roles);
    console.log("User Info from Token:", req.user);

    if (!req.user || !roles.includes(req.user.role)) {
      console.error("Access forbidden: insufficient rights or role missing", { user: req.user, roles });
      return res.status(403).json({ message: "Access forbidden: insufficient rights" });
    }

    console.log("Authorization passed for role:", req.user.role);
    next();
  };
};