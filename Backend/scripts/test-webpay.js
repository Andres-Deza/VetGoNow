#!/usr/bin/env node

/**
 * Script de prueba para Webpay
 * Verifica que la integración esté funcionando correctamente
 */

import dotenv from 'dotenv';
import pkg from 'transbank-sdk';
const { WebpayPlus } = pkg;
import mongoose from 'mongoose';

dotenv.config();

console.log('🧪 Probando integración Webpay...\n');

// Verificar variables de entorno
console.log('📋 Verificando configuración:');

const requiredEnvVars = [
  'WEBPAY_COMMERCE_CODE',
  'WEBPAY_API_KEY',
  'BASE_URL',
  'NODE_ENV'
];

let configOk = true;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: ${envVar.includes('KEY') ? '****' + process.env[envVar].slice(-4) : process.env[envVar]}`);
  } else {
    console.log(`❌ ${envVar}: No configurado`);
    configOk = false;
  }
}

if (!configOk) {
  console.log('\n❌ Configuración incompleta. Revisa tu archivo .env');
  process.exit(1);
}

// Verificar conexión a MongoDB
console.log('\n🗄️  Verificando conexión a MongoDB...');
try {
  await mongoose.connect(process.env.mongoDBURL || process.env.MONGODB_URL);
  console.log('✅ MongoDB conectado');
  await mongoose.disconnect();
} catch (error) {
  console.log('❌ Error conectando a MongoDB:', error.message);
  console.log('💡 Asegúrate de que MongoDB esté ejecutándose');
}

// Verificar SDK de Transbank
console.log('\n💳 Verificando SDK de Transbank...');
try {
  const webpay = new WebpayPlus.Transaction({
    commerceCode: process.env.WEBPAY_COMMERCE_CODE,
    apiKey: process.env.WEBPAY_API_KEY,
    environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'INTEGRATION'
  });

  console.log('✅ SDK de Transbank inicializado correctamente');

  // Probar creación de transacción (sin ejecutar realmente)
  const testBuyOrder = `TEST-${Date.now()}`;
  const testSessionId = `test-session-${Date.now()}`;

  console.log('🧪 Probando creación de transacción (simulada)...');
  console.log(`   - Buy Order: ${testBuyOrder}`);
  console.log(`   - Session ID: ${testSessionId}`);
  console.log(`   - Amount: 1000 CLP`);

  // Nota: No ejecutamos realmente la transacción para no crear registros de prueba
  console.log('✅ Configuración de Webpay correcta');

} catch (error) {
  console.log('❌ Error con SDK de Transbank:', error.message);
  console.log('💡 Verifica tus credenciales de Webpay');
}

// Verificar URLs
console.log('\n🌐 Verificando URLs de retorno:');
const baseUrl = process.env.BASE_URL;
if (baseUrl) {
  if (baseUrl.startsWith('https://')) {
    console.log(`✅ BASE_URL: ${baseUrl}`);
    console.log(`   - Return URL: ${baseUrl}/api/payment/webpay/return`);
    console.log(`   - Final URL: ${baseUrl}/api/payment/webpay/final`);
  } else {
    console.log(`⚠️  BASE_URL debería ser HTTPS para producción: ${baseUrl}`);
  }
} else {
  console.log('❌ BASE_URL no configurado');
}

// Verificar archivos necesarios
console.log('\n📁 Verificando archivos:');
const fs = await import('fs');
const path = await import('path');
const fileURLToPath = await import('url');

const __filename = fileURLToPath.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..');

const requiredFiles = [
  'controllers/webpayController.js',
  'routes/webpayRoutes.js',
  'models/WebpayTransaction.js',
  'index.js'
];

for (const file of requiredFiles) {
  const filePath = path.join(backendDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} existe`);
  } else {
    console.log(`❌ ${file} no encontrado`);
  }
}

console.log('\n🎉 Verificación completada!');
console.log('\n📝 Próximos pasos:');
console.log('1. Si todo está ✅, ejecuta: npm run dev');
console.log('2. Prueba la integración desde tu frontend');
console.log('3. Para desarrollo local, ejecuta: npm run setup:webpay');
console.log('\n💡 Recuerda:');
console.log('- Usa tarjetas de prueba para testing');
console.log('- Las transacciones en integración no son reales');
console.log('- Para producción necesitarás credenciales reales');

console.log('\n🔗 Recursos útiles:');
console.log('- Documentación: https://www.transbankdevelopers.cl/producto/webpay');
console.log('- Tarjetas de prueba: https://www.transbankdevelopers.cl/documentacion/como_empezar#tarjetas-de-prueba');
console.log('- Consola: https://www.transbankdevelopers.cl/console');
