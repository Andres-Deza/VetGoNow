import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_SECRET } from "../config.js";

export const registerAdmin = async (req, res) => {
  const { name, email, phoneNumber, password, role } = req.body;

  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    admin = new Admin({
      name,
      email,
      phoneNumber,
      password,
      role: role || "admin",
    });

    await admin.save();

    const payload = {
      id: admin._id,
      role: admin.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({
      success: true,
      token,
      admin: { id: admin._id, name, email, role: admin.role },
    });
  } catch (error) {
    console.error("❌ Error registering admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (role && role !== "admin") {
      return res.status(400).json({ message: "Invalid role for admin login" });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = {
      id: admin._id,
      role: admin.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

    res.json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email, role: admin.role },
    });
  } catch (error) {
    console.error("❌ Error logging in admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    // Assuming you get admin ID from auth middleware or request param
    const adminId = req.user.id; // or req.params.id

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
