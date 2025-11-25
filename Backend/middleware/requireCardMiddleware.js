// Middleware para verificar que el usuario tenga al menos una tarjeta guardada
import SavedCard from '../models/SavedCard.js';

export const requireCard = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    // Verificar si el usuario tiene al menos una tarjeta activa
    const hasCard = await SavedCard.findOne({
      userId,
      isActive: true,
      provider: 'mercadopago'
    });

    if (!hasCard) {
      return res.status(400).json({
        success: false,
        message: 'Debes tener al menos una tarjeta guardada para realizar pagos. Por favor, agrega una tarjeta en la sección de configuración.',
        code: 'NO_CARD_SAVED'
      });
    }

    next();
  } catch (error) {
    console.error('Error en requireCard middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar tarjetas guardadas'
    });
  }
};

export default requireCard;

