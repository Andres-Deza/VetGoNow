import express from 'express';
import { protect } from '../middleware/authmiddleware.js';
import { analyzeBreedImage, analyzeHealthImage, uploadMiddleware } from '../controllers/imageAnalysisController.js';

const imageAnalysisRouter = express.Router();

// Todas las rutas requieren autenticación
imageAnalysisRouter.post('/breed', protect, uploadMiddleware, analyzeBreedImage);
imageAnalysisRouter.post('/health', protect, uploadMiddleware, analyzeHealthImage);

export default imageAnalysisRouter;

