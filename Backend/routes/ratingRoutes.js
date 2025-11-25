import express from 'express';
import { authenticate } from '../middleware/authmiddleware.js';
import {
  createOrUpdateRating,
  getVetRatings,
  getAppointmentRating
} from '../controllers/ratingController.js';

const ratingRouter = express.Router();

// Crear o actualizar calificación (requiere autenticación)
ratingRouter.post('/appointment/:appointmentId', authenticate, createOrUpdateRating);

// Obtener calificaciones de un veterinario (público)
ratingRouter.get('/vet/:vetId', getVetRatings);

// Obtener calificación de una cita específica (requiere autenticación)
ratingRouter.get('/appointment/:appointmentId', authenticate, getAppointmentRating);

export default ratingRouter;

