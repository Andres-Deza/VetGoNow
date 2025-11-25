import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  label: { type: String, required: true }, // "Casa", "Trabajo", etc.
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accessNotes: { type: String }, // Notas de acceso opcionales
  isDefault: { type: Boolean, default: false },
  commune: { type: String },
  region: { type: String }
}, { timestamps: true });

// Middleware para asegurar que solo haya una dirección predeterminada por usuario
AddressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

const Address = mongoose.model("Address", AddressSchema, "addresses");
export default Address;

