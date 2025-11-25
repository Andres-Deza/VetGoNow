import express from 'express';
import {
  getOrCreateMercadoPagoCustomer,
  saveCard,
  getSavedCards,
  deleteCard,
  setDefaultCard,
  payWithSavedCard,
  createPayment,
  getPublicKey,
  createCardToken,
  getPayments
} from '../controllers/mercadopagoController.js';
import { authenticate } from '../middleware/authmiddleware.js';

const mercadopagoRouter = express.Router();

// Ruta pública para obtener la Public Key
mercadopagoRouter.get('/public-key', getPublicKey);

// Todas las demás rutas requieren autenticación
mercadopagoRouter.use(authenticate);

// Crear token de tarjeta (requiere autenticación por seguridad)
mercadopagoRouter.post('/card-token', createCardToken);

// Obtener o crear Mercado Pago Customer
mercadopagoRouter.get('/customer', getOrCreateMercadoPagoCustomer);

// Guardar tarjeta después de un pago exitoso
mercadopagoRouter.post('/save-card', saveCard);

// Obtener tarjetas guardadas
mercadopagoRouter.get('/cards', getSavedCards);

// Eliminar tarjeta
mercadopagoRouter.delete('/cards/:cardId', deleteCard);

// Establecer tarjeta predeterminada
mercadopagoRouter.put('/cards/:cardId/default', setDefaultCard);

// Pagar con tarjeta guardada
mercadopagoRouter.post('/pay', payWithSavedCard);

// Crear pago con nueva tarjeta (token)
mercadopagoRouter.post('/create-payment', createPayment);

// Obtener lista de pagos (solo admin)
mercadopagoRouter.get('/payments', getPayments);

export default mercadopagoRouter;

