import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Vet from './models/Veterinarian.js';

const mongoDBURL = process.env.mongoDBURL;

async function migrate() {
  await mongoose.connect(mongoDBURL);
  console.log('✅ Conectado a MongoDB');

  const vets = await Vet.find({});
  console.log(`Found ${vets.length} vets`);

  // Rename fields
  await Vet.updateMany({}, { $rename: { "state": "region", "district": "comuna" } });

  // Verify
  const updatedVets = await Vet.find({}, { state: 1, district: 1, region: 1, comuna: 1 });
  console.log('Sample vets after migration:', updatedVets.slice(0, 3));

  console.log('✅ Migración completada');
  await mongoose.disconnect();
  console.log('🔌 Desconectado de MongoDB');
}

migrate().catch(console.error);
