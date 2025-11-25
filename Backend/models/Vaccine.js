import mongoose from 'mongoose';

const vaccineSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Información de la vacuna
  name: { type: String, required: true }, // Ej: "Rabia", "Polivalente", "Antirrábica"
  type: { 
    type: String, 
    enum: ['Rabia', 'Polivalente', 'Tos de las perreras', 'Leucemia felina', 'Triple felina', 'Otra'],
    required: true 
  },
  
  // Fechas importantes
  applicationDate: { type: Date, required: true }, // Fecha de aplicación
  expirationDate: { type: Date }, // Fecha de vencimiento (calculada automáticamente)
  
  // Información del veterinario
  vetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Veterinarian' },
  vetName: { type: String },
  
  // Información adicional
  batchNumber: { type: String }, // Número de lote
  manufacturer: { type: String }, // Laboratorio fabricante
  nextDoseDate: { type: Date }, // Próxima dosis si aplica
  
  // Notas
  notes: { type: String },
  
  // Si está asociada a una cita
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  
  // Estado
  isUpToDate: { type: Boolean, default: true }, // Si está al día
  isExpired: { type: Boolean, default: false }, // Si está vencida
  
}, { timestamps: true });

// Índices para búsquedas eficientes
vaccineSchema.index({ petId: 1, applicationDate: -1 });
vaccineSchema.index({ userId: 1 });
vaccineSchema.index({ expirationDate: 1 }); // Para recordatorios

const Vaccine = mongoose.model('Vaccine', vaccineSchema, 'vaccines');
export default Vaccine;

