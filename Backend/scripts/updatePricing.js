import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PricingConfig from '../models/PricingConfig.js';
import Admin from '../models/Admin.js';

dotenv.config();

const mongoDBURL = process.env.mongoDBURL;

async function updatePricing() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(mongoDBURL);
    console.log('Conectado a MongoDB Atlas');

    // Buscar un admin para usar como updatedBy
    const admin = await Admin.findOne();
    if (!admin) {
      console.error('Error: No se encontró ningún administrador. Ejecuta el seed primero.');
      process.exit(1);
    }

    // Buscar configuración de precios existente
    let pricingConfig = await PricingConfig.findOne();

    const newPricing = {
      emergency: {
        // Veterinarios independientes: solo a domicilio
        independent: {
          home: {
            normalHours: 34000,  // Urgencia a domicilio - Horario normal
            peakHours: 40000     // Urgencia a domicilio - Hora punta
          }
        },
        // Clínicas veterinarias: presencial y a domicilio
        clinic: {
          clinic: {
            normalHours: 31000,  // Urgencia presencial en clínica - Horario normal
            peakHours: 38000     // Urgencia presencial en clínica - Hora punta
          },
          home: {
            normalHours: 50000,  // Urgencia a domicilio - Horario normal
            peakHours: 60000     // Urgencia a domicilio - Hora punta
          }
        },
        peakHoursRange: {
          start: 20,  // 20:00 (8 PM)
          end: 8      // 08:00 (8 AM)
        },
        distanceSurchargePerKm: 0  // Ya no se usa recargo por distancia, está incluido en precio base
      },
      appointments: {
        // Veterinarios independientes
        independent: {
          clinicVisit: 0,           // No aplica para independientes
          homeVisit: 27000,         // Consulta a domicilio
          teleconsultation: 15000   // Teleconsulta
        },
        // Clínicas veterinarias
        clinic: {
          clinicVisit: 25000,       // Consulta en clínica
          homeVisit: 40000,         // Consulta a domicilio
          teleconsultation: 17000  // Teleconsulta
        }
      },
      updatedBy: admin._id
    };

    if (pricingConfig) {
      // Actualizar configuración existente
      pricingConfig.emergency = newPricing.emergency;
      pricingConfig.appointments = newPricing.appointments;
      pricingConfig.updatedBy = admin._id;
      pricingConfig.updatedAt = new Date();
      
      await pricingConfig.save();
      console.log('✅ Configuración de precios actualizada exitosamente');
      console.log('📊 Nuevos precios:');
      console.log('   Urgencias Independientes (domicilio): Normal $34.000, Punta $40.000');
      console.log('   Urgencias Clínicas (presencial): Normal $31.000, Punta $38.000');
      console.log('   Urgencias Clínicas (domicilio): Normal $50.000, Punta $60.000');
      console.log('   Citas Independientes (domicilio): $27.000');
      console.log('   Citas Independientes (teleconsulta): $15.000');
      console.log('   Citas Clínicas (en clínica): $25.000');
      console.log('   Citas Clínicas (domicilio): $40.000');
      console.log('   Citas Clínicas (teleconsulta): $17.000');
    } else {
      // Crear nueva configuración si no existe
      pricingConfig = await PricingConfig.create(newPricing);
      console.log('✅ Nueva configuración de precios creada exitosamente');
    }

    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error al actualizar precios:', error);
    process.exit(1);
  }
}

updatePricing();

