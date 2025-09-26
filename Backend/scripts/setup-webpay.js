#!/usr/bin/env node

/**
 * Script de configuración automática para Webpay
 * Este script ayuda a configurar ngrok y actualizar las variables de entorno
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Configuración automática de Webpay para desarrollo local\n');

// Verificar si ngrok está instalado
try {
  execSync('ngrok --version', { stdio: 'pipe' });
  console.log('✅ ngrok está instalado');
} catch (error) {
  console.log('❌ ngrok no está instalado. Instalándolo...');
  try {
    execSync('npm install -g ngrok', { stdio: 'inherit' });
    console.log('✅ ngrok instalado correctamente');
  } catch (installError) {
    console.error('❌ Error instalando ngrok:', installError.message);
    console.log('📝 Instala ngrok manualmente: npm install -g ngrok');
    process.exit(1);
  }
}

// Verificar si el archivo .env existe
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ Archivo .env no encontrado');
  console.log('📝 Copia .env.example a .env y configura tus variables');
  process.exit(1);
}

// Leer el archivo .env
let envContent = fs.readFileSync(envPath, 'utf8');

// Función para actualizar o agregar variable de entorno
function updateEnvVariable(key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    // Actualizar variable existente
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    // Agregar nueva variable
    envContent += `\n${key}=${value}`;
  }
}

console.log('🌐 Iniciando ngrok...');

// Iniciar ngrok y obtener la URL
try {
  const ngrokOutput = execSync('npx ngrok http 5555 --log=stdout', {
    encoding: 'utf8',
    timeout: 10000,
    stdio: 'pipe'
  });

  // Extraer la URL de ngrok de la salida
  const urlMatch = ngrokOutput.match(/https:\/\/[a-zA-Z0-9\-]+\.ngrok\.io/);
  if (urlMatch) {
    const ngrokUrl = urlMatch[0];
    console.log(`✅ ngrok iniciado: ${ngrokUrl}`);

    // Actualizar BASE_URL en el archivo .env
    updateEnvVariable('BASE_URL', ngrokUrl);

    // Escribir el archivo .env actualizado
    fs.writeFileSync(envPath, envContent);

    console.log('✅ Archivo .env actualizado con la URL de ngrok');
    console.log(`📝 BASE_URL=${ngrokUrl}`);

    console.log('\n🎯 Próximos pasos:');
    console.log('1. Mantén ngrok ejecutándose (no cierres esta terminal)');
    console.log('2. En otra terminal, ejecuta: npm run dev');
    console.log('3. Tu aplicación estará disponible en:', ngrokUrl);
    console.log('\n💳 Para probar Webpay:');
    console.log('- Ve a tu frontend');
    console.log('- Selecciona una cita');
    console.log('- Haz click en "Continuar al pago"');
    console.log('- Usa tarjeta de prueba: 4051885600446623 (Visa)');
    console.log('- Código de seguridad: 123');
    console.log('- Fecha: Cualquier fecha futura');

  } else {
    console.error('❌ No se pudo obtener la URL de ngrok');
    console.log('📝 Ejecuta manualmente: npx ngrok http 5555');
    console.log('📝 Luego actualiza BASE_URL en tu archivo .env');
  }

} catch (error) {
  console.error('❌ Error iniciando ngrok:', error.message);
  console.log('\n📝 Solución alternativa:');
  console.log('1. Ejecuta: npx ngrok http 5555');
  console.log('2. Copia la URL HTTPS que te da ngrok');
  console.log('3. Actualiza BASE_URL en tu archivo .env');
  console.log('4. Reinicia el servidor: npm run dev');
}

console.log('\n📚 Recursos útiles:');
console.log('- Documentación Webpay: https://www.transbankdevelopers.cl/producto/webpay');
console.log('- Tarjetas de prueba: https://www.transbankdevelopers.cl/documentacion/como_empezar#tarjetas-de-prueba');
console.log('- Consola de desarrolladores: https://www.transbankdevelopers.cl/console');
