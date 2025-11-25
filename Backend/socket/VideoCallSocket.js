import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';

export default function setupVideoCallSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('register-user', ({ userId }) => {
      if (userId) {
        socket.join(userId);
        console.log(`Registered user ${userId} on socket ${socket.id}`);
      } else {
        console.warn('No userId provided for register-user');
      }
    });

    socket.on('join-room', async ({ actualApptId, userId }) => {
      if (!actualApptId || actualApptId === ':appointmentId') {
        console.warn(`Invalid appointmentId: ${actualApptId}`);
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(actualApptId)) {
        console.warn(`Invalid ObjectId format: ${actualApptId}`);
        return;
      }

      try {
        const appointment = await Appointment.findById(actualApptId);
        if (!appointment) {
          console.warn(`Appointment not found: ${actualApptId}`);
          return;
        }

        socket.join(actualApptId);
        console.log(`Socket ${socket.id} (user ${userId}) joined room: ${actualApptId}`);
      } catch (error) {
        console.error(`Error in join-room for appointment ${actualApptId}:`, error);
      }
    });

    socket.on('invite-call', ({ userId, appointmentId }) => {
      if (!userId || !appointmentId) {
        console.warn('Missing userId or appointmentId in invite-call');
        return;
      }
      io.to(userId).emit('call-invitation', { userId, appointmentId });
      console.log(`Sending invitation to user ${userId} for appointment ${appointmentId}`);
    });

    // Evento cuando el veterinario inicia una videollamada con Jitsi
    socket.on('jitsi-call-started', async ({ appointmentId, vetId, roomName }) => {
      if (!appointmentId || !vetId) {
        console.warn('Missing appointmentId or vetId in jitsi-call-started');
        return;
      }

      try {
        const appointment = await Appointment.findById(appointmentId)
          .populate('userId', 'name email')
          .populate('vetId', 'name')
          .populate('petId', 'name');
        if (!appointment) {
          console.warn(`Appointment not found: ${appointmentId}`);
          return;
        }

        const userId = appointment.userId._id.toString();
        
        // Obtener el nombre del veterinario (puede venir del populate o necesitar consulta adicional)
        let vetName = 'Veterinario';
        if (appointment.vetId && appointment.vetId.name) {
          vetName = appointment.vetId.name;
        } else if (typeof appointment.vetId === 'object' && appointment.vetId?.name) {
          vetName = appointment.vetId.name;
        }
        
        // Obtener el nombre de la mascota
        let petName = 'tu mascota';
        if (appointment.petId && appointment.petId.name) {
          petName = appointment.petId.name;
        } else if (typeof appointment.petId === 'object' && appointment.petId?.name) {
          petName = appointment.petId.name;
        }
        
        // Enviar notificación al cliente (usuario)
        io.to(userId).emit('jitsi-video-call-started', {
          appointmentId,
          vetId,
          roomName: roomName || `vetgo-${appointmentId}`,
          vetName,
          petName
        });
        
        console.log(`Notified user ${userId} about Jitsi call for appointment ${appointmentId}`);
      } catch (error) {
        console.error('Error notifying user about Jitsi call:', error);
      }
    });

    // Evento para notificar al tutor durante la videollamada
    socket.on('notify-tutor-during-call', async ({ appointmentId, message, type }) => {
      if (!appointmentId) {
        console.warn('Missing appointmentId in notify-tutor-during-call');
        return;
      }

      try {
        const appointment = await Appointment.findById(appointmentId).populate('userId', 'name email');
        if (!appointment) {
          console.warn(`Appointment not found: ${appointmentId}`);
          return;
        }

        const userId = appointment.userId._id.toString();
        
        // Enviar notificación al tutor
        io.to(userId).emit('tutor-notification', {
          appointmentId,
          message: message || 'El veterinario te está notificando',
          type: type || 'info', // 'info', 'warning', 'urgent'
          timestamp: new Date()
        });
        
        console.log(`Notified tutor ${userId} during call for appointment ${appointmentId}`);
      } catch (error) {
        console.error('Error in notify-tutor-during-call:', error);
      }
    });

    socket.on('send-offer', ({ offer, appointmentId }) => {
      console.log(`Broadcasting offer to room ${appointmentId}`);
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
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}