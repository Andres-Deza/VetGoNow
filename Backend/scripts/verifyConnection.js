import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoDBURL = process.env.mongoDBURL;

async function verifyConnection() {
  try {
    console.log('Conectando a:', mongoDBURL?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoDBURL);
    console.log('✅ Conectado a MongoDB');
    
    const dbName = mongoose.connection.db.databaseName;
    console.log('📊 Base de datos:', dbName);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Colecciones encontradas:', collections.map(c => c.name).join(', '));
    
    // Verificar PricingConfig
    const PricingConfig = (await import('../models/PricingConfig.js')).default;
    const pricing = await PricingConfig.findOne();
    if (pricing) {
      console.log('💰 Precios actuales:');
      console.log('   Urgencias Independientes:', pricing.emergency?.independent?.home);
      console.log('   Urgencias Clínicas:', pricing.emergency?.clinic);
      console.log('   Citas Independientes:', pricing.appointments?.independent);
      console.log('   Citas Clínicas:', pricing.appointments?.clinic);
    } else {
      console.log('⚠️  No se encontró configuración de precios');
    }
    
    // Verificar Admin
    const Admin = (await import('../models/Admin.js')).default;
    const adminCount = await Admin.countDocuments();
    console.log('👤 Admins encontrados:', adminCount);
    
    // Verificar Users
    const User = (await import('../models/User.js')).default;
    const userCount = await User.countDocuments();
    console.log('👥 Usuarios encontrados:', userCount);
    
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyConnection();

