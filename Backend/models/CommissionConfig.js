import mongoose from 'mongoose';

const commissionConfigSchema = new mongoose.Schema({
  // Tipo de servicio
  serviceType: {
    type: String,
    enum: [
      'emergency_home',      // Urgencia a domicilio
      'emergency_clinic',    // Urgencia presencial/clínica
      'appointment_clinic',  // Cita tradicional en clínica
      'appointment_home',    // Cita tradicional a domicilio
      'teleconsultation'     // Teleconsulta
    ],
    required: true,
    unique: true
  },
  
  // Valor de la comisión (lo que se le descuenta al veterinario, ganancia de la app)
  commissionAmount: {
    type: Number,
    required: true,
    default: 4750,
    min: 0
  },
  
  // Descripción del tipo de servicio
  description: {
    type: String,
    default: ''
  },
  
  // Si está activo
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Historial de cambios (opcional, para auditoría)
  changeHistory: [{
    oldAmount: Number,
    newAmount: Number,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Crear valores por defecto si no existen
commissionConfigSchema.statics.initializeDefaults = async function() {
  const defaults = [
    { serviceType: 'emergency_home', commissionAmount: 4750, description: 'Urgencia a domicilio' },
    { serviceType: 'emergency_clinic', commissionAmount: 4750, description: 'Urgencia presencial' },
    { serviceType: 'appointment_clinic', commissionAmount: 4750, description: 'Cita tradicional en clínica' },
    { serviceType: 'appointment_home', commissionAmount: 4750, description: 'Cita tradicional a domicilio' },
    { serviceType: 'teleconsultation', commissionAmount: 4750, description: 'Teleconsulta' }
  ];
  
  for (const defaultConfig of defaults) {
    await this.findOneAndUpdate(
      { serviceType: defaultConfig.serviceType },
      { $setOnInsert: defaultConfig },
      { upsert: true, new: true }
    );
  }
};

const CommissionConfig = mongoose.model('CommissionConfig', commissionConfigSchema, 'commission_configs');
export default CommissionConfig;

