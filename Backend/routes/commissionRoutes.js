import express from 'express';
import {
  getCommissionConfigs,
  updateCommissionConfig,
  updateMultipleCommissionConfigs
} from '../controllers/commissionController.js';
import { authenticate, authorize } from '../middleware/authmiddleware.js';

const commissionRouter = express.Router();

// Todas las rutas requieren autenticación
commissionRouter.use(authenticate);

// Obtener configuraciones de comisión (accesible para todos los autenticados, pero solo admin puede modificar)
commissionRouter.get('/configs', getCommissionConfigs);

// Actualizar configuración de comisión (solo admin)
commissionRouter.put('/config', authorize(['admin']), updateCommissionConfig);

// Actualizar múltiples configuraciones (solo admin)
commissionRouter.put('/configs', authorize(['admin']), updateMultipleCommissionConfigs);

export default commissionRouter;

