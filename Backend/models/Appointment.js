import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet', required: false },
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  appointmentDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  isPaid: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: [
      'pending', 
      'scheduled', 
      'completed', 
      'cancelled', 
      'assigned', 
      'in_progress',
      'cancelled_by_vet_on_time',
      'cancelled_late_by_vet',
      'cancelled_by_tutor',
      'no_show_vet',
      'no_show_tutor',
      // Estados específicos para urgencias
      'pending_assignment',
      'rejected_by_vet',
      'accepted_by_vet',
      'incident_vet_no_arrived',
      'incident_clinic_no_received',
      'reassigned_to_other_vet'
    ], 
    default: 'pending' 
  },
  appointmentType: { type: String, enum: ['clinic visit', 'online consultation', 'home visit'], default: 'clinic visit' },
  isEmergency: { type: Boolean, default: false },
  
  // Precio de la consulta
  consultationPrice: { type: Number, default: 0 }, // $0 por defecto (gratis para videoconsultas)
  
  // Campos para urgencias
  mode: { type: String, enum: ['home', 'clinic', 'telemedicine'], default: 'home' },
  
  // Triaje
  triage: {
    mainReason: { type: String },
    criticalFlags: [{ type: String }],
    onsetMinutes: { type: Number },
    notes: { type: String },
    attachments: [{ type: String }], // URLs de imágenes/videos
    priorityHint: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  },
  
  // Ubicación
  location: {
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    accessNotes: { type: String },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet', default: null }
  },
  
  // Asignación
  assignment: {
    strategy: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    preferredVetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet', default: null }
  },
  
  // Costos
  pricing: {
    base: { type: Number, default: 0 },
    distanceSurcharge: { type: Number, default: 0 },
    timeSurcharge: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'CLP' }
  },
  
  // Tracking
  tracking: {
    status: { type: String, enum: ['pending', 'vet-assigned', 'on-way', 'arrived', 'tutor-arrived', 'in-service', 'completed', 'cancelled'], default: 'pending' },
    eta: { type: Number }, // ETA en minutos
    acceptedAt: { type: Date },
    onWayAt: { type: Date },
    arrivedAt: { type: Date },
    userConfirmedAt: { type: Date }, // Cuando el usuario confirma la llegada del vet
    autoConfirmed: { type: Boolean, default: false }, // Si fue confirmado automáticamente por geolocalización
    arrivalDistance: { type: Number }, // Distancia en metros cuando llegó el vet
    tutorArrivedAt: { type: Date }, // Cuando la clínica confirma que el tutor llegó
    completedAt: { type: Date },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number }
    },
    route: [{
      lat: { type: Number },
      lng: { type: Number },
      timestamp: { type: Date }
    }],
    lastUpdate: { type: Date }
  },
  
  // Calificación
  ratingReminderShown: {
    type: Boolean,
    default: false
  },
  
  // Consentimiento
  consent: {
    tosAccepted: { type: Boolean, default: false },
    recordShare: { type: Boolean, default: false }
  },
  
  // Pago
  payment: {
    method: { type: String, enum: ['mercadopago', 'dev_bypass', 'cash'], default: 'mercadopago' },
    savedTokenId: { type: String, default: null },
    transactionId: { type: String, default: null }
  },

  offer: {
    currentVet: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet', default: null },
    expiresAt: { type: Date, default: null },
    queue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vet' }],
    round: { type: Number, default: 1 }, // Ronda actual: 1 = primera ronda, 2 = segunda oportunidad
    manualAttemptCount: { type: Number, default: 0 }, // Contador de intentos para asignación manual
    maxManualAttempts: { type: Number, default: 2 }, // Máximo de intentos para asignación manual
    history: [
      {
        vetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet' },
        status: {
          type: String,
          enum: ['offered', 'accepted', 'rejected', 'timeout', 'cancelled', 'exhausted'],
          default: 'offered'
        },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: null }
      }
    ],
    status: {
      type: String,
      enum: ['idle', 'offering', 'accepted', 'exhausted', 'cancelled'],
      default: 'idle'
    }
  },

  // Cancelación
  cancellationReason: { type: String, default: null },
  cancellationReasonCode: { type: String, default: null }, // Código para análisis estadístico
  cancellationFee: { type: Number, default: 0 },
  cancelledBy: { 
    type: String, 
    enum: ['VET', 'TUTOR', 'SYSTEM'], 
    default: null 
  },
  cancelledAt: { type: Date, default: null },
  penalizaVet: { type: Boolean, default: false },
  
  // Incidentes de urgencias
  incident: {
    reportedAt: { type: Date, default: null },
    reportedBy: { 
      type: String, 
      enum: ['VET', 'CLINIC', 'SYSTEM'], 
      default: null 
    },
    reason: { type: String, default: null },
    requiresReassignment: { type: Boolean, default: false },
    reassignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet', default: null },
    reassignedAt: { type: Date, default: null }
  }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema, 'appointments');
export default Appointment;
