// routes/appointmentRoutes.js
import express from 'express';
import mongoose from 'mongoose';
import {
  createAppointment,
  getAppointmentsForUser,
  updateAppointmentStatus,
  updateTrackingStatus,
  getAppointmentsByVetId,
  getAppointmentById,
  getPetById,
  getUserById,
  getBookedTimes,
  getAllAppointments,
  getVetSchedule,
  blockTimeSlot,
  unblockTimeSlot,
  unblockMultipleSlots,
  getBlockedSlots,
  cancelAppointmentByVet,
  rejectEmergency,
  reportEmergencyIncident,
  getUnratedCompletedAppointments,
  markRatingReminderShown,
  estimateAppointmentPricing
} from '../controllers/appointmentController.js';
import {
  upsertPrescription,
  getPrescriptionByAppointmentId
} from '../controllers/prescriptionController.js';
import { authenticate, protect } from '../middleware/authmiddleware.js';
import { io } from '../index.js'; // Access io from index.js

const appointmentRouter = express.Router();
export const pendingInvitations = new Map(); // Store { appointmentId: userId }

// Create an appointment
appointmentRouter.post('/create', createAppointment);

// Estimate appointment pricing
appointmentRouter.post('/estimate-pricing', authenticate, estimateAppointmentPricing);

// Get all appointments for a user
appointmentRouter.get('/users/:userId', authenticate, getAppointmentsForUser);

// Get appointments for a vet
appointmentRouter.get('/vets/:vetId', getAppointmentsByVetId);

// Rating reminder endpoints (debe ir ANTES de las rutas con parámetros dinámicos)
appointmentRouter.get('/unrated-completed', protect, getUnratedCompletedAppointments);

// Update appointment status
appointmentRouter.put('/:appointmentId/status', updateAppointmentStatus);

// Update emergency tracking status
appointmentRouter.put('/:appointmentId/tracking-status', protect, updateTrackingStatus);

// Upsert prescription for an appointment
appointmentRouter.put('/:appointmentId/prescription', upsertPrescription);

// Get appointment by ID
appointmentRouter.get('/:id', getAppointmentById);

// Get prescription form by appointment ID
appointmentRouter.get('/:appointmentId/prescriptionform', getPrescriptionByAppointmentId);

// Get pet by ID (requires authentication and ownership/relationship verification)
appointmentRouter.get('/pets/:id', protect, getPetById);

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
    console.log(`Polled invitation for appointment ${appointmentId}: ${invited}`);
    res.status(200).json({ invited });
  } catch (err) {
    console.error(`Error checking invitation for appointment ${req.params.appointmentId}:`, err);
    res.status(500).json({ message: 'Failed to check invitation' });
  }
});

//get all appointments to show in admin
appointmentRouter.get('/allappointments/fetching',getAllAppointments)

// Schedule management endpoints
appointmentRouter.get('/schedule/:vetId', protect, getVetSchedule);
appointmentRouter.post('/schedule/:vetId/block', protect, blockTimeSlot);
appointmentRouter.delete('/schedule/block/:slotId', protect, unblockTimeSlot);
appointmentRouter.post('/schedule/:vetId/unblock-multiple', protect, unblockMultipleSlots);
appointmentRouter.get('/schedule/:vetId/blocked', protect, getBlockedSlots);

// Cancel appointment by vet (with time windows and penalties)
appointmentRouter.post('/:appointmentId/cancel-by-vet', protect, cancelAppointmentByVet);

// Emergency-specific endpoints
appointmentRouter.post('/:appointmentId/reject-emergency', protect, rejectEmergency);
appointmentRouter.post('/:appointmentId/report-incident', protect, reportEmergencyIncident);

// Rating reminder endpoint (el GET ya está arriba)
appointmentRouter.put('/:appointmentId/rating-reminder-shown', protect, markRatingReminderShown);

export default appointmentRouter;