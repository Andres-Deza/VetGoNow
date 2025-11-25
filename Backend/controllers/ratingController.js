import Rating from '../models/Rating.js';
import Appointment from '../models/Appointment.js';
import Vet from '../models/Veterinarian.js';

// Crear o actualizar calificación
export const createOrUpdateRating = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rating, comment, categories } = req.body;
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
    }

    // Verificar que la cita existe y pertenece al usuario
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    if (appointment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No tienes permiso para calificar esta cita' });
    }

    // Verificar que la cita está completada
    if (appointment.status !== 'completed' && appointment.tracking?.status !== 'completed') {
      return res.status(400).json({ message: 'Solo puedes calificar citas completadas' });
    }

    // Crear o actualizar la calificación
    const ratingData = {
      appointmentId,
      userId,
      vetId: appointment.vetId,
      petId: appointment.petId,
      rating,
      comment: comment || '',
      categories: categories || {},
      isEmergency: appointment.isEmergency || false
    };

    const existingRating = await Rating.findOne({ appointmentId });
    
    // NO permitir modificar calificaciones existentes
    if (existingRating) {
      return res.status(400).json({ 
        message: 'Esta cita ya fue calificada y no se puede modificar' 
      });
    }

    // Crear nueva calificación
    const savedRating = await Rating.create(ratingData);

    // Actualizar estadísticas del veterinario
    await updateVetRatings(appointment.vetId);

    res.json({
      success: true,
      message: existingRating ? 'Calificación actualizada' : 'Calificación creada',
      rating: savedRating
    });
  } catch (error) {
    console.error('Error creating/updating rating:', error);
    res.status(500).json({ message: 'Error al guardar la calificación', error: error.message });
  }
};

// Obtener calificaciones de un veterinario
export const getVetRatings = async (req, res) => {
  try {
    const { vetId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const ratings = await Rating.find({ vetId })
      .populate('userId', 'name image')
      .populate('petId', 'name image')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Rating.countDocuments({ vetId });

    res.json({
      success: true,
      ratings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching vet ratings:', error);
    res.status(500).json({ message: 'Error al obtener calificaciones', error: error.message });
  }
};

// Obtener calificación de una cita específica
export const getAppointmentRating = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const rating = await Rating.findOne({ appointmentId })
      .populate('userId', 'name image')
      .populate('vetId', 'name profileImage');

    if (!rating) {
      return res.status(404).json({ message: 'No hay calificación para esta cita' });
    }

    // Verificar que el usuario tiene acceso
    if (rating.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No tienes permiso para ver esta calificación' });
    }

    res.json({
      success: true,
      rating
    });
  } catch (error) {
    console.error('Error fetching appointment rating:', error);
    res.status(500).json({ message: 'Error al obtener la calificación', error: error.message });
  }
};

// Función helper para actualizar estadísticas del veterinario
const updateVetRatings = async (vetId) => {
  try {
    const ratings = await Rating.find({ vetId });
    const total = ratings.length;
    
    // Si no hay calificaciones o hay menos de 5, no mostrar promedio
    if (total === 0) {
      await Vet.findByIdAndUpdate(vetId, {
        'ratings.average': 0,
        'ratings.total': 0,
        'ratings.showAverage': false, // Flag para indicar si mostrar promedio
        'ratings.breakdown': {
          punctuality: 0,
          professionalism: 0,
          communication: 0,
          care: 0
        }
      });
      return;
    }

    // Solo calcular promedio si hay 5 o más calificaciones
    const showAverage = total >= 5;
    let average = 0;

    if (showAverage) {
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      average = Math.round((sum / total) * 10) / 10; // Redondear a 1 decimal
    }

    // Calcular promedios por categoría (solo si hay 5 o más calificaciones con categorías)
    const categoriesWithValues = ratings.filter(r => r.categories && Object.values(r.categories).some(v => v > 0));
    const breakdown = {
      punctuality: 0,
      professionalism: 0,
      communication: 0,
      care: 0
    };

    if (showAverage && categoriesWithValues.length >= 5) {
      categoriesWithValues.forEach(r => {
        if (r.categories.punctuality) breakdown.punctuality += r.categories.punctuality;
        if (r.categories.professionalism) breakdown.professionalism += r.categories.professionalism;
        if (r.categories.communication) breakdown.communication += r.categories.communication;
        if (r.categories.care) breakdown.care += r.categories.care;
      });

      const count = categoriesWithValues.length;
      if (count > 0) {
        breakdown.punctuality = Math.round((breakdown.punctuality / count) * 10) / 10;
        breakdown.professionalism = Math.round((breakdown.professionalism / count) * 10) / 10;
        breakdown.communication = Math.round((breakdown.communication / count) * 10) / 10;
        breakdown.care = Math.round((breakdown.care / count) * 10) / 10;
      }
    }

    await Vet.findByIdAndUpdate(vetId, {
      'ratings.average': average,
      'ratings.total': total,
      'ratings.showAverage': showAverage, // Flag para indicar si mostrar promedio
      'ratings.breakdown': breakdown
    });
  } catch (error) {
    console.error('Error updating vet ratings:', error);
  }
};

