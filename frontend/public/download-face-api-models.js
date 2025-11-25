// Script para descargar modelos de face-api.js
// Ejecutar en Node.js: node download-face-api-models.js
// O copiar y pegar en la consola del navegador

const fs = require('fs');
const https = require('https');
const path = require('path');

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const MODELS_DIR = path.join(__dirname, 'models');

// Crear directorio si no existe
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Descargado: ${path.basename(dest)}`);
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Redirect
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Error ${response.statusCode}: ${url}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('Descargando modelos de face-api.js...\n');
  
  for (const model of models) {
    const url = `${MODEL_URL}/${model}`;
    const dest = path.join(MODELS_DIR, model);
    
    try {
      await downloadFile(url, dest);
    } catch (error) {
      console.error(`✗ Error descargando ${model}:`, error.message);
    }
  }
  
  console.log('\n✓ Descarga completada!');
}

downloadModels();

