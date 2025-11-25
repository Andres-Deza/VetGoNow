import mongoose from 'mongoose';

const vetEarningsSchema = new mongoose.Schema({
  vetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vet',
    required: true,
    index: true
  },
  
  // Referencia al appointment/emergency que generó esta ganancia
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true
  },
  
  // Tipo de servicio
  serviceType: {
    type: String,
    enum: [
      'emergency_home',
      'emergency_clinic',
      'appointment_clinic',
      'appointment_home',
      'teleconsultation'
    ],
    required: true
  },
  
  // Precio total que pagó el cliente
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Comisión que se descuenta (ganancia de la app)
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Ganancia neta del veterinario (totalPrice - commissionAmount)
  vetEarnings: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Fecha del servicio
  serviceDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Mes y año para agrupar pagos mensuales (formato: "YYYY-MM")
  paymentMonth: {
    type: String,
    required: true,
    index: true
  },
  
  // Estado del pago al veterinario
  paymentStatus: {
    type: String,
    enum: ['pending', 'scheduled', 'paid', 'failed'],
    default: 'pending',
    index: true
  },
  
  // Fecha de pago programada (día 5 del mes siguiente)
  scheduledPaymentDate: {
    type: Date,
    index: true
  },
  
  // Información del pago (cuando se procesa)
  paymentInfo: {
    paymentDate: Date,
    transactionId: String,
    bankAccount: {
      accountNumber: String,
      accountType: String, // 'checking', 'savings'
      bankName: String
    },
    notes: String
  },
  
  // Metadatos adicionales
  metadata: {
    petName: String,
    tutorName: String,
    appointmentType: String, // Para referencia rápida
    isEmergency: Boolean
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas eficientes
vetEarningsSchema.index({ vetId: 1, paymentMonth: 1 });
vetEarningsSchema.index({ vetId: 1, paymentStatus: 1 });
vetEarningsSchema.index({ vetId: 1, serviceDate: -1 });
vetEarningsSchema.index({ paymentStatus: 1, scheduledPaymentDate: 1 });

// Método estático para calcular el mes de pago (formato YYYY-MM)
vetEarningsSchema.statics.getPaymentMonth = function(serviceDate) {
  const date = new Date(serviceDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() retorna 0-11
  return `${year}-${String(month).padStart(2, '0')}`;
};

// Método estático para calcular la fecha de pago programada (día 5 del mes siguiente)
vetEarningsSchema.statics.getScheduledPaymentDate = function(serviceDate) {
  const date = new Date(serviceDate);
  // Avanzar al mes siguiente
  date.setMonth(date.getMonth() + 1);
  // Establecer el día 5
  date.setDate(5);
  // Establecer hora a las 00:00:00
  date.setHours(0, 0, 0, 0);
  return date;
};

const VetEarnings = mongoose.model('VetEarnings', vetEarningsSchema, 'vet_earnings');
export default VetEarnings;

