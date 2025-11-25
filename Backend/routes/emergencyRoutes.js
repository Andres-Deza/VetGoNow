import express from 'express';
import {
  createEmergencyRequest,
  getNearbyVets,
  getPendingEmergenciesForVet,
  estimatePricing,
  confirmEmergencyRequest,
  getEmergencyTracking,
  updateEmergencyUserDetails,
  getUserActiveEmergencies,
  expandEmergencySearch
} from '../controllers/emergencyController.js';
import { authenticate } from '../middleware/authmiddleware.js';
import { protect, authorize } from '../middleware/authmiddleware.js';
import { requireCard } from '../middleware/requireCardMiddleware.js';

const emergencyRouter = express.Router();

// Todas las rutas requieren autenticación
// La creación de emergencia requiere tarjeta guardada (excepto en desarrollo con dev_bypass)
emergencyRouter.post('/create', authenticate, createEmergencyRequest);
emergencyRouter.get(
  '/nearby-vets',
  protect,
  authorize(['Vet', 'User']),
  getNearbyVets
);
emergencyRouter.get(
  '/pending',
  protect,
  authorize(['Vet']),
  getPendingEmergenciesForVet
);
emergencyRouter.post('/estimate-pricing', authenticate, estimatePricing);
emergencyRouter.post('/:requestId/confirm', authenticate, confirmEmergencyRequest);
emergencyRouter.get('/:requestId/tracking', authenticate, getEmergencyTracking);
emergencyRouter.patch(
  '/:requestId/user-details',
  authenticate,
  updateEmergencyUserDetails
);
emergencyRouter.get('/user-active', authenticate, getUserActiveEmergencies);
emergencyRouter.post('/:requestId/expand-search', authenticate, expandEmergencySearch);

export default emergencyRouter;

