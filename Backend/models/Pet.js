import mongoose from "mongoose";

const PetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  image: { type: String, required: false }, // Store image URL
  breed: { type: String, required: true },
  gender: { type: String, required: true, enum: ["Male", "Female"] },
  color: { type: String, required: true },
  description: { type: String, required: false },
}, { timestamps: true });

const Pet = mongoose.model("Pet", PetSchema,"pets");
export default Pet;
