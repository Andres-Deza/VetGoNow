import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

export default function setupVideoCallSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('register-user', ({ userId }) => {
      if (userId) {
        socket.join(userId);
        console.log(`👤 Registered user ${userId} on socket ${socket.id}`);
      } else {
        console.warn('⚠️ No userId provided for register-user');
      }
    });

    socket.on('join-room', async ({ actualApptId, userId }) => {
      if (!actualApptId || actualApptId === ':appointmentId') {
        console.warn(`⚠️ Invalid appointmentId: ${actualApptId}`);
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(actualApptId)) {
        console.warn(`⚠️ Invalid ObjectId format: ${actualApptId}`);
        return;
      }

      try {
        const appointment = await Appointment.findById(actualApptId);
        if (!appointment) {
          console.warn(`⚠️ Appointment not found: ${actualApptId}`);
          return;
        }

        socket.join(actualApptId);
        console.log(`➡️ Socket ${socket.id} (user ${userId}) joined room: ${actualApptId}`);
      } catch (error) {
        console.error(`❌ Error in join-room for appointment ${actualApptId}:`, error);
      }
    });

    socket.on('invite-call', ({ userId, appointmentId }) => {
      if (!userId || !appointmentId) {
        console.warn('⚠️ Missing userId or appointmentId in invite-call');
        return;
      }
      io.to(userId).emit('call-invitation', { userId, appointmentId });
      console.log(`📨 Sending invitation to user ${userId} for appointment ${appointmentId}`);
    });

    socket.on('send-offer', ({ offer, appointmentId }) => {
      console.log(`📤 Broadcasting offer to room ${appointmentId}`);
      socket.to(appointmentId).emit('receive-offer', { offer, appointmentId });
    });

    socket.on('send-answer', (answer, appointmentId) => {
      console.log('Server received answer:');
      console.log('Server received appointmentId:', appointmentId);
      socket.to(appointmentId).emit('receive-answer', answer);
    });

    socket.on('send ice-candidate', (candidate, appointmentId) => {
      console.log('Server received candidate:');
      console.log('Server received appointmentId:', appointmentId);
      socket.to(appointmentId).emit('receive ice-candidate', candidate);
    });



    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
}