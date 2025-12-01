import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PricingConfig from '../models/PricingConfig.js';
import Admin from '../models/Admin.js';

dotenv.config();

// Forzar conexión a base de datos "test"
const baseURL = process.env.mongoDBURL.split('/').slice(0, 3).join('/');
const testURL = `${baseURL}/test`;

async function updatePricing() {
  try {
    // Conectar a MongoDB "test"
    await mongoose.connect(testURL);
    console.log('Conectado a MongoDB Atlas (base de datos: test)');

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
            normalHours: 34000,
            peakHours: 40000
          }
        },
        // Precios para clínicas (a domicilio y presencial en clínica)
        clinic: {
          home: {
            normalHours: 50000,
            peakHours: 60000
          },
          clinic: {
            normalHours: 31000,
            peakHours: 38000
          }
        },
        // Rango de horas punta (20:00 a 08:00)
        peakHoursRange: {
          start: 20,
          end: 8
        },
        // Recargo por distancia (por km) - se mantiene el valor por defecto
        distanceSurchargePerKm: 4500
      },
      // Configuración de precios para citas tradicionales
      appointments: {
        // Precios para veterinarios independientes
        independent: {
          clinicVisit: 0, // No aplica para independientes
          homeVisit: 27000,
          teleconsultation: 15000
        },
        // Precios para clínicas
        clinic: {
          clinicVisit: 25000,
          homeVisit: 40000,
          teleconsultation: 17000
        }
      },
      updatedBy: admin._id
    };

    if (pricingConfig) {
      // Actualizar configuración existente
      Object.assign(pricingConfig, newPricing);
      await pricingConfig.save();
      console.log('Configuración de precios actualizada en base de datos "test"');
    } else {
      // Crear nueva configuración
      pricingConfig = await PricingConfig.create(newPricing);
      console.log('Configuración de precios creada en base de datos "test"');
    }

    console.log('\n--- Nuevos Precios (Base de datos: test) ---');
    console.log('Urgencias (Independientes - Domicilio):');
    console.log(`  Normal: $${pricingConfig.emergency.independent.home.normalHours}`);
    console.log(`  Punta:  $${pricingConfig.emergency.independent.home.peakHours}`);
    console.log('Urgencias (Clínicas - Presencial):');
    console.log(`  Normal: $${pricingConfig.emergency.clinic.clinic.normalHours}`);
    console.log(`  Punta:  $${pricingConfig.emergency.clinic.clinic.peakHours}`);
    console.log('Urgencias (Clínicas - Domicilio):');
    console.log(`  Normal: $${pricingConfig.emergency.clinic.home.normalHours}`);
    console.log(`  Punta:  $${pricingConfig.emergency.clinic.home.peakHours}`);
    console.log('Citas (Independientes - Domicilio):');
    console.log(`  Domicilio: $${pricingConfig.appointments.independent.homeVisit}`);
    console.log(`  Teleconsulta: $${pricingConfig.appointments.independent.teleconsultation}`);
    console.log('Citas (Clínicas - Presencial):');
    console.log(`  Clínica: $${pricingConfig.appointments.clinic.clinicVisit}`);
    console.log(`  Domicilio: $${pricingConfig.appointments.clinic.homeVisit}`);
    console.log(`  Teleconsulta: $${pricingConfig.appointments.clinic.teleconsultation}`);
    console.log('----------------------');

  } catch (error) {
    console.error('Error al actualizar la configuración de precios:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB Atlas');
  }
}

updatePricing();

