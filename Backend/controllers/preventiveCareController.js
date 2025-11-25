import mongoose from 'mongoose';
import Vaccine from '../models/Vaccine.js';
import Deworming from '../models/Deworming.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Reminder from '../models/Reminder.js';
import Pet from '../models/Pet.js';
import Appointment from '../models/Appointment.js';
import Prescribe from '../models/Prescription.js';
import { generatePreventiveCareRecommendations, generateFriendlyReminderText } from '../services/geminiService.js';
import { 
  generatePreventiveCareCalendar, 
  calculateRecommendedVaccines, 
  calculateIdealWeight 
} from '../services/preventiveCareRules.js';

/**
 * Obtiene el resumen completo del asistente de cuidado preventivo para una mascota
 */
export const getPreventiveCareSummary = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    // Convertir userId a ObjectId de Mongoose si es necesario
    const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    // Obtener mascota usando el mismo patrón que en otras consultas
    const pet = await Pet.findOne({ 
      _id: petId, 
      userId: userIdObjectId,
      isDeleted: { $ne: true }
    });
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Mascota no encontrada' });
    }

    // Obtener historial completo
    const [vaccines, dewormings, medicalRecords, appointments] = await Promise.all([
      Vaccine.find({ petId, userId: userIdObjectId }).sort({ applicationDate: -1 }),
      Deworming.find({ petId, userId: userIdObjectId }).sort({ applicationDate: -1 }),
      MedicalRecord.find({ petId, userId: userIdObjectId }).sort({ date: -1 }),
      Appointment.find({ petId, userId: userIdObjectId, status: 'completed' }).sort({ appointmentDate: -1 }).limit(10)
    ]);

    // Obtener prescripciones de las citas completadas
    const appointmentIds = appointments.map(a => a._id);
    const prescriptions = await Prescribe.find({ appointmentId: { $in: appointmentIds } });

    // Obtener recordatorios pendientes
    const pendingReminders = await Reminder.find({
      petId,
      userId,
      status: 'pending',
      dueDate: { $gte: new Date() }
    }).sort({ dueDate: 1 });

    // Generar calendario preventivo (operación rápida, sin IA)
    const preventiveCalendar = generatePreventiveCareCalendar(pet, vaccines, dewormings, medicalRecords);

    // Calcular peso ideal (operación rápida, sin IA)
    // Removido peso ideal - puede desinformar si no se calcula con certeza
    const weightAnalysis = {
      currentWeight: pet.weight || null,
      weightStatus: pet.weight ? 'registrado' : 'no_registrado'
    };

    // NOTA: Las recomendaciones de IA se obtienen en el endpoint separado /recommendations/pet/:petId
    // para no ralentizar el summary. Si se necesitan recomendaciones, usar ese endpoint específico.

    res.json({
      success: true,
      data: {
        pet: {
          _id: pet._id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          ageYears: pet.ageYears,
          ageMonths: pet.ageMonths,
          weight: pet.weight,
          gender: pet.gender,
          birthDate: pet.birthDate
        },
        summary: {
          totalVaccines: vaccines.length,
          totalDewormings: dewormings.length,
          totalMedicalRecords: medicalRecords.length,
          totalAppointments: appointments.length
        },
        vaccines: vaccines.slice(0, 5), // Últimas 5
        dewormings: dewormings.slice(0, 5), // Últimas 5
        medicalRecords: medicalRecords.slice(0, 5), // Últimos 5
        preventiveCalendar,
        weightAnalysis,
        pendingReminders: pendingReminders.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de cuidado preventivo:', error);
    res.status(500).json({ success: false, message: 'Error al obtener información', error: error.message });
  }
};

/**
 * Genera recomendaciones específicas (vacunas, nutrición, peso)
 */
export const getRecommendations = async (req, res) => {
  try {
    console.log('getRecommendations llamado - req.params:', req.params, 'req.query:', req.query);
    console.log('req.user:', req.user, 'req.userId:', req.userId);
    
    const { petId } = req.params;
    const { context } = req.query; // 'vaccines', 'nutrition', 'weight', 'general'
    const userId = req.user?.id || req.userId;

    if (!userId) {
      console.log('No userId encontrado en getRecommendations');
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    
    console.log('Buscando recomendaciones para petId:', petId, 'userId:', userId, 'context:', context);

    // Convertir userId a ObjectId de Mongoose si es necesario
    const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    const pet = await Pet.findOne({ 
      _id: petId, 
      userId: userIdObjectId,
      isDeleted: { $ne: true }
    });
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Mascota no encontrada' });
    }

    const [vaccines, dewormings, medicalRecords] = await Promise.all([
      Vaccine.find({ petId, userId: userIdObjectId }).sort({ applicationDate: -1 }),
      Deworming.find({ petId, userId: userIdObjectId }).sort({ applicationDate: -1 }),
      MedicalRecord.find({ petId, userId: userIdObjectId }).sort({ date: -1 })
    ]);

    console.log('Historial encontrado - Vacunas:', vaccines.length, 'Desparasitaciones:', dewormings.length, 'Registros médicos:', medicalRecords.length);
    console.log('Datos de la mascota:', {
      name: pet?.name,
      species: pet?.species,
      breed: pet?.breed,
      ageYears: pet?.ageYears,
      ageMonths: pet?.ageMonths,
      weight: pet?.weight,
      gender: pet?.gender
    });

    // Convertir todos los datos a objetos planos para evitar problemas con documentos de Mongoose
    let petData;
    try {
      petData = pet && typeof pet === 'object' 
        ? (pet.toObject ? pet.toObject() : pet)
        : {};
      console.log('petData convertido correctamente');
    } catch (error) {
      console.error('Error al convertir petData:', error);
      petData = {};
    }

    const vaccinesData = Array.isArray(vaccines) 
      ? vaccines.map(v => {
          try {
            return v && typeof v === 'object' ? (v.toObject ? v.toObject() : v) : {};
          } catch (e) {
            console.warn('Error convirtiendo vacuna:', e);
            return {};
          }
        })
      : [];
    
    const dewormingsData = Array.isArray(dewormings)
      ? dewormings.map(d => {
          try {
            return d && typeof d === 'object' ? (d.toObject ? d.toObject() : d) : {};
          } catch (e) {
            console.warn('Error convirtiendo desparasitación:', e);
            return {};
          }
        })
      : [];
    
    const medicalRecordsData = Array.isArray(medicalRecords)
      ? medicalRecords.map(r => {
          try {
            return r && typeof r === 'object' ? (r.toObject ? r.toObject() : r) : {};
          } catch (e) {
            console.warn('Error convirtiendo registro médico:', e);
            return {};
          }
        })
      : [];

    console.log('Llamando a generatePreventiveCareRecommendations con context:', context || 'general');
    
    const recommendations = await generatePreventiveCareRecommendations(
      petData,
      vaccinesData,
      dewormingsData,
      medicalRecordsData,
      context || 'general'
    );
    
    console.log('Recomendaciones generadas, success:', recommendations.success);
    console.log('Mensaje de recomendaciones:', recommendations.message);

    if (recommendations.success) {
      res.json({
        success: true,
        data: recommendations.data
      });
    } else {
      // Si el error es que la API no está configurada, retornar 503 (Service Unavailable)
      // en lugar de 500 (Internal Server Error)
      const statusCode = recommendations.message?.includes('no disponible') || 
                         recommendations.message?.includes('GEMINI_API_KEY') 
                         ? 503 
                         : 500;
      
      res.status(statusCode).json({
        success: false,
        message: recommendations.message || 'Error al generar recomendaciones',
        code: recommendations.message?.includes('no disponible') ? 'SERVICE_UNAVAILABLE' : 'GENERATION_ERROR'
      });
    }
  } catch (error) {
    console.error('Error al generar recomendaciones:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      petId: req.params?.petId,
      userId: req.user?.id || req.userId
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar recomendaciones', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Obtiene el calendario de cuidado preventivo
 */
export const getPreventiveCalendar = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    // Convertir userId a ObjectId de Mongoose si es necesario
    const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    const pet = await Pet.findOne({ 
      _id: petId, 
      userId: userIdObjectId,
      isDeleted: { $ne: true }
    });
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Mascota no encontrada' });
    }

    const [vaccines, dewormings, medicalRecords] = await Promise.all([
      Vaccine.find({ petId, userId: userIdObjectId }).sort({ applicationDate: -1 }),
      Deworming.find({ petId, userId: userIdObjectId }).sort({ applicationDate: -1 }),
      MedicalRecord.find({ petId, userId: userIdObjectId }).sort({ date: -1 })
    ]);

    const calendar = generatePreventiveCareCalendar(pet, vaccines, dewormings, medicalRecords);

    res.json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error al obtener calendario preventivo:', error);
    res.status(500).json({ success: false, message: 'Error al obtener calendario', error: error.message });
  }
};

/**
 * Obtiene todas las mascotas del usuario con resumen de cuidado preventivo
 */
export const getAllPetsSummary = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId || req.user?._id;

    if (!userId) {
      console.log('No userId encontrado. req.user:', req.user);
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    console.log('Buscando mascotas para userId:', userId, 'tipo:', typeof userId);
    
    // Convertir userId a ObjectId de Mongoose (mismo patrón que getPetsByUserId)
    let userIdObjectId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userIdObjectId = new mongoose.Types.ObjectId(userId);
    } else {
      console.warn('userId no es un ObjectId válido, usando como string:', userId);
      userIdObjectId = userId;
    }
    
    // Buscar mascotas - intentar con ObjectId primero, luego con string si no hay resultados
    let pets = await Pet.find({ 
      userId: userIdObjectId,
      isDeleted: { $ne: true }
    });
    
    // Si no se encontraron mascotas con ObjectId, intentar con string (para compatibilidad)
    if (pets.length === 0 && mongoose.Types.ObjectId.isValid(userId)) {
      console.log('No se encontraron mascotas con ObjectId, intentando con string...');
      pets = await Pet.find({ 
        userId: userId,
        isDeleted: { $ne: true }
      });
    }
    
    console.log(`Encontradas ${pets.length} mascotas para el usuario ${userId}`);

    const petsWithSummary = await Promise.all(
      pets.map(async (pet) => {
        const [vaccines, dewormings, pendingReminders] = await Promise.all([
          Vaccine.find({ petId: pet._id, userId }),
          Deworming.find({ petId: pet._id, userId }),
          Reminder.find({ petId: pet._id, userId, status: 'pending' }).countDocuments()
        ]);

        // Verificar vacunas vencidas o próximas a vencer
        const expiredVaccines = vaccines.filter(v => {
          if (!v.expirationDate) return false;
          return new Date(v.expirationDate) < new Date();
        });

        const upcomingVaccines = vaccines.filter(v => {
          if (!v.expirationDate) return false;
          const daysUntilExpiry = Math.floor((new Date(v.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
        });

        return {
          _id: pet._id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          image: pet.image,
          vaccinesCount: vaccines.length,
          dewormingsCount: dewormings.length,
          pendingRemindersCount: pendingReminders,
          alerts: {
            expiredVaccines: expiredVaccines.length,
            upcomingVaccines: upcomingVaccines.length
          }
        };
      })
    );

    res.json({
      success: true,
      data: petsWithSummary
    });
  } catch (error) {
    console.error('Error al obtener resumen de mascotas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener información', error: error.message });
  }
};

