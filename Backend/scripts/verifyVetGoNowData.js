import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function verifyData() {
  try {
    const baseURL = process.env.mongoDBURL.split('/').slice(0, 3).join('/');
    const vetGoNowURL = `${baseURL}/VetGoNow`;
    
    await mongoose.connect(vetGoNowURL);
    console.log('✅ Conectado a base de datos "VetGoNow"\n');
    
    const Admin = (await import('../models/Admin.js')).default;
    const User = (await import('../models/User.js')).default;
    const Vet = (await import('../models/Veterinarian.js')).default;
    const Pet = (await import('../models/Pet.js')).default;
    const Vaccine = (await import('../models/Vaccine.js')).default;
    const Deworming = (await import('../models/Deworming.js')).default;
    const MedicalRecord = (await import('../models/MedicalRecord.js')).default;
    const PricingConfig = (await import('../models/PricingConfig.js')).default;
    
    // Verificar Admin
    const admins = await Admin.find();
    console.log('👤 ADMINS:');
    admins.forEach(a => console.log(`   - ${a.email} (${a.name})`));
    
    // Verificar Usuarios
    const users = await User.find();
    console.log(`\n👥 USUARIOS (${users.length}):`);
    users.forEach(u => console.log(`   - ${u.email} (${u.name})`));
    
    // Verificar Veterinarios
    const vets = await Vet.find();
    console.log(`\n🐾 VETERINARIOS (${vets.length}):`);
    vets.forEach(v => {
      console.log(`   - ${v.name} (${v.email})`);
      console.log(`     Tipo: ${v.vetType || 'N/A'}, Verificado: ${v.verificationStatus || 'N/A'}`);
    });
    
    // Verificar Mascotas
    const pets = await Pet.find();
    const usersMap = {};
    users.forEach(u => usersMap[u._id.toString()] = u);
    console.log(`\n🐕 MASCOTAS (${pets.length}):`);
    pets.forEach(p => {
      const owner = usersMap[p.owner?.toString()];
      console.log(`   - ${p.name} (${p.species}, ${p.breed}) - Dueño: ${owner?.name || 'N/A'}`);
    });
    
    // Verificar Vacunas
    const vaccines = await Vaccine.find();
    const petsMap = {};
    pets.forEach(p => petsMap[p._id.toString()] = p);
    console.log(`\n💉 VACUNAS (${vaccines.length}):`);
    const vaccinesByPet = {};
    vaccines.forEach(v => {
      const pet = petsMap[v.pet?.toString()];
      const petName = pet?.name || 'N/A';
      if (!vaccinesByPet[petName]) vaccinesByPet[petName] = [];
      vaccinesByPet[petName].push(v.vaccineType);
    });
    Object.keys(vaccinesByPet).forEach(petName => {
      console.log(`   - ${petName}: ${vaccinesByPet[petName].join(', ')}`);
    });
    
    // Verificar Desparasitaciones
    const dewormings = await Deworming.find();
    console.log(`\n🐛 DESPARASITACIONES (${dewormings.length}):`);
    dewormings.forEach(d => {
      const pet = petsMap[d.pet?.toString()];
      console.log(`   - ${pet?.name || 'N/A'}: ${d.product} (${new Date(d.date).toLocaleDateString()})`);
    });
    
    // Verificar Registros Médicos
    const records = await MedicalRecord.find();
    console.log(`\n📋 REGISTROS MÉDICOS (${records.length}):`);
    records.forEach(r => {
      const pet = petsMap[r.pet?.toString()];
      console.log(`   - ${pet?.name || 'N/A'}: ${r.diagnosis} (${new Date(r.date).toLocaleDateString()})`);
    });
    
    // Verificar Precios
    const pricing = await PricingConfig.findOne();
    console.log(`\n💰 PRECIOS:`);
    if (pricing) {
      console.log(`   Urgencias Independientes: $${pricing.emergency.independent.home.normalHours} / $${pricing.emergency.independent.home.peakHours}`);
      console.log(`   Urgencias Clínicas (presencial): $${pricing.emergency.clinic.clinic.normalHours} / $${pricing.emergency.clinic.clinic.peakHours}`);
      console.log(`   Urgencias Clínicas (domicilio): $${pricing.emergency.clinic.home.normalHours} / $${pricing.emergency.clinic.home.peakHours}`);
      console.log(`   Citas Independientes: $${pricing.appointments.independent.homeVisit} (domicilio), $${pricing.appointments.independent.teleconsultation} (teleconsulta)`);
      console.log(`   Citas Clínicas: $${pricing.appointments.clinic.clinicVisit} (clínica), $${pricing.appointments.clinic.homeVisit} (domicilio), $${pricing.appointments.clinic.teleconsultation} (teleconsulta)`);
    }
    
    console.log('\n✅ Verificación completada');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyData();

