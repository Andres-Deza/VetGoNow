import mongoose from 'mongoose';

const dewormingSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Información de la desparasitación
  name: { type: String, required: true }, // Ej: "Desparasitante interno", "Antipulgas"
  type: { 
    type: String, 
    enum: ['Interna', 'Externa', 'Combinada'],
    required: true 
  },
  
  // Fechas importantes
  applicationDate: { type: Date, required: true }, // Fecha de aplicación
  nextApplicationDate: { type: Date }, // Próxima aplicación (calculada)
  
  // Información del producto
  productName: { type: String }, // Nombre comercial
  activeIngredient: { type: String }, // Principio activo
  dosage: { type: String }, // Dosificación aplicada
  
  // Información del veterinario
  vetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Veterinarian' },
  vetName: { type: String },
  
  // Notas
  notes: { type: String },
  
  // Si está asociada a una cita
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  
  // Estado
  isUpToDate: { type: Boolean, default: true }, // Si está al día
  
}, { timestamps: true });

// Índices para búsquedas eficientes
dewormingSchema.index({ petId: 1, applicationDate: -1 });
dewormingSchema.index({ userId: 1 });
dewormingSchema.index({ nextApplicationDate: 1 }); // Para recordatorios

const Deworming = mongoose.model('Deworming', dewormingSchema, 'dewormings');
export default Deworming;

