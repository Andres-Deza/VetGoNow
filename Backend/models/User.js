import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "User" },
  isApproved: {
    type: Boolean,
    default: false,
  },
  image: {
    type: String,
    default: "http://localhost:5555/uploads/default-avatar.png"
  }
});

// Hash the password before saving (Only if it's not already hashed)
UserSchema.pre("save", async function (next) {
  if (this.isModified("password") && !this.password.startsWith("$2a$")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model("User", UserSchema, "users");
export default User;
