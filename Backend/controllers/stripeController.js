import Stripe from 'stripe';
import SavedCard from '../models/SavedCard.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Inicializar Stripe solo si hay una clave configurada
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim() !== '') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
} else {
  console.warn('Stripe secret key not configured. Stripe features will be disabled.');
}

/**
 * Crear o obtener un Stripe Customer para un usuario
 */
export const getOrCreateStripeCustomer = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
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

    // Si el usuario ya tiene un stripeCustomerId, retornarlo
    if (user.stripeCustomerId) {
      return res.status(200).json({
        customerId: user.stripeCustomerId,
        isNew: false
      });
    }

    // Crear nuevo customer en Stripe
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: userId.toString()
      }
    });

    // Guardar el customerId en el usuario
    user.stripeCustomerId = customer.id;
    await user.save();

    return res.status(200).json({
      customerId: customer.id,
      isNew: true
    });
  } catch (error) {
    console.error('Error al crear/obtener Stripe Customer:', error);
    return res.status(500).json({ message: 'Error al crear cliente de Stripe' });
  }
};

/**
 * Crear Setup Intent para guardar una tarjeta sin procesar un pago
 */
export const createSetupIntent = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
  }
  
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // Obtener o crear Stripe Customer
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    let customerId = user.stripeCustomerId;

    // Si no tiene customerId, crear uno
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString()
        }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Crear Setup Intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Para usar la tarjeta en futuros pagos
    });

    return res.status(200).json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });
  } catch (error) {
    console.error('Error al crear Setup Intent:', error);
    return res.status(500).json({ message: 'Error al crear Setup Intent' });
  }
};

/**
 * Guardar tarjeta después de que el usuario completa el Setup Intent
 */
export const saveCard = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { setupIntentId, paymentMethodId, cardholderName } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!setupIntentId || !paymentMethodId) {
      return res.status(400).json({ message: 'setupIntentId y paymentMethodId son requeridos' });
    }

    // Verificar que el Setup Intent fue exitoso
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Setup Intent no completado correctamente' });
    }

    // Obtener el Payment Method
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    // Obtener usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si no hay tarjetas guardadas, esta será la predeterminada
    const existingCards = await SavedCard.find({ userId, isActive: true });
    const isDefault = existingCards.length === 0;

    // Si se marca como predeterminada, desmarcar las demás
    if (isDefault) {
      await SavedCard.updateMany(
        { userId, isActive: true },
        { $set: { isDefault: false } }
      );
    }

    // Guardar la tarjeta en la base de datos
    const savedCard = new SavedCard({
      userId,
      stripeCustomerId: user.stripeCustomerId,
      stripePaymentMethodId: paymentMethodId,
      cardInfo: {
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
        funding: paymentMethod.card.funding || 'credit'
      },
      cardholderName: cardholderName || '',
      isDefault
    });

    await savedCard.save();

    return res.status(200).json({
      message: 'Tarjeta guardada exitosamente',
      card: savedCard
    });
  } catch (error) {
    console.error('Error al guardar tarjeta:', error);
    return res.status(500).json({ message: 'Error al guardar tarjeta' });
  }
};

/**
 * Obtener todas las tarjetas guardadas del usuario
 */
export const getSavedCards = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
  }
  
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const cards = await SavedCard.find({ userId, isActive: true })
      .sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json({ cards });
  } catch (error) {
    console.error('Error al obtener tarjetas guardadas:', error);
    return res.status(500).json({ message: 'Error al obtener tarjetas guardadas' });
  }
};

/**
 * Eliminar una tarjeta guardada
 */
export const deleteCard = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const card = await SavedCard.findOne({ _id: cardId, userId });
    
    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }

    // Desasociar el Payment Method del Customer en Stripe
    try {
      await stripe.paymentMethods.detach(card.stripePaymentMethodId);
    } catch (error) {
      console.error('Error al desasociar Payment Method en Stripe:', error);
      // Continuar con la eliminación en la BD aunque falle en Stripe
    }

    // Marcar como inactiva en lugar de eliminar
    card.isActive = false;
    await card.save();

    return res.status(200).json({ message: 'Tarjeta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar tarjeta:', error);
    return res.status(500).json({ message: 'Error al eliminar tarjeta' });
  }
};

/**
 * Establecer una tarjeta como predeterminada
 */
export const setDefaultCard = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticada' });
    }

    const card = await SavedCard.findOne({ _id: cardId, userId, isActive: true });
    
    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }

    // Desmarcar todas las tarjetas como predeterminadas
    await SavedCard.updateMany(
      { userId, isActive: true },
      { $set: { isDefault: false } }
    );

    // Marcar esta tarjeta como predeterminada
    card.isDefault = true;
    await card.save();

    return res.status(200).json({ message: 'Tarjeta predeterminada actualizada', card });
  } catch (error) {
    console.error('Error al establecer tarjeta predeterminada:', error);
    return res.status(500).json({ message: 'Error al actualizar tarjeta predeterminada' });
  }
};

/**
 * Procesar un pago con una tarjeta guardada
 */
export const payWithSavedCard = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
  }
  
  try {
    const userId = req.userId || req.user?.id;
    const { appointmentId, cardId, amount } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!appointmentId || !cardId || !amount) {
      return res.status(400).json({ message: 'appointmentId, cardId y amount son requeridos' });
    }

    // Obtener la tarjeta guardada
    const card = await SavedCard.findOne({ _id: cardId, userId, isActive: true });
    
    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }

    // Crear Payment Intent con la tarjeta guardada
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency: 'clp',
      customer: card.stripeCustomerId,
      payment_method: card.stripePaymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment-success`,
      metadata: {
        userId: userId.toString(),
        appointmentId: appointmentId.toString(),
        cardId: cardId.toString()
      }
    });

    if (paymentIntent.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        message: 'Pago procesado exitosamente',
        paymentIntentId: paymentIntent.id
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'El pago no pudo ser procesado',
        status: paymentIntent.status
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

