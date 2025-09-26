// routes/appointmentRoutes.js
import express from 'express';
import mongoose from 'mongoose';
import {
  createAppointment,
  getAppointmentsForUser,
  updateAppointmentStatus,
  getAppointmentsByVetId,
  getAppointmentById,
  getPetById,
  getUserById,
  getBookedTimes,
  getAllAppointments
} from '../controllers/appointmentController.js';
import {
  upsertPrescription,
  getPrescriptionByAppointmentId
} from '../controllers/prescriptionController.js';
import { authenticate } from '../middleware/authmiddleware.js';
import { io } from '../index.js'; // Access io from index.js

const appointmentRouter = express.Router();
export const pendingInvitations = new Map(); // Store { appointmentId: userId }

// Create an appointment
appointmentRouter.post('/create', createAppointment);

// Get all appointments for a user
appointmentRouter.get('/users/:userId', authenticate, getAppointmentsForUser);

// Get appointments for a vet
appointmentRouter.get('/vets/:vetId', getAppointmentsByVetId);

// Update appointment status
appointmentRouter.put('/:appointmentId/status', updateAppointmentStatus);

// Upsert prescription for an appointment
appointmentRouter.put('/:appointmentId/prescription', upsertPrescription);

// Get appointment by ID
appointmentRouter.get('/:id', getAppointmentById);

// Get prescription form by appointment ID
appointmentRouter.get('/:appointmentId/prescriptionform', getPrescriptionByAppointmentId);

// Get pet by ID
appointmentRouter.get('/pets/:id', getPetById);

// Get user info by ID
appointmentRouter.get('/userinfo/:id', getUserById);

// Get booked time slots for a vet on a specific date
appointmentRouter.get('/booked-times/:vetId/:date', getBookedTimes);

// Check for invitation
appointmentRouter.get('/:appointmentId/invitation', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: 'Invalid appointment ID' });
    }

    const Appointment = mongoose.model('Appointment');
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const invited = io.checkInvitation(appointmentId);
    console.log(`🔍 Polled invitation for appointment ${appointmentId}: ${invited}`);
    res.status(200).json({ invited });
  } catch (err) {
    console.error(`❌ Error checking invitation for appointment ${req.params.appointmentId}:`, err);
    res.status(500).json({ message: 'Failed to check invitation' });
  }
});

//get all appointments to show in admin
appointmentRouter.get('/allappointments/fetching',getAllAppointments)

export default appointmentRouter;