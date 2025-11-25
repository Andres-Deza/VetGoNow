import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('=== Verificación de Configuración de Mercado Pago ===\n');

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

console.log('1. Variables de entorno:');
console.log('   MERCADOPAGO_ACCESS_TOKEN:', accessToken ? `✓ Configurado (${accessToken.substring(0, 15)}...)` : '✗ NO CONFIGURADO');
console.log('   MERCADOPAGO_PUBLIC_KEY:', publicKey ? `✓ Configurado (${publicKey.substring(0, 15)}...)` : '✗ NO CONFIGURADO');

if (!accessToken) {
  console.log('\n⚠️  ERROR: MERCADOPAGO_ACCESS_TOKEN no está configurado');
  console.log('   Agrega la siguiente línea a tu archivo Backend/.env:');
  console.log('   MERCADOPAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI');
}

if (!publicKey) {
  console.log('\n⚠️  ERROR: MERCADOPAGO_PUBLIC_KEY no está configurado');
  console.log('   Agrega la siguiente línea a tu archivo Backend/.env:');
  console.log('   MERCADOPAGO_PUBLIC_KEY=TU_PUBLIC_KEY_AQUI');
}

if (accessToken && publicKey) {
  console.log('\n✅ Configuración completa');
  console.log('\n2. Próximos pasos:');
  console.log('   1. Reinicia el servidor backend (Ctrl+C y luego npm run dev)');
  console.log('   2. Verifica que el servidor esté corriendo en http://localhost:5555');
  console.log('   3. Prueba el endpoint: http://localhost:5555/api/payment/mercadopago/public-key');
  console.log('   4. Debería retornar: {"success": true, "publicKey": "TU_PUBLIC_KEY"}');
}

console.log('\n3. Archivo .env:');
const envPath = join(__dirname, '..', '.env');
try {
  const fs = await import('fs');
  if (fs.existsSync(envPath)) {
    console.log(`   ✓ Archivo encontrado en: ${envPath}`);
  } else {
    console.log(`   ✗ Archivo NO encontrado en: ${envPath}`);
    console.log('   Crea el archivo .env en la carpeta Backend/');
  }
} catch (error) {
  console.log('   ⚠️  No se pudo verificar el archivo .env');
}

console.log('\n=== Fin de la verificación ===');

