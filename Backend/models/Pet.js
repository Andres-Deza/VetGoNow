import mongoose from "mongoose";

const PetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  image: { type: String, required: false }, // Store image URL
  
  // Campos básicos obligatorios
  species: { 
    type: String, 
    required: true, 
    enum: ["Perro", "Gato", "Ave", "Reptil", "Conejo", "Hamster", "Otro"],
    default: "Perro"
  },
  breed: { type: String, required: true },
  gender: { type: String, required: true, enum: ["Macho", "Hembra"], default: "Macho" },
  color: { type: String, required: false },
  
  // Campos de edad y peso
  birthDate: { type: Date, required: false }, // Fecha de nacimiento
  ageYears: { type: Number, required: false }, // Edad en años (si no hay fecha de nacimiento)
  ageMonths: { type: Number, required: false }, // Edad en meses (complemento)
  weight: { type: Number, required: false }, // Peso en kg
  
  // Campo adicional
  description: { type: String, required: false },
  
  // Campo para soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, required: false },
}, { timestamps: true });

// Virtual para calcular edad desde fecha de nacimiento
PetSchema.virtual('calculatedAge').get(function() {
  if (this.birthDate) {
    const today = new Date();
    const birth = new Date(this.birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { years, months };
  }
  return null;
});

const Pet = mongoose.model("Pet", PetSchema,"pets");
export default Pet;
