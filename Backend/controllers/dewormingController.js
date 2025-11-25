import Deworming from '../models/Deworming.js';
import Pet from '../models/Pet.js';
import mongoose from 'mongoose';

/**
 * Obtener todas las desparasitaciones de una mascota
 */
export const getPetDewormings = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user?.id || req.userId;

    const dewormings = await Deworming.find({ petId, userId }).sort({ applicationDate: -1 });

    res.json({
      success: true,
      data: dewormings
    });
  } catch (error) {
    console.error('Error al obtener desparasitaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las desparasitaciones',
      error: error.message
    });
  }
};

/**
 * Crear una nueva desparasitación (manual o asociada a cita)
 */
export const createDeworming = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user?.id || req.userId;
    const {
      name,
      type,
      applicationDate,
      nextApplicationDate,
      productName,
      activeIngredient,
      dosage,
      vetId,
      vetName,
      notes,
      appointmentId
    } = req.body;

    // Validar que la mascota existe y pertenece al usuario
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    if (pet.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para agregar desparasitaciones a esta mascota'
      });
    }

    // Crear desparasitación
    const deworming = new Deworming({
      petId,
      userId,
      name,
      type,
      applicationDate: new Date(applicationDate),
      nextApplicationDate: nextApplicationDate ? new Date(nextApplicationDate) : null,
      productName: productName || null,
      activeIngredient: activeIngredient || null,
      dosage: dosage || null,
      vetId: vetId ? new mongoose.Types.ObjectId(vetId) : null,
      vetName: vetName || null,
      notes: notes || null,
      appointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : null,
      isUpToDate: true
    });

    await deworming.save();

    res.status(201).json({
      success: true,
      data: deworming,
      message: 'Desparasitación registrada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear desparasitación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la desparasitación',
      error: error.message
    });
  }
};

/**
 * Actualizar una desparasitación existente
 */
export const updateDeworming = async (req, res) => {
  try {
    const { dewormingId } = req.params;
    const userId = req.user?.id || req.userId;
    const {
      name,
      type,
      applicationDate,
      nextApplicationDate,
      productName,
      activeIngredient,
      dosage,
      vetId,
      vetName,
      notes
    } = req.body;

    // Validar que la desparasitación existe y pertenece al usuario
    const deworming = await Deworming.findById(dewormingId);
    if (!deworming) {
      return res.status(404).json({
        success: false,
        message: 'Desparasitación no encontrada'
      });
    }

    if (deworming.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar esta desparasitación'
      });
    }

    // Actualizar campos
    if (name) deworming.name = name;
    if (type) deworming.type = type;
    if (applicationDate) deworming.applicationDate = new Date(applicationDate);
    if (nextApplicationDate !== undefined) {
      deworming.nextApplicationDate = nextApplicationDate ? new Date(nextApplicationDate) : null;
    }
    if (productName !== undefined) deworming.productName = productName || null;
    if (activeIngredient !== undefined) deworming.activeIngredient = activeIngredient || null;
    if (dosage !== undefined) deworming.dosage = dosage || null;
    if (vetId !== undefined) deworming.vetId = vetId ? new mongoose.Types.ObjectId(vetId) : null;
    if (vetName !== undefined) deworming.vetName = vetName || null;
    if (notes !== undefined) deworming.notes = notes || null;

    await deworming.save();

    res.json({
      success: true,
      data: deworming,
      message: 'Desparasitación actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar desparasitación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la desparasitación',
      error: error.message
    });
  }
};

/**
 * Eliminar una desparasitación
 */
export const deleteDeworming = async (req, res) => {
  try {
    const { dewormingId } = req.params;
    const userId = req.user?.id || req.userId;

    const deworming = await Deworming.findById(dewormingId);
    if (!deworming) {
      return res.status(404).json({
        success: false,
        message: 'Desparasitación no encontrada'
      });
    }

    if (deworming.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta desparasitación'
      });
    }

    await Deworming.findByIdAndDelete(dewormingId);

    res.json({
      success: true,
      message: 'Desparasitación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar desparasitación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la desparasitación',
      error: error.message
    });
  }
};
