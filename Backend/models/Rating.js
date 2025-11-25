import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    unique: true // Solo una calificación por urgencia/cita
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vet',
    required: true
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  },
  categories: {
    punctuality: { type: Number, min: 1, max: 5 }, // Puntualidad
    professionalism: { type: Number, min: 1, max: 5 }, // Profesionalismo
    communication: { type: Number, min: 1, max: 5 }, // Comunicación
    care: { type: Number, min: 1, max: 5 } // Cuidado/atención
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
ratingSchema.index({ vetId: 1, createdAt: -1 });
ratingSchema.index({ userId: 1, createdAt: -1 });
// No crear índice duplicado para appointmentId porque ya es único (crea índice automáticamente)

const Rating = mongoose.model('Rating', ratingSchema, 'ratings');
export default Rating;

