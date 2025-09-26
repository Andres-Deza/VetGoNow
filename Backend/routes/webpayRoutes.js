import express from 'express';
import {
  initiateWebpayPayment,
  handleWebpayReturn,
  handleWebpayFinal,
  checkWebpayPaymentStatus,
  refundWebpayPayment
} from '../controllers/webpayController.js';

const webpayRouter = express.Router();

// Iniciar pago con Webpay
webpayRouter.get('/pay/:id', initiateWebpayPayment);

// Webpay return URL (desde Webpay hacia tu app)
webpayRouter.get('/return', handleWebpayReturn);

// Webpay final URL (opcional)
webpayRouter.get('/final', handleWebpayFinal);

// Verificar estado del pago
webpayRouter.get('/status/:token', checkWebpayPaymentStatus);

// Refund de pago (opcional)
webpayRouter.post('/refund', refundWebpayPayment);

export default webpayRouter;
