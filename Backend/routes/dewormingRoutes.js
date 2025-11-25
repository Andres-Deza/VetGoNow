import express from 'express';
import { protect } from '../middleware/authmiddleware.js';
import {
  getPetDewormings,
  createDeworming,
  updateDeworming,
  deleteDeworming
} from '../controllers/dewormingController.js';

const dewormingRouter = express.Router();

// Todas las rutas requieren autenticación
dewormingRouter.get('/pet/:petId', protect, getPetDewormings);
dewormingRouter.post('/pet/:petId', protect, createDeworming);
dewormingRouter.put('/:dewormingId', protect, updateDeworming);
dewormingRouter.delete('/:dewormingId', protect, deleteDeworming);

export default dewormingRouter;

