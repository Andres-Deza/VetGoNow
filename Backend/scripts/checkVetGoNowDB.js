import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkVetGoNowDB() {
  try {
    // Conectar a la base de datos "VetGoNow"
    const baseURL = process.env.mongoDBURL.split('/').slice(0, 3).join('/');
    const vetGoNowURL = `${baseURL}/VetGoNow`;
    
    console.log('Conectando a base de datos "VetGoNow"...');
    await mongoose.connect(vetGoNowURL);
    
    const db = mongoose.connection.db;
    console.log(`✅ Conectado a: ${db.databaseName}`);
    
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Colecciones en "VetGoNow": ${collections.length}`);
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    // Verificar PricingConfig
    const PricingConfig = (await import('../models/PricingConfig.js')).default;
    const pricing = await PricingConfig.findOne();
    if (pricing) {
      console.log('\n💰 Precios en "VetGoNow":');
      console.log('   Urgencias Independientes:', pricing.emergency?.independent?.home);
      console.log('   Urgencias Clínicas:', pricing.emergency?.clinic);
    } else {
      console.log('\n⚠️  No hay configuración de precios en "VetGoNow"');
    }
    
    // Contar documentos
    const Admin = (await import('../models/Admin.js')).default;
    const User = (await import('../models/User.js')).default;
    const Vet = (await import('../models/Veterinarian.js')).default;
    const Pet = (await import('../models/Pet.js')).default;
    const Appointment = (await import('../models/Appointment.js')).default;
    
    const adminCount = await Admin.countDocuments();
    const userCount = await User.countDocuments();
    const vetCount = await Vet.countDocuments();
    const petCount = await Pet.countDocuments();
    const appointmentCount = await Appointment.countDocuments();
    
    console.log(`\n📊 Documentos en "VetGoNow":`);
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Usuarios: ${userCount}`);
    console.log(`   Veterinarios: ${vetCount}`);
    console.log(`   Mascotas: ${petCount}`);
    console.log(`   Citas: ${appointmentCount}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkVetGoNowDB();

