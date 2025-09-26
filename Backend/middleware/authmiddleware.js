import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("❌ No token or invalid format in Authorization header:", authHeader);
    return res.status(401).json({ message: "Not authorized, no token or invalid format" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log("❌ Token missing after splitting Authorization header");
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Decoded Token:", decoded);

    if (!decoded || !decoded.id || !decoded.role) {
      console.log("❌ Invalid token structure:", decoded);
      return res.status(401).json({ message: "Not authorized, invalid token structure" });
    }

    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id).select("-password");
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      console.log(`❌ User not found for ID: ${decoded.id}, role: ${decoded.role}`);
      return res.status(401).json({ message: "User not found" });
    }

    req.user = { id: user._id, role: decoded.role, name: user.name, email: user.email };
    console.log("✅ Authenticated user:", req.user);
    next();
  } catch (error) {
    console.error("❌ JWT Verification Failed:", error.message);
    return res.status(401).json({ message: `Not authorized, token error: ${error.message}` });
  }
};

export const authenticate = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("❌ No token or invalid format in Authorization header:", authHeader);
    return res.status(401).json({ message: 'No token or invalid format, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log("❌ Token missing after splitting Authorization header");
    return res.status(401).json({ message: 'Token missing, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token Decoded:", decoded);

    if (!decoded || !decoded.id || !decoded.role) {
      console.log("❌ Invalid token structure:", decoded);
      return res.status(401).json({ message: "Invalid token structure" });
    }

    req.user = decoded;
    req.userId = decoded.id || decoded._id;
    console.log("✅ Authentication passed for user:", req.user);
    next();
  } catch (error) {
    console.error('❌ JWT Verification Error:', error.message);
    return res.status(401).json({ message: `Invalid token: ${error.message}` });
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    console.log("🔍 Checking Authorization...");
    console.log("🔍 Required Roles:", roles);
    console.log("🔍 User Info from Token:", req.user);

    if (!req.user || !roles.includes(req.user.role)) {
      console.error("🚫 Access forbidden: insufficient rights or role missing", { user: req.user, roles });
      return res.status(403).json({ message: "Access forbidden: insufficient rights" });
    }

    console.log("✅ Authorization passed for role:", req.user.role);
    next();
  };
};