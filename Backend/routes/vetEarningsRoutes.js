import express from 'express';
import {
  getVetEarnings,
  getVetEarningsSummary,
  updateBankAccount
} from '../controllers/vetEarningsController.js';
import { authenticate } from '../middleware/authmiddleware.js';

const vetEarningsRouter = express.Router();

// Todas las rutas requieren autenticación
vetEarningsRouter.use(authenticate);

// Obtener ganancias del veterinario
vetEarningsRouter.get('/earnings', getVetEarnings);

// Obtener resumen de ganancias
vetEarningsRouter.get('/summary', getVetEarningsSummary);

// Actualizar información bancaria
vetEarningsRouter.put('/bank-account', updateBankAccount);

export default vetEarningsRouter;

