import express from 'express';
import multer from 'multer';
import {
  startVerification,
  processFrontId,
  processBackId,
  processSelfie,
  getVerificationStatus
} from '../controllers/kycController.js';

const kycRouter = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG o WebP.'));
    }
  }
});

// Iniciar sesión de verificación
kycRouter.post('/start', startVerification);

// Procesar cédula frontal
kycRouter.post('/id/front', upload.single('file'), processFrontId);

// Procesar cédula reverso
kycRouter.post('/id/back', upload.single('file'), processBackId);

// Procesar selfie con liveness
kycRouter.post('/selfie', upload.single('file'), processSelfie);

// Obtener estado de verificación
kycRouter.get('/status/:verificationId', getVerificationStatus);

export default kycRouter;

