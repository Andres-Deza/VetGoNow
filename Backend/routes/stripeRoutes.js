import express from 'express';
import {
  getOrCreateStripeCustomer,
  createSetupIntent,
  saveCard,
  getSavedCards,
  deleteCard,
  setDefaultCard,
  payWithSavedCard
} from '../controllers/stripeController.js';
import { authenticate } from '../middleware/authmiddleware.js';

const stripeRouter = express.Router();

// Todas las rutas requieren autenticación
stripeRouter.use(authenticate);

// Obtener o crear Stripe Customer
stripeRouter.get('/customer', getOrCreateStripeCustomer);

// Crear Setup Intent para guardar tarjeta
stripeRouter.post('/setup-intent', createSetupIntent);

// Guardar tarjeta después del Setup Intent
stripeRouter.post('/save-card', saveCard);

// Obtener tarjetas guardadas
stripeRouter.get('/cards', getSavedCards);

// Eliminar tarjeta
stripeRouter.delete('/cards/:cardId', deleteCard);

// Establecer tarjeta predeterminada
stripeRouter.put('/cards/:cardId/default', setDefaultCard);

// Pagar con tarjeta guardada
stripeRouter.post('/pay', payWithSavedCard);

export default stripeRouter;

