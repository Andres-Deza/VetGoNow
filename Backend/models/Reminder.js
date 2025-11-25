import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  
  // Tipo de recordatorio
  type: {
    type: String,
    enum: ['vaccine', 'deworming', 'checkup', 'medication', 'weight_check', 'other'],
    required: true
  },
  
  // Información del recordatorio
  title: { type: String, required: true },
  description: { type: String },
  
  // Fechas
  dueDate: { type: Date, required: true }, // Fecha límite
  reminderDate: { type: Date, required: true }, // Fecha del recordatorio (puede ser antes de dueDate)
  
  // Estado
  status: {
    type: String,
    enum: ['pending', 'completed', 'dismissed', 'overdue'],
    default: 'pending'
  },
  
  // Notificaciones
  notified: { type: Boolean, default: false }, // Si ya se envió notificación
  notificationSentAt: { type: Date },
  
  // Canales de notificación
  sendPush: { type: Boolean, default: true },
  sendEmail: { type: Boolean, default: true },
  
  // Relación con otros documentos
  relatedVaccineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vaccine' },
  relatedDewormingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deworming' },
  relatedAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  
  // Repetición
  isRecurring: { type: Boolean, default: false },
  recurrenceInterval: { type: Number }, // Días hasta el próximo recordatorio
  
}, { timestamps: true });

// Índices para búsquedas eficientes
reminderSchema.index({ userId: 1, status: 1, dueDate: 1 });
reminderSchema.index({ petId: 1 });
reminderSchema.index({ reminderDate: 1 }); // Para consultas de recordatorios próximos
reminderSchema.index({ notified: false, reminderDate: { $lte: new Date() } }); // Para encontrar recordatorios pendientes

const Reminder = mongoose.model('Reminder', reminderSchema, 'reminders');
export default Reminder;

