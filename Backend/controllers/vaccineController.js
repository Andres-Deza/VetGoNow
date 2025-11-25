import Vaccine from '../models/Vaccine.js';
import Pet from '../models/Pet.js';
import mongoose from 'mongoose';

/**
 * Obtener todas las vacunas de una mascota
 */
export const getPetVaccines = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user?.id || req.userId;

    const vaccines = await Vaccine.find({ petId, userId }).sort({ applicationDate: -1 });

    res.json({
      success: true,
      data: vaccines
    });
  } catch (error) {
    console.error('Error al obtener vacunas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las vacunas',
      error: error.message
    });
  }
};

/**
 * Crear una nueva vacuna (manual o asociada a cita)
 */
export const createVaccine = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user?.id || req.userId;
    const {
      name,
      type,
      applicationDate,
      expirationDate,
      vetId,
      vetName,
      batchNumber,
      manufacturer,
      nextDoseDate,
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
        message: 'No tienes permiso para agregar vacunas a esta mascota'
      });
    }

    // Crear vacuna
    const vaccine = new Vaccine({
      petId,
      userId,
      name,
      type,
      applicationDate: new Date(applicationDate),
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      vetId: vetId ? new mongoose.Types.ObjectId(vetId) : null,
      vetName: vetName || null,
      batchNumber: batchNumber || null,
      manufacturer: manufacturer || null,
      nextDoseDate: nextDoseDate ? new Date(nextDoseDate) : null,
      notes: notes || null,
      appointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : null,
      isUpToDate: !expirationDate || new Date(expirationDate) > new Date(),
      isExpired: expirationDate ? new Date(expirationDate) < new Date() : false
    });

    await vaccine.save();

    res.status(201).json({
      success: true,
      data: vaccine,
      message: 'Vacuna registrada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear vacuna:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la vacuna',
      error: error.message
    });
  }
};

/**
 * Actualizar una vacuna existente
 */
export const updateVaccine = async (req, res) => {
  try {
    const { vaccineId } = req.params;
    const userId = req.user?.id || req.userId;
    const {
      name,
      type,
      applicationDate,
      expirationDate,
      vetId,
      vetName,
      batchNumber,
      manufacturer,
      nextDoseDate,
      notes
    } = req.body;

    // Validar que la vacuna existe y pertenece al usuario
    const vaccine = await Vaccine.findById(vaccineId);
    if (!vaccine) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }

    if (vaccine.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar esta vacuna'
      });
    }

    // Actualizar campos
    if (name) vaccine.name = name;
    if (type) vaccine.type = type;
    if (applicationDate) vaccine.applicationDate = new Date(applicationDate);
    if (expirationDate !== undefined) {
      vaccine.expirationDate = expirationDate ? new Date(expirationDate) : null;
      vaccine.isExpired = expirationDate ? new Date(expirationDate) < new Date() : false;
      vaccine.isUpToDate = !expirationDate || new Date(expirationDate) > new Date();
    }
    if (vetId !== undefined) vaccine.vetId = vetId ? new mongoose.Types.ObjectId(vetId) : null;
    if (vetName !== undefined) vaccine.vetName = vetName || null;
    if (batchNumber !== undefined) vaccine.batchNumber = batchNumber || null;
    if (manufacturer !== undefined) vaccine.manufacturer = manufacturer || null;
    if (nextDoseDate !== undefined) vaccine.nextDoseDate = nextDoseDate ? new Date(nextDoseDate) : null;
    if (notes !== undefined) vaccine.notes = notes || null;

    await vaccine.save();

    res.json({
      success: true,
      data: vaccine,
      message: 'Vacuna actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar vacuna:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la vacuna',
      error: error.message
    });
  }
};

/**
 * Eliminar una vacuna
 */
export const deleteVaccine = async (req, res) => {
  try {
    const { vaccineId } = req.params;
    const userId = req.user?.id || req.userId;

    const vaccine = await Vaccine.findById(vaccineId);
    if (!vaccine) {
      return res.status(404).json({
        success: false,
        message: 'Vacuna no encontrada'
      });
    }

    if (vaccine.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta vacuna'
      });
    }

    await Vaccine.findByIdAndDelete(vaccineId);

    res.json({
      success: true,
      message: 'Vacuna eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar vacuna:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la vacuna',
      error: error.message
    });
  }
};
