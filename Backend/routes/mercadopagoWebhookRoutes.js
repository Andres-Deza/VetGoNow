import express from 'express';
import {
  handleMercadoPagoWebhook,
  checkPaymentStatus
} from '../controllers/mercadopagoWebhookController.js';
import { MERCADOPAGO_ACCESS_TOKEN } from '../config.js';
import { MercadoPagoConfig } from 'mercadopago';

const mercadopagoWebhookRouter = express.Router();

// Middleware para inyectar el cliente de Mercado Pago en la request
mercadopagoWebhookRouter.use((req, res, next) => {
  if (MERCADOPAGO_ACCESS_TOKEN && MERCADOPAGO_ACCESS_TOKEN.trim() !== '') {
    const mercadoPagoClient = new MercadoPagoConfig({
      accessToken: MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000
      }
    });
    req.app.set('mercadoPagoClient', mercadoPagoClient);
  }
  next();
});

// IMPORTANTE: Este endpoint NO debe tener autenticación
// Mercado Pago envía las notificaciones directamente a este endpoint
mercadopagoWebhookRouter.post('/webhook', handleMercadoPagoWebhook);

// Endpoint para verificar manualmente el estado de un pago (útil para desarrollo)
mercadopagoWebhookRouter.get('/payment-status/:paymentId', checkPaymentStatus);

export default mercadopagoWebhookRouter;

