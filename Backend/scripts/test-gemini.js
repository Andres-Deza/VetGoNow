import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

console.log('🔍 Verificando configuración de Gemini API...\n');

if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY no está configurada en las variables de entorno.');
  console.log('\n📝 Pasos para configurar:');
  console.log('1. Ve a https://makersuite.google.com/app/apikey');
  console.log('2. Crea una nueva API key');
  console.log('3. Agrega GEMINI_API_KEY=tu_api_key_aqui al archivo .env del backend');
  console.log('4. Reinicia el servidor backend\n');
  process.exit(1);
}

console.log('✅ GEMINI_API_KEY encontrada');
console.log('   API Key (últimos 4 caracteres):', GEMINI_API_KEY.slice(-4));

try {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  console.log('\n📋 Probando modelos disponibles...\n');
  
  // Probar modelos según documentación oficial: https://ai.google.dev/gemini-api/docs?hl=es-419
  // Nota: Si un modelo da error 429 (cuota), significa que funciona pero se excedió el límite
  const modelsToTest = [
    'gemini-2.5-flash',          // Modelo más equilibrado recomendado (oficial)
    'gemini-2.5-pro',            // Modelo más potente (oficial)
    'gemini-2.5-flash-lite',     // Modelo más rápido y rentable (oficial)
    'gemini-2.0-flash-exp',      // Modelo experimental
    'gemini-1.5-flash-002',      // Versión específica de flash
    'gemini-1.5-pro-002',        // Versión específica de pro
    'gemini-pro',                // Modelo estándar (legacy)
  ];
  let workingModel = null;
  let quotaLimitedModel = null;  // Modelo que funciona pero tiene cuota limitada
  
  for (const modelName of modelsToTest) {
    console.log(`🧪 Probando modelo: ${modelName}`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Responde solo "OK"');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ ${modelName} funciona correctamente`);
      console.log(`   Respuesta: ${text.substring(0, 50)}\n`);
      
      if (!workingModel) {
        workingModel = modelName;
        break; // Si encontramos uno que funciona, detenemos la búsqueda
      }
    } catch (error) {
      // Mostrar el error completo para depuración
      const errorMessage = error.message || error.toString();
      const errorDetails = error.response?.data || error.cause || '';
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        console.log(`❌ ${modelName} - Modelo no encontrado (404)`);
        if (errorMessage.includes('not found for API version')) {
          console.log(`   💡 Problema con la versión de la API o nombre del modelo`);
          console.log(`   Error: ${errorMessage.substring(0, 200)}`);
        } else {
          console.log(`   Error: ${errorMessage.substring(0, 200)}`);
        }
        if (errorDetails) {
          console.log(`   Detalles: ${JSON.stringify(errorDetails).substring(0, 150)}`);
        }
      } else if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
        console.log(`❌ ${modelName} - Error de autenticación`);
        console.log(`   Error: ${errorMessage.substring(0, 200)}`);
        console.log(`   💡 Verifica que tu API key sea válida`);
      } else if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('429') || errorMessage.includes('resource exhausted')) {
        console.log(`⚠️  ${modelName} - Límite de cuota alcanzado (429)`);
        console.log(`   ✅ ESTE MODELO FUNCIONA, pero se excedió el límite temporal`);
        console.log(`   💡 Espera unos minutos y vuelve a intentar`);
        console.log(`   💡 O verifica tu cuota en: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas`);
        if (!quotaLimitedModel) {
          quotaLimitedModel = modelName;  // Guardamos este modelo como candidato
        }
      } else if (errorMessage.includes('API') && (errorMessage.includes('not enabled') || errorMessage.includes('disabled'))) {
        console.log(`❌ ${modelName} - API no habilitada`);
        console.log(`   Error: ${errorMessage.substring(0, 200)}`);
        console.log(`   💡 Habilitar "Generative Language API" en Google Cloud Console`);
      } else if (errorMessage.includes('billing') || errorMessage.includes('payment')) {
        console.log(`❌ ${modelName} - Problema de facturación`);
        console.log(`   Error: ${errorMessage.substring(0, 200)}`);
        console.log(`   💡 Verifica que tengas facturación configurada (incluso en modo gratuito)`);
      } else {
        console.log(`❌ ${modelName} - Error desconocido`);
        console.log(`   Tipo: ${error.constructor.name}`);
        console.log(`   Mensaje: ${errorMessage.substring(0, 250)}`);
        if (error.stack) {
          const stackLines = error.stack.split('\n').slice(0, 3);
          console.log(`   Stack: ${stackLines.join(' | ')}`);
        }
        if (errorDetails) {
          console.log(`   Detalles adicionales: ${JSON.stringify(errorDetails).substring(0, 200)}`);
        }
      }
      console.log('');
    }
  }
  
  if (workingModel) {
    console.log(`\n✅ Modelo funcionando: ${workingModel}`);
    console.log(`\n💡 Actualiza Backend/services/geminiService.js con:`);
    console.log(`   const MODEL_NAME = '${workingModel}';`);
    console.log(`\n⚠️  IMPORTANTE: Reinicia el servidor backend después de hacer el cambio.\n`);
  } else if (quotaLimitedModel) {
    console.log(`\n⚠️  Modelo disponible pero con cuota limitada: ${quotaLimitedModel}`);
    console.log(`\n✅ Esto significa que la API está configurada correctamente`);
    console.log(`\n📋 Opciones:`);
    console.log(`   1. Espera 5-10 minutos y vuelve a ejecutar este script`);
    console.log(`   2. Verifica tu cuota en Google Cloud Console`);
    console.log(`   3. Usa este modelo de todas formas (la cuota se reinicia):`);
    console.log(`\n💡 Actualiza Backend/services/geminiService.js con:`);
    console.log(`   const MODEL_NAME = '${quotaLimitedModel}';`);
    console.log(`\n⚠️  IMPORTANTE: Reinicia el servidor backend después de hacer el cambio.\n`);
  } else {
    console.log('\n❌ Ningún modelo funcionó correctamente');
    console.log('\n🔍 Análisis del problema:');
    console.log('   - La API está habilitada en Google Cloud ✅');
    console.log('   - Pero todos los modelos están dando error ❌');
    console.log('\n📋 Posibles causas:');
    console.log('   1. La API key no tiene permisos para usar los modelos');
    console.log('   2. El proyecto necesita facturación habilitada (incluso para uso gratuito)');
    console.log('   3. Los nombres de los modelos han cambiado');
    console.log('   4. Hay restricciones regionales en tu proyecto');
    console.log('\n❌ Ningún modelo está disponible con tu API key');
    console.log('\n🔧 Pasos para solucionarlo:');
    console.log('\n1️⃣  Habilitar la API en Google Cloud:');
    console.log('   a) Ve a: https://console.cloud.google.com/apis/library');
    console.log('   b) Busca "Generative Language API"');
    console.log('   c) Haz clic en "Enable" o "Habilitar"');
    console.log('   d) Asegúrate de seleccionar el proyecto "VetGoNow"');
    console.log('\n2️⃣  Verificar que la API key esté asociada al proyecto correcto');
    console.log('   - La API key debe estar en el mismo proyecto donde habilitaste la API');
    console.log('\n3️⃣  Esperar 1-2 minutos después de habilitar la API');
    console.log('   - Puede tomar un momento para propagarse');
    console.log('\n4️⃣  Ejecutar este script nuevamente:');
    console.log('   npm run test:gemini\n');
  }
  
} catch (error) {
  console.error('\n❌ Error general:', error.message);
  if (error.message.includes('API key')) {
    console.log('\n💡 Tu API key puede ser inválida. Verifica:');
    console.log('   1. Que la API key sea correcta');
    console.log('   2. Que tengas habilitada la API de Gemini en Google Cloud');
    console.log('   3. Que la API key tenga los permisos necesarios');
  }
  process.exit(1);
}
