import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { JWT_SECRET } from "../config.js";

// API to Register User
// API to Register User (with image)
export const registerUser = async (req, res) => {
  try {
    console.log("Incoming request body:", req.body);
    console.log("Incoming file info:", req.file);

    const { name, email, phoneNumber, password, role } = req.body; // added role here

    // Check for missing required fields
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!email) missingFields.push("email");
    if (!phoneNumber) missingFields.push("phoneNumber");
    if (!password) missingFields.push("password");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing fields: ${missingFields.join(", ")}`,
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // No hashear manualmente - el pre-save hook del modelo User lo hará
    // Esto evita doble hash
    const image = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : "https://ui-avatars.com/api/?name=Usuario&background=6366F1&color=FFFFFF";

    const newUser = new User({
      name,
      email,
      phoneNumber,
      password, // El pre-save hook hasheará la contraseña
      image,
      role: role || "user", // use role from req.body or default
      isApproved: false,
    });

    const savedUser = await newUser.save();

    const token = jwt.sign(
      { id: savedUser._id, role: savedUser.role },
      JWT_SECRET,
      { expiresIn: "3d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("name email isApproved");
        console.log("Fetched Users:", users); // Log all users
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};



// API to Approve User
export const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndUpdate(
            id,
            { isApproved: true },
            { new: true }
        ).select("name email isApproved");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, message: "User approved", user });
    } catch (error) {
        console.error("Error approving user:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// API to Remove User
export const removeUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, message: "User removed" });
    } catch (error) {
        console.error("Error removing user:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

//getting owners name for appointment section in admin
export const getOwnerNameById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select('name');
    if (!user) {
      return res.status(404).json({ message: 'Owner not found' });
    }
    res.json({ user: { name: user.name } });
  } catch (error) {
    console.error('Error fetching owner name:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// GET /api/users/userdetail/:id
export const getUserDetail = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/users/profile - Get current user profile
export const getCurrentUserProfile = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/users/profile - Update current user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { name, email, phoneNumber, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      updateData.email = email;
    }
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};