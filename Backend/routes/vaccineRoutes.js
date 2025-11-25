import express from 'express';
import { protect } from '../middleware/authmiddleware.js';
import {
  getPetVaccines,
  createVaccine,
  updateVaccine,
  deleteVaccine
} from '../controllers/vaccineController.js';

const vaccineRouter = express.Router();

// Todas las rutas requieren autenticación
vaccineRouter.get('/pet/:petId', protect, getPetVaccines);
vaccineRouter.post('/pet/:petId', protect, createVaccine);
vaccineRouter.put('/:vaccineId', protect, updateVaccine);
vaccineRouter.delete('/:vaccineId', protect, deleteVaccine);

export default vaccineRouter;

