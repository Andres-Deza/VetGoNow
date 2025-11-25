import mongoose from 'mongoose';

const PricingConfigSchema = new mongoose.Schema({
  // Configuración de precios para urgencias
  emergency: {
    // Precios para veterinarios independientes (solo a domicilio)
    independent: {
      home: {
        normalHours: { type: Number, default: 19990, required: true },
        peakHours: { type: Number, default: 24990, required: true }
      }
    },
    // Precios para clínicas (a domicilio y presencial en clínica)
    clinic: {
      home: {
        normalHours: { type: Number, default: 24990, required: true },
        peakHours: { type: Number, default: 29990, required: true }
      },
      clinic: {
        normalHours: { type: Number, default: 24990, required: true },
        peakHours: { type: Number, default: 29990, required: true }
      }
    },
    // Rango de horas punta (0-23)
    peakHoursRange: {
      start: { type: Number, default: 20, min: 0, max: 23 }, // Hora inicio
      end: { type: Number, default: 8, min: 0, max: 23 }    // Hora fin
    },
    // Recargo por distancia (por km) - solo para urgencias a domicilio
    distanceSurchargePerKm: { type: Number, default: 4500, required: true }
  },
  
  // Configuración de precios para citas tradicionales
  appointments: {
    // Precios para veterinarios independientes
    independent: {
      clinicVisit: { type: Number, default: 20000, required: true },
      homeVisit: { type: Number, default: 35000, required: true },
      teleconsultation: { type: Number, default: 0, required: true } // Gratis por defecto
    },
    // Precios para clínicas (valores mayores)
    clinic: {
      clinicVisit: { type: Number, default: 25000, required: true },
      homeVisit: { type: Number, default: 40000, required: true },
      teleconsultation: { type: Number, default: 0, required: true } // Gratis por defecto
    }
  },
  
  // Metadata
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
  timestamps: true
});

const PricingConfig = mongoose.model('PricingConfig', PricingConfigSchema);

export default PricingConfig;
