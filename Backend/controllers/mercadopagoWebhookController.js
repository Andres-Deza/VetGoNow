import Appointment from '../models/Appointment.js';
import { Payment } from 'mercadopago';

/**
 * Handler para recibir webhooks de Mercado Pago
 * Este endpoint NO requiere autenticación porque Mercado Pago envía las notificaciones directamente
 * 
 * IMPORTANTE: Configurar en el panel de Mercado Pago:
 * 1. Ir a: https://www.mercadopago.cl/developers/panel/app/[TU_APP_ID]/webhooks
 * 2. Configurar URL: https://tu-dominio.com/api/payment/mercadopago/webhook
 * 3. Seleccionar eventos: payment.* (todos los eventos de pago)
 */
export const handleMercadoPagoWebhook = async (req, res) => {
  try {
    // Log para debugging
    console.log('=== WEBHOOK RECIBIDO ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    // Mercado Pago envía notificaciones con información del pago
    const { type, data } = req.body;

    console.log('Webhook recibido de Mercado Pago:', { type, data });

    // Verificar que sea una notificación válida
    // Nota: En la prueba inicial, data.id puede ser un string "123456"
    if (!type || !data) {
      console.log('Notificación inválida - faltan type o data');
      return res.status(400).json({ 
        success: false, 
        message: 'Notificación inválida - faltan type o data' 
      });
    }

    // Solo procesar eventos relacionados con pagos
    if (!type.startsWith('payment')) {
      console.log('Evento ignorado (no es de pago):', type);
      return res.status(200).json({ success: true, message: 'Evento ignorado' });
    }

    // Obtener información completa del pago desde Mercado Pago
    const mercadoPagoClient = req.app.get('mercadoPagoClient');
    
    if (!mercadoPagoClient) {
      console.error('Mercado Pago client no configurado');
      return res.status(500).json({ 
        success: false, 
        message: 'Error de configuración del servidor' 
      });
    }

    // Si es una prueba (data.id es "123456" o un número de prueba), responder OK sin procesar
    if (data.id === '123456' || data.id === 123456) {
      console.log('Esta es una prueba de webhook de Mercado Pago - respondiendo OK');
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook de prueba recibido correctamente',
        note: 'Este es un webhook de prueba. El webhook está funcionando correctamente.'
      });
    }

    const paymentClient = new Payment(mercadoPagoClient);
    const paymentInfo = await paymentClient.get({ id: data.id });

    console.log('Información del pago:', {
      id: paymentInfo.id,
      status: paymentInfo.status,
      status_detail: paymentInfo.status_detail,
      transaction_amount: paymentInfo.transaction_amount,
      external_reference: paymentInfo.external_reference
    });

    // Buscar la cita/urgencia usando external_reference
    // El external_reference debe ser el ID de la Appointment
    const appointmentId = paymentInfo.external_reference;

    if (!appointmentId) {
      console.error('No se encontró external_reference en el pago:', paymentInfo.id);
      return res.status(400).json({ 
        success: false, 
        message: 'No se encontró referencia de la cita en el pago' 
      });
    }

    // Buscar la cita en la base de datos
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      console.error('Cita no encontrada:', appointmentId);
      return res.status(404).json({ 
        success: false, 
        message: 'Cita no encontrada' 
      });
    }

    // Actualizar el estado del pago según el estado de Mercado Pago
    let updatedStatus = appointment.status;
    let isPaid = appointment.isPaid;

    switch (paymentInfo.status) {
      case 'approved':
        // Pago aprobado
        isPaid = true;
        if (appointment.isEmergency) {
          updatedStatus = appointment.status === 'pending' ? 'assigned' : appointment.status;
        } else {
          updatedStatus = appointment.status === 'pending' ? 'scheduled' : appointment.status;
        }
        console.log('Pago aprobado para cita:', appointmentId);
        break;

      case 'pending':
        // Pago pendiente (en proceso)
        isPaid = false;
        console.log('Pago pendiente para cita:', appointmentId);
        break;

      case 'rejected':
      case 'cancelled':
      case 'refunded':
      case 'charged_back':
        // Pago rechazado, cancelado, reembolsado o contracargo
        isPaid = false;
        if (paymentInfo.status === 'refunded' || paymentInfo.status === 'charged_back') {
          updatedStatus = 'cancelled';
        }
        console.log(`Pago ${paymentInfo.status} para cita:`, appointmentId);
        break;

      default:
        console.log('Estado de pago desconocido:', paymentInfo.status);
    }

    // Actualizar la cita en la base de datos
    await Appointment.findByIdAndUpdate(appointmentId, {
      isPaid,
      status: updatedStatus,
      'payment.transactionId': paymentInfo.id.toString(),
      'payment.status': paymentInfo.status,
      'payment.statusDetail': paymentInfo.status_detail,
      'payment.updatedAt': new Date()
    });

    // Si el pago fue aprobado y hay una tarjeta, guardarla si no existe
    if (paymentInfo.status === 'approved' && paymentInfo.card && paymentInfo.payer?.id) {
      // La lógica de guardar tarjeta se puede manejar aquí o dejarla para otro proceso
      console.log('Pago aprobado con tarjeta, se puede guardar para futuros pagos');
    }

    // Responder a Mercado Pago (importante: responder 200 OK)
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook procesado correctamente',
      paymentId: paymentInfo.id,
      appointmentId,
      status: paymentInfo.status
    });

  } catch (error) {
    console.error('Error al procesar webhook de Mercado Pago:', error);
    console.error('Error stack:', error.stack);
    
    // Aún así responder 200 para que Mercado Pago no reintente inmediatamente
    // Puedes implementar un sistema de reintentos manuales si es necesario
    return res.status(200).json({ 
      success: false, 
      message: 'Error al procesar webhook',
      error: error.message 
    });
  }
};

/**
 * Endpoint para verificar el estado de un pago manualmente
 * Útil para desarrollo y debugging
 */
export const checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'paymentId es requerido' 
      });
    }

    const mercadoPagoClient = req.app.get('mercadoPagoClient');
    
    if (!mercadoPagoClient) {
      return res.status(500).json({ 
        success: false, 
        message: 'Mercado Pago no está configurado' 
      });
    }

    const paymentClient = new Payment(mercadoPagoClient);
    const paymentInfo = await paymentClient.get({ id: paymentId });

    return res.status(200).json({
      success: true,
      payment: {
        id: paymentInfo.id,
        status: paymentInfo.status,
        status_detail: paymentInfo.status_detail,
        transaction_amount: paymentInfo.transaction_amount,
        external_reference: paymentInfo.external_reference,
        date_created: paymentInfo.date_created,
        date_approved: paymentInfo.date_approved
      }
    });
  } catch (error) {
    console.error('Error al verificar estado de pago:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al verificar estado del pago',
      error: error.message 
    });
  }
};

