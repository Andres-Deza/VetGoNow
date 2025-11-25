import express from 'express';
import { protect } from '../middleware/authmiddleware.js';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/addressController.js';

const addressRouter = express.Router();

addressRouter.route('/')
  .get(protect, getUserAddresses)
  .post(protect, createAddress);

addressRouter.route('/:id')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

addressRouter.route('/:id/default')
  .put(protect, setDefaultAddress);

export default addressRouter;

