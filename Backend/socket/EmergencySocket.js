import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Vet from '../models/Veterinarian.js';
import Conversation from '../models/Conversation.js';

const OFFER_TIMEOUT_MS = 20000;
const OFFER_GLOBAL_TIMEOUT_MS = 5 * 60 * 1000;

// Función helper para calcular distancia (Haversine)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en km
};

const setupEmergencySocket = (io) => {
  const emergencyNamespace = io.of('/emergency');

  const activeOffers = new Map();

  // Verificar si hay urgencias pendientes que puedan incluir a este veterinario
  const checkPendingEmergenciesForVet = async (vetId, vet) => {
    try {
      // Verificar que el vet esté realmente disponible (sin urgencias activas)
      if (vet.currentStatus !== 'available' || vet.activeEmergency) {
        console.log(`⚠️ Vet ${vetId} no está disponible para recibir nuevas ofertas (status: ${vet.currentStatus}, activeEmergency: ${vet.activeEmergency})`);
        return;
      }

      const [vetLng, vetLat] = vet.location.coordinates;
      const maxDistance = 20; // 20km de radio
      
      // Buscar urgencias pendientes que aún no han agotado su tiempo global
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - OFFER_GLOBAL_TIMEOUT_MS);
      
      // Buscar urgencias que:
      // 1. Están activas (pending)
      // 2. Fueron creadas en los últimos 5 minutos (aún dentro del tiempo límite)
      // 3. No han sido aceptadas aún
      // 4. El vet no está ya en la cola
      // 5. El vet no ha rechazado o dejado pasar esta urgencia antes
      const pendingEmergencies = await Appointment.find({
        isEmergency: true,
        status: 'pending',
        createdAt: { $gte: fiveMinutesAgo }, // Solo urgencias creadas en los últimos 5 minutos
        'offer.status': { $in: ['idle', 'offering', 'pending', 'exhausted'] }, // Que aún no hayan sido aceptadas
        'location.lat': { $exists: true },
        'location.lng': { $exists: true },
        $or: [
          { 'offer.queue': { $ne: new mongoose.Types.ObjectId(vetId) } }, // Que el vet no esté ya en la cola
          { 'offer.queue': { $exists: false } },
          { 'offer.queue': { $size: 0 } } // O que la cola esté vacía
        ],
        // Excluir urgencias donde el vet ya rechazó EXPLÍCITAMENTE
        // Pero permitir segundas oportunidades si fue timeout (podría no haber visto la notificación)
        'offer.history': {
          $not: {
            $elemMatch: {
              vetId: new mongoose.Types.ObjectId(vetId),
              status: 'rejected' // Solo excluir si rechazó explícitamente
            }
          }
        }
      })
      .populate('userId', 'name')
      .populate('petId', 'name')
      .sort({ createdAt: -1 }); // Más recientes primero
      
      console.log(`🔍 Verificando ${pendingEmergencies.length} urgencias pendientes para vet ${vetId}`);
      
      for (const emergency of pendingEmergencies) {
        if (!emergency.location?.lat || !emergency.location?.lng) continue;
        
        const distance = calculateDistance(
          vetLat,
          vetLng,
          emergency.location.lat,
          emergency.location.lng
        );
        
        // Si el veterinario está dentro del radio y la urgencia aún no ha agotado su tiempo
        if (distance <= maxDistance) {
          const offer = activeOffers.get(emergency._id.toString());
          
          // Si la oferta aún está activa y no ha agotado su tiempo
          if (offer && offer.deadlineTimer) {
            // Verificar que el vet no esté ya en la cola
            const alreadyInQueue = offer.queue.some(q => q.vetId === vetId.toString());
            
            // Verificar que el vet no haya rechazado o dejado pasar esta urgencia antes
            const hasRejected = emergency.offer?.history?.some(
              h => h.vetId?.toString() === vetId.toString() && 
                   (h.status === 'rejected' || h.status === 'timeout')
            );
            
            if (!alreadyInQueue && !hasRejected) {
              console.log(`✅ Agregando vet ${vetId} a la cola de emergencia ${emergency._id} (distancia: ${distance.toFixed(2)}km)`);
              
              // Agregar el vet a la cola
              offer.queue.push({
                vetId: vetId.toString(),
                distance: Math.round(distance * 10) / 10,
                eta: Math.round(distance * 2) // ETA aproximado: 2 min por km
              });
              
              // Ordenar la cola por distancia
              offer.queue.sort((a, b) => (a.distance || 0) - (b.distance || 0));
              
              // Actualizar la cola en la base de datos
              await Appointment.findByIdAndUpdate(emergency._id, {
                $set: {
                  'offer.queue': offer.queue.map(item => new mongoose.Types.ObjectId(item.vetId))
                }
              });
              
              // Si la cola estaba agotada pero ahora tiene un nuevo vet, reactivar
              if (offer.index >= offer.queue.length - 1) {
                console.log(`🔄 Reactivando oferta para emergencia ${emergency._id} con nuevo vet`);
                // No avanzar automáticamente, esperar a que el vet actual rechace o expire
              }
            } else if (hasRejected) {
              console.log(`⏭️ Vet ${vetId} ya rechazó explícitamente la emergencia ${emergency._id}. No se volverá a ofrecer.`);
            }
          } else if (!offer) {
            // Si no hay oferta activa pero la urgencia está pendiente y dentro del tiempo, crear una nueva oferta
            // PERO solo si el vet no la ha rechazado EXPLÍCITAMENTE antes
            // Los timeouts se permiten para segunda oportunidad
            const hasRejected = emergency.offer?.history?.some(
              h => h.vetId?.toString() === vetId.toString() && 
                   h.status === 'rejected' // Solo excluir si rechazó explícitamente
            );
            
            if (!hasRejected) {
              const timeSinceCreation = now.getTime() - new Date(emergency.createdAt).getTime();
              if (timeSinceCreation < OFFER_GLOBAL_TIMEOUT_MS) {
                console.log(`🆕 Creando nueva oferta para emergencia ${emergency._id} con vet ${vetId}`);
                
                const offerPayload = {
                  petName: emergency.petId?.name || 'Mascota',
                  triage: emergency.triage || {},
                  location: emergency.location,
                  pricing: emergency.pricing || {},
                  priority: emergency.triage?.priorityHint || 'medium',
                  appointmentType: emergency.appointmentType || 'home visit'
                };
                
                await startOffer({
                  appointment: emergency,
                  candidates: [{
                    _id: vet._id,
                    distance: Math.round(distance * 10) / 10,
                    eta: Math.round(distance * 2)
                  }],
                  payload: offerPayload
                });
              }
            } else {
              console.log(`⏭️ Vet ${vetId} ya rechazó explícitamente la emergencia ${emergency._id}. No se creará nueva oferta.`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking pending emergencies for vet:', error);
    }
  };

  const recordOfferHistory = async (emergencyId, vetId, status, reason = null) => {
    if (!emergencyId || !vetId) return;
    try {
      await Appointment.findByIdAndUpdate(emergencyId, {
        $push: {
          'offer.history': {
            vetId: new mongoose.Types.ObjectId(vetId),
            status,
            reason,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Error recording offer history:', error);
    }
  };

  const clearOfferTimer = (offer) => {
    if (offer?.timer) {
      clearTimeout(offer.timer);
      offer.timer = null;
    }
  };

  const clearDeadlineTimer = (offer) => {
    if (offer?.deadlineTimer) {
      clearTimeout(offer.deadlineTimer);
      offer.deadlineTimer = null;
    }
  };

  const finalizeOffer = async (emergencyId) => {
    const offer = activeOffers.get(emergencyId);
    if (offer) {
      clearOfferTimer(offer);
      clearDeadlineTimer(offer);
      activeOffers.delete(emergencyId);
    }
    await Appointment.findByIdAndUpdate(emergencyId, {
      $set: {
        'offer.currentVet': null,
        'offer.expiresAt': null
      }
    });
  };

  const advanceOffer = async (emergencyId, options = {}) => {
    const offer = activeOffers.get(emergencyId);
    if (!offer) {
      console.log(`⚠️ advanceOffer: No se encontró oferta activa para emergencia ${emergencyId}`);
      return;
    }

    if (options.prevVetId && options.prevStatus) {
      await recordOfferHistory(emergencyId, options.prevVetId, options.prevStatus, options.reason);
    }

    // Para asignación manual, manejar lógica especial de 2 intentos
    if (offer.isManual && options.prevVetId && (options.prevStatus === 'timeout' || options.prevStatus === 'rejected')) {
      const emergency = await Appointment.findById(emergencyId);
      if (emergency) {
        const currentAttemptCount = (emergency.offer?.manualAttemptCount || 0) + 1;
        const maxAttempts = emergency.offer?.maxManualAttempts || 2;
        
        await Appointment.findByIdAndUpdate(emergencyId, {
          $set: {
            'offer.manualAttemptCount': currentAttemptCount
          }
        });

        console.log(`📊 Asignación manual: Intento ${currentAttemptCount}/${maxAttempts} para vet ${options.prevVetId}`);

        // Si aún no se alcanzó el máximo de intentos, reiniciar y volver a ofrecer al mismo vet
        if (currentAttemptCount < maxAttempts) {
          console.log(`🔄 Reintentando con el mismo veterinario (intento ${currentAttemptCount + 1}/${maxAttempts})...`);
          
          // Reiniciar índice para volver a ofrecer al mismo vet
          offer.index = -1;
          
          // Actualizar en BD
          await Appointment.findByIdAndUpdate(emergencyId, {
            $set: {
              'offer.status': 'idle',
              'offer.currentVet': null,
              'offer.expiresAt': null
            }
          });
          
          // Continuar con la oferta (volverá a ofrecer al mismo vet)
          await advanceOffer(emergencyId);
          return;
        } else {
          // Se alcanzó el máximo de intentos, emitir evento al tutor para ampliar búsqueda
          console.log(`❌ Máximo de intentos alcanzado (${maxAttempts}) para asignación manual. Notificando al tutor para ampliar búsqueda...`);
          
          await Appointment.findByIdAndUpdate(emergencyId, {
            $set: {
              'offer.status': 'exhausted',
              'offer.currentVet': null,
              'offer.expiresAt': null
            }
          });

          // Emitir evento al tutor para que pueda ampliar la búsqueda
          if (offer.userId) {
            emergencyNamespace.to(`user:${offer.userId}`).emit('emergency:manual-attempts-exhausted', {
              emergencyId,
              message: `El veterinario seleccionado no ha respondido después de ${maxAttempts} intentos. ¿Deseas ampliar la búsqueda para encontrar otros veterinarios disponibles?`,
              showExpandOption: true,
              attemptsMade: currentAttemptCount
            });
            
            emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
              status: 'pending',
              message: `Esperando confirmación para ampliar la búsqueda...`
            });
          }
          
          return;
        }
      }
    }

    clearOfferTimer(offer);
    offer.index = (offer.index ?? -1) + 1;

    console.log(`🔄 Avanzando oferta para emergencia ${emergencyId}: índice ${offer.index}, cola total: ${offer.queue.length}`);

    if (offer.index >= offer.queue.length) {
      // Verificar si ya estamos en la segunda ronda
      const currentRound = offer.round || 1;
      
      if (currentRound === 1) {
        // Primera ronda agotada, intentar segunda oportunidad
        console.log(`❌ Primera ronda agotada para emergencia ${emergencyId}. Buscando vets con timeout para segunda oportunidad...`);
        
        // Buscar vets que tuvieron timeout (no rechazaron explícitamente) para darles segunda oportunidad
        const emergency = await Appointment.findById(emergencyId);
        if (emergency && emergency.offer?.history) {
          // Obtener vets que tuvieron timeout pero no rechazaron explícitamente
          const timeoutVets = emergency.offer.history
            .filter(h => h.status === 'timeout' && h.vetId)
            .map(h => h.vetId.toString());
          
          // Filtrar los que ya rechazaron explícitamente
          const rejectedVets = emergency.offer.history
            .filter(h => h.status === 'rejected' && h.vetId)
            .map(h => h.vetId.toString());
          
          const eligibleVets = timeoutVets.filter(vetId => !rejectedVets.includes(vetId));
          
          if (eligibleVets.length > 0) {
            console.log(`🔄 Ofreciendo segunda oportunidad (ronda 2) a ${eligibleVets.length} vets que tuvieron timeout`);
            
            // Buscar información de estos vets y agregarlos a la cola nuevamente
            try {
              const vets = await Vet.find({
                _id: { $in: eligibleVets.map(id => new mongoose.Types.ObjectId(id)) },
                availableNow: true,
                supportsEmergency: true,
                isApproved: true,
                // Solo veterinarios disponibles (no ocupados con otra urgencia)
                currentStatus: { $in: ['available', 'offline'] },
                // Sin urgencias activas
                $or: [
                  { activeEmergency: null },
                  { activeEmergency: { $exists: false } }
                ],
                location: { $exists: true }
              });
              
              if (vets.length > 0 && emergency.location?.lat && emergency.location?.lng) {
                // Calcular distancias y crear nueva cola con estos vets
                const newCandidates = vets.map(vet => {
                  if (!vet.location?.coordinates) return null;
                  const [vetLng, vetLat] = vet.location.coordinates;
                  const distance = calculateDistance(
                    emergency.location.lat,
                    emergency.location.lng,
                    vetLat,
                    vetLng
                  );
                  return {
                    _id: vet._id,
                    distance: Math.round(distance * 10) / 10,
                    eta: Math.round(distance * 2)
                  };
                }).filter(c => c !== null && c.distance <= 20).sort((a, b) => a.distance - b.distance);
                
                if (newCandidates.length > 0) {
                  console.log(`✅ ${newCandidates.length} vets elegibles para segunda oportunidad (ronda 2)`);
                  
                  // Reiniciar la cola con estos vets y avanzar a ronda 2
                  offer.queue = newCandidates.map(c => ({
                    vetId: c._id.toString(),
                    distance: c.distance,
                    eta: c.eta
                  }));
                  offer.index = -1; // Reiniciar índice
                  offer.round = 2; // Marcar como segunda ronda
                  
                  // Actualizar en BD
                  await Appointment.findByIdAndUpdate(emergencyId, {
                    $set: {
                      'offer.queue': offer.queue.map(item => new mongoose.Types.ObjectId(item.vetId)),
                      'offer.status': 'idle',
                      'offer.round': 2
                    }
                  });
                  
                  // Continuar con la oferta
                  await advanceOffer(emergencyId);
                  return;
                }
              }
            } catch (error) {
              console.error('Error buscando vets para segunda oportunidad:', error);
            }
          }
        }
      }
      
      // Si ya estamos en la segunda ronda o no hay vets para segunda oportunidad, cancelar
      console.log(`❌ No hay más veterinarios disponibles para emergencia ${emergencyId}. Rondas agotadas (${currentRound}). Cancelando...`);
      clearDeadlineTimer(offer);
      activeOffers.delete(emergencyId);
      
      // Cancelar la emergencia
      await Appointment.findByIdAndUpdate(emergencyId, {
        $set: {
          status: 'cancelled',
          'tracking.status': 'cancelled',
          'offer.status': 'exhausted',
          'offer.currentVet': null,
          'offer.expiresAt': null,
          cancellationReason: 'No se encontraron veterinarios disponibles después de 2 rondas de búsqueda.',
          cancellationReasonCode: 'no-vets-available'
        }
      });

      // Notificar al usuario con call to action
      emergencyNamespace.to(`emergency:${emergencyId}`).emit('offer:exhausted', { emergencyId });
      if (offer.userId) {
        emergencyNamespace.to(`user:${offer.userId}`).emit('emergency:no-vets', { 
          emergencyId,
          message: 'No se encontraron veterinarios disponibles en este momento. Te recomendamos agendar una cita presencial o de telemedicina.',
          showCallToAction: true
        });
      }
      return;
    }

    const next = offer.queue[offer.index];

    // Persist current vet and expiration
    const expiresAt = Date.now() + OFFER_TIMEOUT_MS;
    offer.currentVet = next.vetId;
    offer.expiresAt = expiresAt;
    offer.timer = setTimeout(() => handleOfferTimeout(emergencyId, next.vetId), OFFER_TIMEOUT_MS);
    activeOffers.set(emergencyId, offer);

    await Appointment.findByIdAndUpdate(emergencyId, {
      $set: {
        'offer.currentVet': new mongoose.Types.ObjectId(next.vetId),
        'offer.expiresAt': new Date(expiresAt),
        'offer.status': 'offering'
      },
      $push: {
        'offer.history': {
          vetId: new mongoose.Types.ObjectId(next.vetId),
          status: 'offered',
          timestamp: new Date()
        }
      }
    });

    const offerPayload = {
      emergencyId,
      expiresAt,
      distance: next.distance,
      eta: next.eta,
      position: offer.index + 1,
      totalCandidates: offer.queue.length,
      ...offer.payload
    };

    console.log(`📤 Enviando oferta a vet ${next.vetId} (posición ${offer.index + 1}/${offer.queue.length})`);
    console.log(`📋 Sala del vet: vet:${next.vetId}`);
    
    // Verificar si el vet está conectado
    try {
      const vetRoom = emergencyNamespace.adapter.rooms.get(`vet:${next.vetId}`);
      if (vetRoom && vetRoom.size > 0) {
        console.log(`✅ Vet ${next.vetId} está conectado (${vetRoom.size} socket(s))`);
      } else {
        console.log(`⚠️ Vet ${next.vetId} NO está conectado al socket`);
      }
    } catch (error) {
      console.log(`⚠️ No se pudo verificar conexión del vet ${next.vetId}:`, error.message);
    }

    emergencyNamespace.to(`vet:${next.vetId}`).emit('emergency:offer', offerPayload);
    emergencyNamespace.to(`vet:${next.vetId}`).emit('emergency:new', offerPayload);
    emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
      status: 'pending',
      message: 'Contactando a un veterinario cercano'
    });
  };

  const handleOfferTimeout = async (emergencyId, vetId) => {
    const offer = activeOffers.get(emergencyId);
    if (!offer || offer.currentVet !== vetId) return;

    try {
      await Vet.findByIdAndUpdate(vetId, { currentStatus: 'available' });
    } catch (error) {
      console.error('Error updating vet status on timeout:', error);
    }

    emergencyNamespace.to(`vet:${vetId}`).emit('emergency:offer-expired', { emergencyId });
    await advanceOffer(emergencyId, { prevVetId: vetId, prevStatus: 'timeout' });
  };

  const handleOfferDeadline = async (emergencyId) => {
    const offer = activeOffers.get(emergencyId);
    if (!offer) return;

    console.log(`⏱️ Oferta global expirada para la emergencia ${emergencyId}`);

    try {
      if (offer.currentVet) {
        await recordOfferHistory(emergencyId, offer.currentVet, 'timeout', 'global_timeout');
        try {
          await Vet.findByIdAndUpdate(offer.currentVet, { currentStatus: 'available' });
        } catch (error) {
          console.error('Error updating vet status on global timeout:', error);
        }
      }

      await Appointment.findByIdAndUpdate(emergencyId, {
        $set: {
          status: 'cancelled',
          'tracking.status': 'cancelled',
          cancellationReason: 'No se encontraron veterinarios disponibles después del tiempo límite.',
          cancellationReasonCode: 'no-vets-timeout',
          availableNow: false,
          'offer.status': 'cancelled',
          'offer.currentVet': null,
          'offer.expiresAt': null
        }
      });

      await cancelOffer(emergencyId, 'timeout');

      emergencyNamespace.to(`emergency:${emergencyId}`).emit('offer:exhausted', { emergencyId });

      if (offer.userId) {
        emergencyNamespace.to(`user:${offer.userId}`).emit('emergency:no-vets', { 
          emergencyId,
          message: 'No se encontraron veterinarios disponibles en este momento. Te recomendamos agendar una cita presencial o de telemedicina.',
          showCallToAction: true
        });
        emergencyNamespace.to(`user:${offer.userId}`).emit('emergency:cancelled', {
          emergencyId,
          reason: 'No se encontraron veterinarios disponibles después del tiempo límite.'
        });
      }
    } catch (error) {
      console.error('Error handling global offer timeout:', error);
    }
  };

  const startOffer = async ({ appointment, candidates, payload, isManual = false }) => {
    if (!appointment || !appointment._id) {
      console.log('❌ startOffer: appointment o _id faltante');
      return;
    }

    const assignmentType = isManual ? 'MANUAL' : 'AUTOMÁTICA';
    console.log(`🚀 Iniciando oferta ${assignmentType} para emergencia ${appointment._id.toString()}`);
    console.log(`📋 Candidatos recibidos: ${candidates?.length || 0}`);

    const queue = (candidates || []).map((candidate) => ({
      vetId: candidate._id.toString(),
      distance: candidate.distance ?? null,
      eta: candidate.eta ?? null
    }));

    console.log(`📝 Cola de ofertas creada con ${queue.length} veterinario(s):`, queue.map(q => q.vetId));

    await Appointment.findByIdAndUpdate(appointment._id, {
      $set: {
        offer: {
          currentVet: null,
          expiresAt: null,
          queue: queue.map((item) => new mongoose.Types.ObjectId(item.vetId)),
          round: 1, // Primera ronda
          manualAttemptCount: 0, // Inicializar contador de intentos manuales
          maxManualAttempts: 2, // Máximo de intentos para asignación manual
          history: [],
          status: queue.length > 0 ? 'idle' : 'exhausted'
        }
      }
    });

    if (queue.length === 0) {
      console.log(`⚠️ No hay candidatos para emergencia ${appointment._id.toString()}`);
      const userId = appointment.userId?._id?.toString() || appointment.userId?.toString();
      
      // Cancelar la emergencia en la base de datos
      try {
        await Appointment.findByIdAndUpdate(appointment._id, {
          $set: {
            status: 'cancelled',
            'tracking.status': 'cancelled',
            cancellationReason: 'No se encontraron veterinarios disponibles.',
            cancellationReasonCode: 'no-vets-available',
            'offer.status': 'exhausted',
            'offer.currentVet': null,
            'offer.expiresAt': null
          }
        });
        console.log(`✅ Emergencia ${appointment._id.toString()} cancelada por falta de veterinarios`);
      } catch (error) {
        console.error('Error al cancelar emergencia sin candidatos:', error);
      }
      
        if (userId) {
          emergencyNamespace.to(`user:${userId}`).emit('emergency:no-vets', {
            emergencyId: appointment._id.toString(),
            message: 'No se encontraron veterinarios disponibles en este momento. Te recomendamos agendar una cita presencial o de telemedicina.',
            showCallToAction: true
          });
          emergencyNamespace.to(`user:${userId}`).emit('emergency:cancelled', {
            emergencyId: appointment._id.toString(),
            reason: 'No se encontraron veterinarios disponibles.'
          });
        }
      return;
    }

    const offerEntry = {
      emergencyId: appointment._id.toString(),
      queue,
      index: -1,
      payload,
      timer: null,
      deadlineTimer: null,
      userId: appointment.userId?._id?.toString() || appointment.userId?.toString() || null,
      round: 1, // Primera ronda
      isManual: isManual // Marcar si es asignación manual
    };

    offerEntry.deadlineTimer = setTimeout(
      () => handleOfferDeadline(appointment._id.toString()),
      OFFER_GLOBAL_TIMEOUT_MS
    );

    activeOffers.set(appointment._id.toString(), offerEntry);
    console.log(`✅ Oferta registrada en activeOffers para emergencia ${appointment._id.toString()}`);

    await advanceOffer(appointment._id.toString());
  };

  const cancelOffer = async (emergencyId, reason = 'cancelled') => {
    const offer = activeOffers.get(emergencyId);
    if (!offer) return;

    clearOfferTimer(offer);
    clearDeadlineTimer(offer);
    activeOffers.delete(emergencyId);

    await Appointment.findByIdAndUpdate(emergencyId, {
      $set: {
        'offer.status': 'cancelled',
        'offer.currentVet': null,
        'offer.expiresAt': null
      }
    });

    if (offer.currentVet) {
      await recordOfferHistory(emergencyId, offer.currentVet, 'cancelled', reason);
      emergencyNamespace.to(`vet:${offer.currentVet}`).emit('emergency:offer-cancelled', {
        emergencyId,
        reason
      });
    }

    offer.queue
      .filter((item) => item.vetId !== offer.currentVet)
      .forEach((item) => {
        emergencyNamespace.to(`vet:${item.vetId}`).emit('emergency:offer-withdrawn', { emergencyId });
      });
  };

  const offerManager = {
    startOffer,
    cancelOffer,
    advanceOffer,
    finalizeOffer,
    getOffer: (emergencyId) => activeOffers.get(emergencyId)
  };

  emergencyNamespace.on('connection', (socket) => {
    console.log('Emergency socket connected:', socket.id);

    let connectedVetId = null;

    // Usuario/Vet se une a su sala personal
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined emergency socket`);
    });

    socket.on('join:vet', async (vetId) => {
      connectedVetId = vetId?.toString?.() || vetId;
      socket.join(`vet:${vetId}`);
      console.log(`Vet ${vetId} joined emergency socket`);
      if (connectedVetId) {
        try {
          const vet = await Vet.findById(connectedVetId);
          if (vet) {
            await Vet.findByIdAndUpdate(connectedVetId, {
              lastSeenAt: new Date()
            });
            
            // Si el veterinario está disponible y soporta emergencias, verificar si hay urgencias pendientes
            if (vet.availableNow && 
                vet.supportsEmergency && 
                vet.isApproved && 
                vet.location?.coordinates &&
                vet.currentStatus === 'available' &&
                !vet.activeEmergency) {
              await checkPendingEmergenciesForVet(connectedVetId, vet);
            }
          }
        } catch (error) {
          console.error('Error updating vet lastSeenAt on join:', error);
        }
      }
    });

    // Unirse a sala de emergencia específica
    socket.on('join:emergency', (emergencyId) => {
      socket.join(`emergency:${emergencyId}`);
      console.log(`Joined emergency room: ${emergencyId}`);
    });

    // Veterinario actualiza su ubicación
    // Usar la función calculateDistanceMeters para geofencing (en metros)

    socket.on('update:vet-location', async (data) => {
      const { vetId, lat, lng, emergencyId } = data;
      
      try {
        // Actualizar ubicación del vet en BD
        await Vet.findByIdAndUpdate(vetId, {
          'currentLocation.coordinates': [lng, lat],
          'currentLocation.lastUpdate': new Date()
        });

        // Si hay una emergencia activa, verificar geofencing
        if (emergencyId) {
          const emergency = await Appointment.findById(emergencyId);
          if (emergency && emergency.location && emergency.location.lat && emergency.location.lng) {
            // Calcular distancia en metros para geofencing
            const distanceMeters = calculateDistance(
              emergency.location.lat,
              emergency.location.lng,
              lat,
              lng
            ) * 1000; // Convertir de km a metros
            
            const distance = distanceMeters;
            
            const ARRIVAL_RADIUS = 50; // 50 metros de radio para considerar "llegado"
            const currentStatus = emergency.tracking?.status || emergency.status;

            // Si está dentro del radio y está "en camino", cambiar a "llegado"
            if (distance <= ARRIVAL_RADIUS && currentStatus === 'on-way') {
              console.log(`📍 Vet ${vetId} está dentro del radio (${distance.toFixed(1)}m). Cambiando a "arrived"`);
              
              await Appointment.findByIdAndUpdate(emergencyId, {
                'tracking.status': 'arrived',
                'tracking.arrivedAt': new Date(),
                'tracking.currentLocation': {
                  lat,
                  lng
                }
              });

              // Notificar a todos
              emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
                status: 'arrived',
                message: 'El veterinario ha llegado a tu ubicación (validado por geolocalización)',
                autoDetected: true,
                distance: distance.toFixed(1),
                geolocationValidated: true
              });

              emergencyNamespace.to(`user:${emergency.userId}`).emit('emergency:arrived', {
                emergencyId,
                autoDetected: true
              });
            }
            // Si está dentro del radio y está "llegado" pero no confirmado, cambiar a "en servicio" automáticamente después de 30 segundos
            else if (distance <= ARRIVAL_RADIUS && currentStatus === 'arrived' && !emergency.tracking?.userConfirmedAt) {
              const arrivedAt = emergency.tracking?.arrivedAt;
              if (arrivedAt) {
                const timeSinceArrival = (new Date() - new Date(arrivedAt)) / 1000; // segundos
                // Auto-confirmar después de 30 segundos si el usuario no ha confirmado
                if (timeSinceArrival >= 30) {
                  console.log(`⏱️ Han pasado ${timeSinceArrival.toFixed(0)}s desde la llegada. Auto-confirmando...`);
                  
                  await Appointment.findByIdAndUpdate(emergencyId, {
                    'tracking.status': 'in-service',
                    'tracking.userConfirmedAt': new Date(),
                    'tracking.autoConfirmed': true,
                    'tracking.arrivalDistance': parseFloat(distance.toFixed(1)),
                    status: 'in_progress'
                  });

                  emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
                    status: 'in-service',
                    message: 'Atención iniciada automáticamente por validación de geolocalización',
                    autoConfirmed: true,
                    distance: distance.toFixed(1),
                    geolocationValidated: true
                  });

                  emergencyNamespace.to(`user:${emergency.userId}`).emit('emergency:in-service', {
                    emergencyId,
                    autoConfirmed: true,
                    geolocationValidated: true,
                    distance: distance.toFixed(1)
                  });

                  emergencyNamespace.to(`vet:${vetId}`).emit('emergency:user-confirmed', {
                    emergencyId,
                    autoConfirmed: true,
                    geolocationValidated: true,
                    distance: distance.toFixed(1),
                    message: 'Atención iniciada automáticamente por validación de geolocalización. Tu ubicación fue confirmada dentro del radio de llegada.'
                  });
                }
              }
            }
          }
        }

        // Notificar al usuario en la emergencia
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('vet:location-update', {
          lat,
          lng,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating vet location:', error);
      }
    });

    // Veterinario acepta emergencia
    socket.on('emergency:accept', async (data) => {
      const { emergencyId, vetId } = data;
      
      try {
        const offer = activeOffers.get(emergencyId);
        if (!offer || offer.currentVet !== vetId) {
          socket.emit('emergency:accept:error', {
            message: 'La urgencia ya fue asignada a otro profesional.'
          });
          return;
        }

        // Rechazar automáticamente todas las otras ofertas activas de esta vet
        console.log(`🔄 Rechazando automáticamente otras ofertas activas para vet ${vetId}...`);
        for (const [otherEmergencyId, otherOffer] of activeOffers.entries()) {
          // Si es otra emergencia diferente y esta vet es el currentVet
          if (otherEmergencyId !== emergencyId && otherOffer.currentVet === vetId) {
            console.log(`❌ Rechazando automáticamente emergencia ${otherEmergencyId} para vet ${vetId} (aceptó otra emergencia)`);
            
            // Registrar en el historial como rechazada automáticamente
            await recordOfferHistory(otherEmergencyId, vetId, 'rejected', 'Vet aceptó otra emergencia');
            
            // Notificar al vet que la oferta fue rechazada automáticamente (múltiples eventos para compatibilidad)
            emergencyNamespace.to(`vet:${vetId}`).emit('emergency:offer-rejected-auto', {
              emergencyId: otherEmergencyId,
              reason: 'Has aceptado otra emergencia. Esta oferta ha sido rechazada automáticamente.'
            });
            
            // También emitir emergency:offer-withdrawn para que el frontend remueva la oferta del panel
            emergencyNamespace.to(`vet:${vetId}`).emit('emergency:offer-withdrawn', {
              emergencyId: otherEmergencyId,
              reason: 'Oferta rechazada automáticamente: has aceptado otra emergencia'
            });
            
            // Avanzar a la siguiente vet en la cola para esta emergencia
            await advanceOffer(otherEmergencyId, {
              prevVetId: vetId,
              prevStatus: 'rejected',
              reason: 'Vet aceptó otra emergencia'
            });
          }
        }
        
        // También verificar si el vet ya tiene una emergencia activa antes de permitir aceptar
        const vetBeforeAccept = await Vet.findById(vetId);
        if (vetBeforeAccept?.activeEmergency && vetBeforeAccept.activeEmergency.toString() !== emergencyId) {
          socket.emit('emergency:accept:error', {
            message: 'Ya tienes una emergencia activa. Finaliza la actual antes de aceptar otra.'
          });
          return;
        }

        const vet = await Vet.findById(vetId);
        const emergency = await Appointment.findByIdAndUpdate(
          emergencyId,
          {
            vetId,
            status: 'assigned',
            'tracking.acceptedAt': new Date(),
            'tracking.status': 'vet-assigned',
            'offer.status': 'accepted',
            'offer.currentVet': new mongoose.Types.ObjectId(vetId),
            'offer.expiresAt': null
          },
          { new: true }
        ).populate('petId').populate('userId');

        const userObjectId = emergency.userId?._id || emergency.userId;
        const petObjectId = emergency.petId?._id || emergency.petId;
        const userIdStr = userObjectId?.toString();
        const vetIdStr = vetId?.toString();

        let conversation = await Conversation.findOne({
          userId: userObjectId,
          vetId
        });

        if (conversation) {
          const needsUpdate =
            !conversation.appointmentId ||
            conversation.appointmentId.toString() !== emergencyId.toString() ||
            (petObjectId && (!conversation.petId || conversation.petId.toString() !== petObjectId.toString()));

          if (needsUpdate) {
            conversation.appointmentId = emergencyId;
            if (petObjectId) {
              conversation.petId = petObjectId;
            }
            await conversation.save();
          }
        } else {
          conversation = await Conversation.create({
            userId: userObjectId,
            vetId,
            appointmentId: emergencyId,
            petId: petObjectId,
            messages: []
          });
        }

        // Marcar vet como ocupado
        await Vet.findByIdAndUpdate(vetId, {
          currentStatus: 'busy',
          activeEmergency: emergencyId
        });

        await recordOfferHistory(emergencyId, vetId, 'accepted');
        clearOfferTimer(offer);
        activeOffers.delete(emergencyId);

        offer.queue
          .filter((item) => item.vetId !== vetId)
          .forEach((item) => {
            emergencyNamespace.to(`vet:${item.vetId}`).emit('emergency:offer-withdrawn', { emergencyId });
        });

        // Notificar al usuario
        emergencyNamespace.to(`user:${emergency.userId._id}`).emit('emergency:accepted', {
          emergency,
          vet: {
            name: vet.name,
            phoneNumber: vet.phoneNumber,
            profileImage: vet.profileImage
          },
          conversationId: conversation._id.toString()
        });

        // Notificar en la sala de la emergencia
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
          status: 'accepted',
          message: 'Veterinario asignado',
          vet: { name: vet.name }
        });

        socket.emit('emergency:accept:success', {
          emergencyId,
          conversationId: conversation._id.toString()
        });
      } catch (error) {
        console.error('Error accepting emergency:', error);
        socket.emit('emergency:accept:error', { message: error.message });
      }
    });

    // Veterinario rechaza emergencia
    socket.on('emergency:reject', async (data) => {
      const { emergencyId, vetId, reason } = data;
      
      try {
        const offer = activeOffers.get(emergencyId);
        if (offer && offer.currentVet === vetId) {
        await Vet.findByIdAndUpdate(vetId, {
          currentStatus: 'available'
        });
          emergencyNamespace.to(`vet:${vetId}`).emit('emergency:offer-rejected', {
            emergencyId
          });
          await advanceOffer(emergencyId, {
            prevVetId: vetId,
            prevStatus: 'rejected',
            reason: reason || 'Vet rejected'
          });
        } else {
          console.log('Reject ignored — offer no longer active for this vet');
        }
        socket.emit('emergency:reject:success');
      } catch (error) {
        console.error('Error rejecting emergency:', error);
      }
    });

    // Veterinario está en camino
    socket.on('emergency:on-way', async (data) => {
      const { emergencyId, vetId, eta } = data;
      
      try {
        await Appointment.findByIdAndUpdate(emergencyId, {
          'tracking.status': 'on-way',
          'tracking.eta': eta,
          'tracking.onWayAt': new Date()
        });

        // Actualizar estado del vet
        await Vet.findByIdAndUpdate(vetId, {
          currentStatus: 'on-way'
        });

        // Notificar a todos los participantes
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
          status: 'on-way',
          message: 'El veterinario está en camino',
          eta
        });
        
        // Notificar también al vet específicamente
        emergencyNamespace.to(`vet:${vetId}`).emit('status:updated', {
          status: 'on-way',
          message: 'Estado actualizado: En camino',
          eta
        });
      } catch (error) {
        console.error('Error updating on-way status:', error);
      }
    });

    // Veterinario ha llegado
    socket.on('emergency:arrived', async (data) => {
      const { emergencyId, vetId } = data;
      
      try {
        await Appointment.findByIdAndUpdate(emergencyId, {
          'tracking.status': 'arrived',
          'tracking.arrivedAt': new Date()
        });

        // Notificar a todos los participantes
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
          status: 'arrived',
          message: 'El veterinario ha llegado'
        });
        
        // Notificar también al vet específicamente
        emergencyNamespace.to(`vet:${vetId}`).emit('status:updated', {
          status: 'arrived',
          message: 'Estado actualizado: Has llegado'
        });

        socket.emit('emergency:arrived:success');
      } catch (error) {
        console.error('Error updating arrived status:', error);
      }
    });

    // Clínica confirma que el tutor llegó (solo para urgencias en clínica)
    socket.on('emergency:tutor-arrived', async (data) => {
      const { emergencyId, vetId } = data;
      
      try {
        const emergency = await Appointment.findById(emergencyId);
        if (!emergency) {
          socket.emit('emergency:tutor-arrived:error', {
            message: 'No se encontró la urgencia seleccionada.'
          });
          return;
        }

        // Verificar que sea urgencia en clínica
        if (emergency.mode !== 'clinic') {
          socket.emit('emergency:tutor-arrived:error', {
            message: 'Este estado solo aplica para urgencias en clínica.'
          });
          return;
        }

        // Verificar que el vet es el asignado
        if (emergency.vetId?.toString() !== vetId?.toString()) {
          socket.emit('emergency:tutor-arrived:error', {
            message: 'No tienes permiso para actualizar esta urgencia.'
          });
          return;
        }

        await Appointment.findByIdAndUpdate(emergencyId, {
          'tracking.status': 'tutor-arrived',
          'tracking.tutorArrivedAt': new Date(),
          status: 'in_progress'
        });

        // Notificar al usuario
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
          status: 'tutor-arrived',
          message: 'El tutor ha llegado a la clínica. La atención comenzará pronto.'
        });

        emergencyNamespace.to(`user:${emergency.userId}`).emit('emergency:tutor-arrived', {
          emergencyId,
          message: 'Has llegado a la clínica. La atención comenzará pronto.'
        });

        socket.emit('emergency:tutor-arrived:success');
      } catch (error) {
        console.error('Error updating tutor-arrived status:', error);
        socket.emit('emergency:tutor-arrived:error', {
          message: error.message || 'No se pudo actualizar el estado.'
        });
      }
    });

    // Emergencia completada
    socket.on('emergency:complete', async (data) => {
      const { emergencyId, vetId, notes } = data;
      
      try {
        const emergency = await Appointment.findById(emergencyId);
        if (!emergency) {
          socket.emit('emergency:complete:error', {
            message: 'No se encontró la urgencia seleccionada.'
          });
          return;
        }

        const currentTrackingStatus = emergency?.tracking?.status;
        if (currentTrackingStatus !== 'in-service' && currentTrackingStatus !== 'completed') {
          socket.emit('emergency:complete:error', {
            message: 'El tutor debe confirmar la llegada antes de finalizar la urgencia.'
          });
          return;
        }

        await Appointment.findByIdAndUpdate(emergencyId, {
          status: 'completed',
          'tracking.status': 'completed',
          'tracking.completedAt': new Date(),
          notes: notes || ''
        });

        // Liberar veterinario
        await Vet.findByIdAndUpdate(vetId, {
          currentStatus: 'available',
          activeEmergency: null
        });

        // Notificar al usuario
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
          status: 'completed',
          message: 'Urgencia completada'
        });

        // Solicitar rating
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('request:rating');

        socket.emit('emergency:complete:success');
      } catch (error) {
        console.error('Error completing emergency:', error);
        socket.emit('emergency:complete:error', {
          message: error.message || 'No se pudo completar la urgencia.'
        });
      }
    });

    // Usuario confirma que el veterinario llegó
    socket.on('emergency:user-confirm-arrival', async (data) => {
      const { emergencyId, userId } = data;

      try {
        // Verificar que la urgencia existe y pertenece al usuario
        const emergency = await Appointment.findById(emergencyId);
        if (!emergency) {
          socket.emit('emergency:user-confirm-arrival:error', {
            message: 'Urgencia no encontrada'
          });
          return;
        }

        // Verificar que el usuario es el dueño de la urgencia
        if (emergency.userId.toString() !== userId?.toString()) {
          socket.emit('emergency:user-confirm-arrival:error', {
            message: 'No tienes permiso para confirmar esta urgencia'
          });
          return;
        }

        // Verificar que el estado es 'arrived' antes de confirmar
        if (emergency.tracking?.status !== 'arrived') {
          socket.emit('emergency:user-confirm-arrival:error', {
            message: `No se puede confirmar la llegada. Estado actual: ${emergency.tracking?.status || 'desconocido'}`
          });
          return;
        }

        // Actualizar estado a 'in-service' y registrar confirmación manual
        const updatedEmergency = await Appointment.findByIdAndUpdate(
          emergencyId,
          {
            'tracking.status': 'in-service',
            'tracking.userConfirmedAt': new Date(),
            'tracking.autoConfirmed': false, // Confirmación manual, no automática
            status: 'in_progress'
          },
          { new: true }
        ).populate('vetId').populate('petId');

        console.log(`✅ Usuario ${userId} confirmó la llegada del veterinario para urgencia ${emergencyId}`);

        // Notificar a todos los participantes
        emergencyNamespace.to(`emergency:${emergencyId}`).emit('status:updated', {
          status: 'in-service',
          message: 'Usuario confirmó la llegada del veterinario',
          userConfirmedAt: new Date()
        });

        // Notificar al veterinario
        if (updatedEmergency?.vetId?._id) {
          emergencyNamespace.to(`vet:${updatedEmergency.vetId._id}`).emit('emergency:user-confirmed', {
            emergencyId,
            userConfirmedAt: new Date(),
            message: 'El usuario confirmó tu llegada. Puedes comenzar la atención.'
          });
        }

        // Notificar al usuario
        emergencyNamespace.to(`user:${userId}`).emit('emergency:user-confirm-arrival:success', {
          emergencyId,
          status: 'in-service',
          message: 'Llegada confirmada. La atención ha comenzado.'
        });

        socket.emit('emergency:user-confirm-arrival:success', {
          emergencyId,
          status: 'in-service'
        });
      } catch (error) {
        console.error('Error confirming arrival by user:', error);
        socket.emit('emergency:user-confirm-arrival:error', {
          message: error.message || 'No se pudo confirmar la llegada'
        });
      }
    });

    // Usuario cancela emergencia
    socket.on('emergency:cancel', async (data) => {
      const { emergencyId, userId, reason } = data;
      
      try {
        const emergency = await Appointment.findById(emergencyId);
        
        // Calcular cargo por cancelación
        let cancellationFee = 0;
        const timeSinceCreated = Date.now() - emergency.createdAt.getTime();
        
        // Para urgencias en clínica: 50% del total después de crear la solicitud
        if (emergency.mode === 'clinic') {
          const total = emergency.pricing?.total || 0;
          cancellationFee = Math.round(total * 0.5); // 50% del total
        } else {
          // Para urgencias a domicilio: cargo solo si pasaron más de 2 minutos
          cancellationFee = timeSinceCreated > 120000 ? 5000 : 0;
        }

        // Extraer el código del motivo si viene en el payload
        const reasonCode = data.reasonCode || null;
        const finalReason = reason || 'user_cancelled';

        await Appointment.findByIdAndUpdate(emergencyId, {
          status: 'cancelled',
          'tracking.status': 'cancelled',
          cancellationReason: finalReason,
          cancellationReasonCode: reasonCode, // Código para análisis estadístico
          cancellationFee
        });

        await cancelOffer(emergencyId, reason || 'user_cancelled');

        // Si había vet asignado, liberarlo
        if (emergency.vetId) {
          await Vet.findByIdAndUpdate(emergency.vetId, {
            currentStatus: 'available',
            activeEmergency: null
          });

          // Notificar al vet
          emergencyNamespace.to(`vet:${emergency.vetId}`).emit('emergency:cancelled', {
            emergencyId,
            reason
          });
        }

        socket.emit('emergency:cancel:success', { cancellationFee });
      } catch (error) {
        console.error('Error cancelling emergency:', error);
        socket.emit('emergency:cancel:error', { message: error.message });
      }
    });

    // Calcular ETA
    socket.on('calculate:eta', async (data) => {
      const { vetLocation, userLocation } = data;
      
      try {
        // Cálculo simple: 2 minutos por km
        const distance = calculateDistance(
          vetLocation.lat,
          vetLocation.lng,
          userLocation.lat,
          userLocation.lng
        );
        
        const eta = Math.ceil(distance * 2); // 2 min/km
        
        socket.emit('eta:calculated', { eta, distance });
      } catch (error) {
        console.error('Error calculating ETA:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Emergency socket disconnected:', socket.id);
      if (connectedVetId) {
        Vet.findById(connectedVetId)
          .then((vet) => {
            if (!vet) return;
            if (vet.activeEmergency) {
              return Vet.findByIdAndUpdate(connectedVetId, {
                currentStatus: 'busy',
                lastSeenAt: new Date()
              });
            }
            return Vet.findByIdAndUpdate(connectedVetId, {
              lastSeenAt: new Date()
            });
          })
          .catch((error) => {
            console.error('Error updating vet lastSeenAt on disconnect:', error);
          });
      }
    });
  });

  emergencyNamespace.offerManager = offerManager;

  // Exponer la función para verificar urgencias pendientes cuando un vet se vuelve disponible
  emergencyNamespace.checkPendingEmergenciesForVet = checkPendingEmergenciesForVet;
  
  return offerManager;
};

export default setupEmergencySocket;

