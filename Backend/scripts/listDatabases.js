import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoDBURL = process.env.mongoDBURL;

async function listDatabases() {
  try {
    // Conectar sin especificar base de datos para listar todas
    const baseURL = mongoDBURL.split('/').slice(0, 3).join('/');
    const adminURL = `${baseURL}/admin`;
    
    console.log('Conectando a MongoDB Atlas...');
    await mongoose.connect(adminURL);
    
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('\n📊 Bases de datos encontradas:');
    databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Verificar qué base de datos está usando la connection string actual
    const currentDB = mongoDBURL.match(/\/([^?]+)/)?.[1];
    console.log(`\n🔗 Base de datos en connection string: ${currentDB || 'No especificada'}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listDatabases();

