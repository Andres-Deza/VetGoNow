import mongoose from 'mongoose';

const blockedSlotSchema = new mongoose.Schema({
  vetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vet',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String, // Formato HH:MM
    required: true
  },
  endTime: {
    type: String, // Formato HH:MM
    required: true
  },
  reason: {
    type: String,
    default: 'Horario bloqueado'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: null
  },
  recurringDaysOfWeek: {
    type: [Number], // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    default: []
  },
  endDate: {
    type: Date, // Fecha de fin para bloqueos recurrentes
    default: null
  },
  blockType: {
    type: String,
    enum: ['single', 'recurring', 'week', 'business-hours'], // single = un día, recurring = patrón recurrente, week = semana completa, business-hours = horario laboral semanal
    default: 'single'
  },
  isInfinite: {
    type: Boolean,
    default: false // Si es true, el bloqueo se repite indefinidamente (usa fecha muy lejana)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas rápidas
blockedSlotSchema.index({ vetId: 1, date: 1 });

const BlockedSlot = mongoose.model('BlockedSlot', blockedSlotSchema);

export default BlockedSlot;

