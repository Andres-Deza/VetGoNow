import express from 'express';
import { authenticate } from '../middleware/authmiddleware.js';
import {
  getPreventiveCareSummary,
  getRecommendations,
  getPreventiveCalendar,
  getAllPetsSummary
} from '../controllers/preventiveCareController.js';
import {
  createVaccine,
  getPetVaccines,
  updateVaccine,
  deleteVaccine
} from '../controllers/vaccineController.js';
import {
  createDeworming,
  getPetDewormings,
  updateDeworming,
  deleteDeworming
} from '../controllers/dewormingController.js';

const preventiveCareRouter = express.Router();

// Middleware de logging para debug
preventiveCareRouter.use((req, res, next) => {
  console.log(`[PreventiveCare] ${req.method} ${req.path}`);
  next();
});

// Todas las rutas requieren autenticación
preventiveCareRouter.use(authenticate);

// Rutas de resumen y recomendaciones
preventiveCareRouter.get('/summary/pets', getAllPetsSummary);
preventiveCareRouter.get('/summary/pet/:petId', getPreventiveCareSummary);
preventiveCareRouter.get('/recommendations/pet/:petId', getRecommendations);
preventiveCareRouter.get('/calendar/pet/:petId', getPreventiveCalendar);

// Rutas de vacunas
preventiveCareRouter.post('/pet/:petId/vaccines', createVaccine);
preventiveCareRouter.get('/pet/:petId/vaccines', getPetVaccines);
preventiveCareRouter.put('/vaccines/:vaccineId', updateVaccine);
preventiveCareRouter.delete('/vaccines/:vaccineId', deleteVaccine);

// Rutas de desparasitaciones
preventiveCareRouter.post('/pet/:petId/dewormings', createDeworming);
preventiveCareRouter.get('/pet/:petId/dewormings', getPetDewormings);
preventiveCareRouter.put('/dewormings/:dewormingId', updateDeworming);
preventiveCareRouter.delete('/dewormings/:dewormingId', deleteDeworming);

export default preventiveCareRouter;

