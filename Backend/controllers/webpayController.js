import dotenv from 'dotenv';
import pkg from 'transbank-sdk';
const { WebpayPlus } = pkg;
import WebpayTransaction from '../models/WebpayTransaction.js';
import Appointment from '../models/Appointment.js';
import { format } from 'date-fns';

dotenv.config();

// Configurar Webpay con credenciales de producción o integración
const webpay = new WebpayPlus.Transaction({
  commerceCode: process.env.WEBPAY_COMMERCE_CODE || '597055555532',
  apiKey: process.env.WEBPAY_API_KEY || '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
  environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'INTEGRATION'
});

/**
 * Iniciar pago con Webpay
 */
export const initiateWebpayPayment = async (req, res) => {
  const bookingId = req.params.id;
  console.log('📦 Booking ID received for Webpay payment:', bookingId);

  try {
    const appointment = await Appointment.findById(bookingId)
      .populate('userId', 'name email')
      .populate('vetId', 'name email')
      .populate('petId', 'name species breed');

    if (!appointment) {
      console.warn('Appointment not found for ID:', bookingId);
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Monto fijo de 500 CLP (puedes hacerlo dinámico después)
    const amount = 500;
    // Generar buyOrder más corto (máximo 26 caracteres para Webpay)
    const timestamp = format(new Date(), 'yyMMddHHmmss');
    const shortId = bookingId.slice(-8); // Últimos 8 caracteres del bookingId
    const buyOrder = `VC${timestamp}${shortId}`.substring(0, 26); // Asegurar máximo 26 chars
    const sessionId = `session-${bookingId}`;
    const returnUrl = `${process.env.BASE_URL}/api/payment/webpay/return`;
    const finalUrl = `${process.env.FRONTEND_URL}/api/payment/webpay/final`;

    // 🔍 Validar URLs antes de enviar a Webpay
    console.log('🔗 URLs being sent to Webpay:');
    console.log('  - Return URL:', returnUrl);
    console.log('  - Final URL:', finalUrl);

    // Validar que las URLs sean válidas y HTTPS (requerido por Webpay)
    try {
      new URL(returnUrl);
      new URL(finalUrl);
    } catch (urlError) {
      console.error('Invalid URL format:', urlError.message);
      return res.status(500).json({
        success: false,
        message: 'Payment initiation failed',
        error: `Invalid URL format. Para desarrollo local, usa ngrok para crear URLs HTTPS. URLs actuales: returnUrl=${returnUrl}, finalUrl=${finalUrl}`
      });
    }

    // Verificar que sean HTTPS (Webpay lo requiere)
    if (!returnUrl.startsWith('https://') || !finalUrl.startsWith('https://')) {
      console.warn('Webpay requires HTTPS URLs for production and ngrok for development');
      console.warn('💡 Para desarrollo local: usa ngrok (https://ngrok.com) para crear túnel HTTPS');
      console.warn('💡 Comando ejemplo: ngrok http 5555');
      return res.status(500).json({
        success: false,
        message: 'Payment initiation failed',
        error: 'Webpay requires HTTPS URLs. Para desarrollo local, configura ngrok: https://ngrok.com'
      });
    }

    console.log('💳 Webpay Payment Details:');
    console.log('  - Amount:', amount);
    console.log('  - Buy Order:', buyOrder);
    console.log('  - Session ID:', sessionId);

    // Crear transacción en Webpay
    const createResponse = await webpay.create(buyOrder, sessionId, amount, returnUrl);

    console.log('Webpay transaction created:', createResponse);

    // Guardar información de la transacción
    await WebpayTransaction.create({
      appointmentId: appointment._id,
      buyOrder,
      sessionId,
      amount,
      status: 'pending',
      token: createResponse.token,
      url: createResponse.url
    });

    // Redirigir al usuario a Webpay
    res.json({
      success: true,
      data: {
        url: createResponse.url,
        token: createResponse.token
      }
    });

  } catch (err) {
    console.error('Error initiating Webpay payment:', err);
    return res.status(500).json({
      success: false,
      message: 'Payment initiation failed',
      error: err.message
    });
  }
};

/**
 * Manejar retorno desde Webpay (antes del pago)
 */
export const handleWebpayReturn = async (req, res) => {
  const { token_ws } = req.query;

  try {
    console.log('🔄 Webpay return with token:', token_ws);

    // Obtener estado de la transacción
    const commitResponse = await webpay.commit(token_ws);

    console.log('📊 Webpay commit response:', commitResponse);

    // Actualizar transacción en base de datos
    const transaction = await WebpayTransaction.findOneAndUpdate(
      { token: token_ws },
      {
        status: commitResponse.status === 'AUTHORIZED' ? 'Success' : 'Failed',
        responseCode: commitResponse.response_code,
        authorizationCode: commitResponse.authorization_code,
        rawResponse: commitResponse
      },
      { new: true }
    );

    if (!transaction) {
      console.warn('Webpay transaction not found for token:', token_ws);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
    }

    if (commitResponse.status === 'AUTHORIZED') {
      // Actualizar cita como pagada
      await Appointment.findByIdAndUpdate(transaction.appointmentId, {
        isPaid: true,
        status: 'scheduled'
      });

      console.log('Payment successful for appointment:', transaction.appointmentId);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-success?token=${token_ws}`);
    } else {
      // Eliminar cita si el pago falló
      await Appointment.findByIdAndDelete(transaction.appointmentId);
      console.log('Payment failed, appointment deleted:', transaction.appointmentId);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
    }

  } catch (err) {
    console.error('Error handling Webpay return:', err);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
  }
};

/**
 * Página final después del pago (opcional)
 */
export const handleWebpayFinal = async (req, res) => {
  const { token_ws } = req.query;

  try {
    const transaction = await WebpayTransaction.findOne({ token: token_ws })
      .populate({
        path: 'appointmentId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'vetId', select: 'name email' },
          { path: 'petId', select: 'name species breed' }
        ]
      });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      message: 'Payment completed',
      data: transaction
    });

  } catch (err) {
    console.error('Error in Webpay final:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Verificar estado del pago
 */
export const checkWebpayPaymentStatus = async (req, res) => {
  const { token } = req.params;

  try {
    const transaction = await WebpayTransaction.findOne({ token })
      .populate({
        path: 'appointmentId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'vetId', select: 'name email' },
          { path: 'petId', select: 'name species breed' }
        ]
      });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    return res.json({
      success: true,
      data: {
        buyOrder: transaction.buyOrder,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        appointment: transaction.appointmentId
      }
    });
  } catch (err) {
    console.error('Error checking Webpay payment status:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Refund de pago (opcional)
 */
export const refundWebpayPayment = async (req, res) => {
  const { token } = req.body;

  try {
    const transaction = await WebpayTransaction.findOne({ token });

    if (!transaction || transaction.status !== 'Success') {
      return res.status(400).json({ success: false, message: 'Invalid transaction for refund' });
    }

    // Realizar refund
    const refundResponse = await webpay.refund(transaction.buyOrder);

    console.log('💸 Webpay refund response:', refundResponse);

    // Actualizar estado
    transaction.status = 'Refunded';
    await transaction.save();

    // Marcar cita como no pagada
    await Appointment.findByIdAndUpdate(transaction.appointmentId, {
      isPaid: false,
      status: 'cancelled'
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: refundResponse
    });

  } catch (err) {
    console.error('Error refunding Webpay payment:', err);
    res.status(500).json({ success: false, message: 'Refund failed' });
  }
};
