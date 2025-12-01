// Script para ejecutar seed.js en la base de datos "VetGoNow"
import dotenv from 'dotenv';

dotenv.config();

// Modificar la connection string para usar "VetGoNow"
const originalURL = process.env.mongoDBURL;
const baseURL = originalURL.split('/').slice(0, 3).join('/');
const vetGoNowURL = `${baseURL}/VetGoNow`;

// Sobrescribir la variable de entorno
process.env.mongoDBURL = vetGoNowURL;

console.log('🌱 Ejecutando seed en base de datos "VetGoNow"...');
console.log(`📊 Connection string: ${vetGoNowURL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

// Importar y ejecutar el seed original
import('../seed.js');
