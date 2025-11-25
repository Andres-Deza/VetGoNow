import express from 'express';
import { getPricingConfig, updatePricingConfig, getPublicPricingConfig } from '../controllers/pricingController.js';
import { protect, authorize } from '../middleware/authmiddleware.js';

const pricingRouter = express.Router();

// Endpoint público para obtener precios mínimos (solo lectura de precios de emergencia)
pricingRouter.get('/public', getPublicPricingConfig);
// Rutas que requieren autenticación y rol de admin
pricingRouter.get('/', protect, authorize(['admin']), getPricingConfig);
pricingRouter.put('/', protect, authorize(['admin']), updatePricingConfig);

export default pricingRouter;
