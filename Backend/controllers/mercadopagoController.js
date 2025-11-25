import { createRequire } from 'module';
import SavedCard from '../models/SavedCard.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// El SDK de Mercado Pago es CommonJS, usar createRequire para importarlo
const require = createRequire(import.meta.url);
const mercadopago = require('mercadopago');

// El SDK de Mercado Pago v2 exporta las siguientes clases
const { MercadoPagoConfig, Payment, Customer, CustomerCard, CardToken } = mercadopago;

// Inicializar Mercado Pago solo si hay un access token configurado
let mercadoPagoClient = null;
if (process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_ACCESS_TOKEN.trim() !== '') {
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: {
      timeout: 5000,
      idempotencyKey: 'abc'
    }
  });
  mercadoPagoClient = client;
} else {
  console.warn('Mercado Pago access token not configured. Mercado Pago features will be disabled.');
}

/**
 * Crear token de tarjeta (seguro, desde el backend)
 */
export const createCardToken = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      success: false,
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }

  try {
    const { cardNumber, cardholderName, expirationMonth, expirationYear, securityCode } = req.body;

    if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos de la tarjeta son requeridos'
      });
    }

    // Usar CardToken del SDK para crear el token
    const cardToken = new CardToken(mercadoPagoClient);
    
    const tokenData = await cardToken.create({
      body: {
        card_number: cardNumber.replace(/\s/g, ''),
        cardholder: {
          name: cardholderName
        },
        card_expiration_month: String(expirationMonth).padStart(2, '0'),
        card_expiration_year: '20' + String(expirationYear).padStart(2, '0'),
        security_code: securityCode
      }
    });

    return res.status(200).json({
      success: true,
      token: tokenData.id,
      cardData: {
        last4: tokenData.last_four_digits || cardNumber.slice(-4).replace(/\s/g, ''),
        brand: tokenData.payment_method?.id || 'credit_card',
        expMonth: parseInt(expirationMonth) || null,
        expYear: parseInt(expirationYear) ? parseInt('20' + String(expirationYear).padStart(2, '0')) : null
      }
    });
  } catch (error) {
    console.error('Error al crear token de tarjeta:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al crear token de tarjeta',
      error: error.cause || error
    });
  }
};

/**
 * Obtener la Public Key de Mercado Pago (ruta pública)
 */
export const getPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || '';
    
    console.log('Solicitando Public Key de Mercado Pago');
    console.log('MERCADOPAGO_PUBLIC_KEY configurada:', publicKey ? 'Sí (' + publicKey.substring(0, 10) + '...)' : 'No');
    
    if (!publicKey) {
      console.warn('MERCADOPAGO_PUBLIC_KEY no está configurada en las variables de entorno');
      return res.status(503).json({ 
        success: false,
        message: 'Mercado Pago Public Key no está configurada. Por favor configura MERCADOPAGO_PUBLIC_KEY en las variables de entorno.' 
      });
    }

    console.log('Public Key encontrada, retornando al cliente');
    return res.status(200).json({
      success: true,
      publicKey: publicKey
    });
  } catch (error) {
    console.error('Error al obtener Public Key:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener Public Key',
      error: error.message 
    });
  }
};

/**
 * Crear o obtener un Mercado Pago Customer para un usuario
 */
export const getOrCreateMercadoPagoCustomer = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }
  
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // Buscar usuario en la base de datos
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si el usuario ya tiene un mercadoPagoCustomerId, retornarlo
    if (user.mercadoPagoCustomerId) {
      return res.status(200).json({
        customerId: user.mercadoPagoCustomerId,
        isNew: false
      });
    }

    // Crear nuevo customer en Mercado Pago
    const customer = new Customer(mercadoPagoClient);
    
    const customerData = await customer.create({
      body: {
        email: user.email,
        first_name: user.name.split(' ')[0] || user.name,
        last_name: user.name.split(' ').slice(1).join(' ') || '',
        phone: {
          area_code: user.phoneNumber.substring(0, 2) || '',
          number: user.phoneNumber.substring(2) || user.phoneNumber
        }
      }
    });

    // Guardar el customerId en el usuario
    user.mercadoPagoCustomerId = customerData.id;
    await user.save();

    return res.status(200).json({
      customerId: customerData.id,
      isNew: true
    });
  } catch (error) {
    console.error('Error al crear/obtener Mercado Pago Customer:', error);
    return res.status(500).json({ 
      message: 'Error al crear cliente de Mercado Pago',
      error: error.message 
    });
  }
};

/**
 * Guardar tarjeta después de que el usuario completa el pago/setup
 * En Mercado Pago, las tarjetas se guardan después de un primer pago exitoso
 */
export const saveCard = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      success: false,
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }
  
  try {
    console.log('=== Iniciando saveCard ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', { authorization: req.headers.authorization ? 'Present' : 'Missing' });
    const userId = req.userId || req.user?.id;
    let { cardToken, paymentId, cardholderName, cardData: cardDataFromBody } = req.body;

    console.log('Guardar tarjeta - Datos recibidos:', {
      userId,
      hasCardToken: !!cardToken,
      hasPaymentId: !!paymentId,
      hasCardData: !!cardDataFromBody,
      cardDataFromBody
    });

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    if (!cardToken && !paymentId) {
      return res.status(400).json({ 
        success: false,
        message: 'cardToken o paymentId son requeridos para guardar la tarjeta' 
      });
    }

    // Validar que cardData tenga al menos last4 si se proporciona
    if (cardDataFromBody && Object.keys(cardDataFromBody).length > 0 && !cardDataFromBody.last4) {
      console.warn('cardData proporcionado pero sin last4, se intentará usar el token directamente');
    }

    // Obtener usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // NO crear Customer automáticamente - usar solo el tarjetero
    // El Customer solo se creará cuando sea realmente necesario (por ejemplo, para guardar tarjeta en MercadoPago)
    // Por ahora, guardamos la tarjeta solo en nuestra BD usando el token

    let cardData = null;

    // Si tenemos un paymentId, obtener la tarjeta desde el pago
    if (paymentId) {
      const payment = new Payment(mercadoPagoClient);
      const paymentInfo = await payment.get({ id: paymentId });
      
      if (paymentInfo.status === 'approved' || paymentInfo.status === 'pending') {
        // Obtener información de la tarjeta del pago
        if (paymentInfo.card) {
          cardData = {
            last4: paymentInfo.card.last_four_digits || '',
            brand: paymentInfo.payment_method_id || 'credit_card',
            expMonth: paymentInfo.card.expiration_month || null,
            expYear: paymentInfo.card.expiration_year || null
          };
          
          // Usar el ID del card como token para referencia futura
          if (paymentInfo.card.id) {
            cardToken = paymentInfo.card.id;
          }
        }
      }
    }

    // Si tenemos cardToken pero no cardData ni paymentId, usar la información proporcionada en cardData
    if (cardToken && !cardData && !paymentId) {
      // Verificar si se proporcionó información de tarjeta en el body
      if (cardDataFromBody && cardDataFromBody.last4) {
        // Usar la información proporcionada directamente desde el tarjetero
        cardData = {
          last4: cardDataFromBody.last4,
          brand: cardDataFromBody.brand || 'credit_card',
          expMonth: cardDataFromBody.expMonth || null,
          expYear: cardDataFromBody.expYear || null
        };
        console.log('Usando información de tarjeta proporcionada desde frontend (tarjetero):', cardData);
      } else {
        // Si no hay información de tarjeta, no podemos guardar la tarjeta
        // El tarjetero siempre debe proporcionar cardData con last4 y brand
        console.error('No se proporcionó información de tarjeta (cardData) desde el frontend');
        return res.status(400).json({ 
          success: false,
          message: 'No se pudo guardar la tarjeta. Se requiere información de la tarjeta (last4, brand) desde el tarjetero.',
          error: 'cardData faltante'
        });
      }
    }

    if (!cardData) {
      console.error('No se pudo obtener información de la tarjeta');
      return res.status(400).json({ 
        success: false,
        message: 'No se pudo obtener información de la tarjeta. Proporciona cardData con last4 y brand, o realiza un pago primero.' 
      });
    }

    // Validar que cardData tenga al menos last4
    if (!cardData.last4) {
      console.error('cardData no tiene last4:', cardData);
      return res.status(400).json({ 
        success: false,
        message: 'La información de la tarjeta debe incluir al menos los últimos 4 dígitos (last4).' 
      });
    }

    // Si no hay tarjetas guardadas, esta será la predeterminada
    const existingCards = await SavedCard.find({ 
      userId, 
      provider: 'mercadopago',
      isActive: true 
    });
    const isDefault = existingCards.length === 0;

    // Si se marca como predeterminada, desmarcar las demás
    if (isDefault) {
      await SavedCard.updateMany(
        { userId, provider: 'mercadopago', isActive: true },
        { $set: { isDefault: false } }
      );
    }

    // Usar paymentId o cardToken como identificador único
    const paymentMethodIdentifier = cardToken || paymentId;
    
    // Verificar si ya existe esta tarjeta guardada (por last4 y brand para evitar duplicados)
    const existingCard = await SavedCard.findOne({
      userId,
      provider: 'mercadopago',
      'cardInfo.last4': cardData.last4,
      'cardInfo.brand': cardData.brand,
      isActive: true
    });

    if (existingCard) {
      return res.status(200).json({
        success: true,
        message: 'Tarjeta ya guardada',
        card: existingCard
      });
    }

    // Guardar la tarjeta en la base de datos
    // Usar el token como customerId si no hay Customer en MercadoPago
    const customerIdForCard = user.mercadoPagoCustomerId || `token_${paymentMethodIdentifier.substring(0, 20)}`;
    
    console.log('Guardando tarjeta en base de datos (solo tarjetero, sin Customer):', {
      userId,
      customerId: customerIdForCard,
      paymentMethodId: paymentMethodIdentifier,
      cardData: {
        last4: cardData.last4,
        brand: cardData.brand,
        expMonth: cardData.expMonth,
        expYear: cardData.expYear
      },
      isDefault,
      hasMercadoPagoCustomer: !!user.mercadoPagoCustomerId
    });

    try {
      const savedCard = new SavedCard({
        userId,
        provider: 'mercadopago',
        customerId: customerIdForCard, // Usar token como referencia si no hay Customer
        paymentMethodId: paymentMethodIdentifier,
        cardInfo: {
          last4: cardData.last4,
          brand: cardData.brand,
          expMonth: cardData.expMonth || null,
          expYear: cardData.expYear || null,
          funding: 'credit'
        },
        cardholderName: cardholderName || '',
        isDefault,
        isActive: true
      });

      await savedCard.save();

      console.log('Tarjeta guardada exitosamente:', savedCard._id);

      return res.status(200).json({
        success: true,
        message: 'Tarjeta guardada exitosamente',
        card: savedCard
      });
    } catch (saveError) {
      console.error('Error al guardar tarjeta en base de datos:', saveError);
      
      // Si es un error de índice único (tarjeta duplicada)
      if (saveError.code === 11000 || saveError.name === 'MongoServerError') {
        console.log('Tarjeta duplicada detectada, buscando tarjeta existente...');
        const existingCard = await SavedCard.findOne({
          userId,
          provider: 'mercadopago',
          paymentMethodId: paymentMethodIdentifier
        });
        
        if (existingCard) {
          // Actualizar la tarjeta existente en lugar de crear una nueva
          existingCard.isActive = true;
          existingCard.cardInfo = {
            last4: cardData.last4,
            brand: cardData.brand,
            expMonth: cardData.expMonth || existingCard.cardInfo?.expMonth || null,
            expYear: cardData.expYear || existingCard.cardInfo?.expYear || null,
            funding: 'credit'
          };
          if (cardholderName) {
            existingCard.cardholderName = cardholderName;
          }
          await existingCard.save();
          
          return res.status(200).json({
            success: true,
            message: 'Tarjeta actualizada exitosamente',
            card: existingCard
          });
        }
      }
      
      throw saveError; // Re-lanzar para que el catch general lo maneje
    }
  } catch (error) {
    console.error('=== Error al guardar tarjeta ===');
    console.error('Error completo:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      cause: error.cause,
      response: error.response?.data || error.response
    });
    
    // Manejar errores específicos de Mercado Pago
    if (error.response || error.cause) {
      const mercadoPagoError = error.response?.data || error.cause;
      console.error('Error de Mercado Pago:', mercadoPagoError);
      return res.status(500).json({
        success: false,
        message: 'Error al guardar tarjeta en Mercado Pago',
        error: mercadoPagoError?.message || error.message || 'Error desconocido',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name,
          mercadoPagoDetails: mercadoPagoError
        } : undefined
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Error al guardar tarjeta',
      error: error.message || 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name,
        code: error.code
      } : undefined
    });
  }
};

/**
 * Obtener todas las tarjetas guardadas del usuario
 */
export const getSavedCards = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }
  
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const cards = await SavedCard.find({ 
      userId, 
      provider: 'mercadopago',
      isActive: true 
    })
      .sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json({ cards });
  } catch (error) {
    console.error('Error al obtener tarjetas guardadas:', error);
    return res.status(500).json({ 
      message: 'Error al obtener tarjetas guardadas',
      error: error.message 
    });
  }
};

/**
 * Eliminar una tarjeta guardada
 */
export const deleteCard = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const card = await SavedCard.findOne({ 
      _id: cardId, 
      userId,
      provider: 'mercadopago'
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }

    // En Mercado Pago, las tarjetas se eliminan automáticamente cuando se eliminan del customer
    // O se pueden mantener en Mercado Pago y solo desactivar en nuestra BD
    // Por ahora, solo desactivamos en nuestra BD
    // Nota: Si necesitas eliminarla de Mercado Pago, usa el Customer API para eliminar el payment_method

    // Marcar como inactiva en lugar de eliminar
    card.isActive = false;
    await card.save();

    return res.status(200).json({ message: 'Tarjeta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar tarjeta:', error);
    return res.status(500).json({ 
      message: 'Error al eliminar tarjeta',
      error: error.message 
    });
  }
};

/**
 * Establecer una tarjeta como predeterminada
 */
export const setDefaultCard = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const card = await SavedCard.findOne({ 
      _id: cardId, 
      userId, 
      provider: 'mercadopago',
      isActive: true 
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }

    // Desmarcar todas las tarjetas como predeterminadas
    await SavedCard.updateMany(
      { userId, provider: 'mercadopago', isActive: true },
      { $set: { isDefault: false } }
    );

    // Marcar esta tarjeta como predeterminada
    card.isDefault = true;
    await card.save();

    return res.status(200).json({ 
      message: 'Tarjeta predeterminada actualizada', 
      card 
    });
  } catch (error) {
    console.error('Error al establecer tarjeta predeterminada:', error);
    return res.status(500).json({ 
      message: 'Error al actualizar tarjeta predeterminada',
      error: error.message 
    });
  }
};

/**
 * Crear un pago con tarjeta guardada
 */
export const payWithSavedCard = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { appointmentId, cardId, amount, description } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!appointmentId || !cardId || !amount) {
      return res.status(400).json({ 
        message: 'appointmentId, cardId y amount son requeridos' 
      });
    }

    // Obtener la tarjeta guardada
    const card = await SavedCard.findOne({ 
      _id: cardId, 
      userId, 
      provider: 'mercadopago',
      isActive: true 
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }

    // Obtener usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Crear pago con Mercado Pago
    const payment = new Payment(mercadoPagoClient);
    
    const paymentData = await payment.create({
      body: {
        transaction_amount: parseFloat(amount),
        description: description || `Pago de servicio - ${appointmentId}`,
        payment_method_id: 'credit_card',
        payer: {
          email: user.email,
          identification: {
            type: 'RUT',
            number: user.phoneNumber // Usar phone como placeholder, deberías tener RUT
          }
        },
        token: card.paymentMethodId,
        installments: 1,
        statement_descriptor: 'VETGONOW',
        external_reference: appointmentId.toString(),
        metadata: {
          userId: userId.toString(),
          appointmentId: appointmentId.toString(),
          cardId: cardId.toString()
        }
      }
    });

    if (paymentData.status === 'approved' || paymentData.status === 'pending') {
      return res.status(200).json({
        success: true,
        message: 'Pago procesado exitosamente',
        paymentId: paymentData.id,
        status: paymentData.status
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'El pago no pudo ser procesado',
        status: paymentData.status,
        details: paymentData.status_detail
      });
    }
  } catch (error) {
    console.error('Error al procesar pago con tarjeta guardada:', error);
    return res.status(500).json({ 
      message: 'Error al procesar pago',
      error: error.message 
    });
  }
};

/**
 * Crear un pago con nueva tarjeta (token)
 */
export const createPayment = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      message: 'Mercado Pago no está configurado. Por favor configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' 
    });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { token, amount, description, appointmentId, saveCard } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!token || !amount) {
      return res.status(400).json({ 
        message: 'token y amount son requeridos' 
      });
    }

    // Obtener usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // NO crear Customer automáticamente - usar solo el token del tarjetero para pagos

    // Crear pago con Mercado Pago
    const payment = new Payment(mercadoPagoClient);
    
    const paymentData = await payment.create({
      body: {
        transaction_amount: parseFloat(amount),
        description: description || `Pago de servicio`,
        payment_method_id: 'credit_card',
        payer: {
          email: user.email,
          identification: {
            type: 'RUT',
            number: user.phoneNumber // Placeholder, deberías tener RUT
          }
        },
        token: token,
        installments: 1,
        statement_descriptor: 'VETGONOW',
        external_reference: appointmentId ? appointmentId.toString() : undefined,
        metadata: {
          userId: userId.toString(),
          appointmentId: appointmentId ? appointmentId.toString() : undefined
        }
      }
    });

    // Si el pago fue exitoso y el usuario quiere guardar la tarjeta
    if ((paymentData.status === 'approved' || paymentData.status === 'pending') && saveCard) {
      // Guardar la tarjeta automáticamente
      req.body.paymentId = paymentData.id;
      req.body.cardToken = token;
      await saveCard(req, res);
    }

    if (paymentData.status === 'approved' || paymentData.status === 'pending') {
      return res.status(200).json({
        success: true,
        message: 'Pago procesado exitosamente',
        paymentId: paymentData.id,
        status: paymentData.status
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'El pago no pudo ser procesado',
        status: paymentData.status,
        details: paymentData.status_detail
      });
    }
  } catch (error) {
    console.error('Error al crear pago:', error);
    return res.status(500).json({ 
      message: 'Error al crear pago',
      error: error.message 
    });
  }
};

/**
 * Obtener lista de pagos desde MercadoPago
 * Útil para ver todos los pagos realizados a través de la app
 */
export const getPayments = async (req, res) => {
  if (!mercadoPagoClient) {
    return res.status(503).json({ 
      success: false,
      message: 'Mercado Pago no está configurado' 
    });
  }

  try {
    const userId = req.userId || req.user?.id;
    const { limit = 50, offset = 0, status, startDate, endDate } = req.query;

    // Solo admins pueden ver todos los pagos
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Solo administradores pueden ver todos los pagos' 
      });
    }

    const paymentClient = new Payment(mercadoPagoClient);
    
    // Construir query string para la búsqueda
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    if (status) {
      queryParams.append('status', status);
    }
    if (startDate) {
      queryParams.append('range', `date_created`);
      queryParams.append('begin_date', startDate);
    }
    if (endDate) {
      queryParams.append('end_date', endDate);
    }

    // Usar la API REST directamente para buscar pagos
    // El SDK puede no tener search(), así que usamos fetch
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const searchUrl = `https://api.mercadopago.com/v1/payments/search?${queryParams.toString()}`;
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      throw new Error(errorData.message || 'Error al buscar pagos en MercadoPago');
    }

    const searchData = await searchResponse.json();

    // Obtener información detallada de cada pago
    const payments = await Promise.all(
      (searchData.results || []).map(async (payment) => {
        try {
          const paymentInfo = await paymentClient.get({ id: payment.id });
          return {
            id: paymentInfo.id,
            status: paymentInfo.status,
            statusDetail: paymentInfo.status_detail,
            transactionAmount: paymentInfo.transaction_amount,
            currency: paymentInfo.currency_id,
            dateCreated: paymentInfo.date_created,
            dateApproved: paymentInfo.date_approved,
            paymentMethodId: paymentInfo.payment_method_id,
            paymentTypeId: paymentInfo.payment_type_id,
            externalReference: paymentInfo.external_reference,
            payer: paymentInfo.payer ? {
              email: paymentInfo.payer.email,
              identification: paymentInfo.payer.identification
            } : null,
            card: paymentInfo.card ? {
              lastFourDigits: paymentInfo.card.last_four_digits,
              brand: paymentInfo.card.first_six_digits ? 'Detectable' : 'Unknown'
            } : null
          };
        } catch (err) {
          console.error(`Error obteniendo detalles del pago ${payment.id}:`, err);
          return {
            id: payment.id,
            error: 'No se pudieron obtener los detalles'
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      pagination: {
        total: searchData.paging?.total || payments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      payments
    });

  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener pagos',
      error: error.message 
    });
  }
};

