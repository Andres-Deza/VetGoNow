import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // For password hashing

const VetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "Vet" },
  isApproved: { type: Boolean, default: false },

  profileImage: {
    type: String,
    default: "http://localhost:5555/uploads/default-avatar.png"
  },

  specialization: { type: String },
  experience: { type: Number },
  qualifications: { type: String },
  region: { type: String },
  comuna: { type: String },

  // Servicios ofrecidos para el futuro mapa tipo Uber
  services: {
    type: [String],
    enum: ['consultas', 'video-consultas', 'a-domicilio'],
    default: []
  },

  // Ubicación geográfica (GeoJSON Point) para mapa y búsquedas cercanas
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined
    }
  },

  // ✅ Certificate field (e.g. URL or file path)
  certificate: {
    type: String,
    default: null,
  },
});

// Índice geoespacial
VetSchema.index({ location: '2dsphere' });


// Hash password before saving
VetSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const Vet = mongoose.model("Vet", VetSchema, "veterinarians");

export default Vet;
