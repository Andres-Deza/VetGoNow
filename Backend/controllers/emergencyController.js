import Appointment from '../models/Appointment.js';
import Vet from '../models/Veterinarian.js';
import Pet from '../models/Pet.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import PricingConfig from '../models/PricingConfig.js';
import SavedCard from '../models/SavedCard.js';

/**
 * Calcula el costo de una urgencia basado en múltiples factores
 * Ahora usa la configuración de precios desde la base de datos
 */
const calculatePricing = async (data) => {
  const {
    mode, // 'home' o 'clinic'
    distance, // distancia en km (ya no se usa para recargos, está incluida en precio base)
    currentHour, // hora actual (0-23)
    isCritical, // si tiene signos críticos
    vetType = 'independent', // 'clinic' o 'independent'
    customBasePrice = null // precio base personalizado del vet
  } = data;

  // Obtener configuración de precios (más reciente) - forzar nueva consulta sin caché
  let pricingConfig = await PricingConfig.findOne().sort({ updatedAt: -1 });
  if (!pricingConfig) {
    // Si no existe, crear con valores por defecto
    pricingConfig = await PricingConfig.create({});
  }
  
  // Convertir a objeto plano para evitar problemas de caché
  const config = pricingConfig.toObject();

  // Debug: Log de configuración obtenida
  console.log('📋 PricingConfig obtenido:', {
    independent: config.emergency?.independent,
    clinic: config.emergency?.clinic,
    peakHoursRange: config.emergency?.peakHoursRange,
    distanceSurchargePerKm: config.emergency?.distanceSurchargePerKm
  });

  // Determinar si es hora punta
  const hour = currentHour !== undefined ? currentHour : new Date().getHours();
  const { start, end } = config.emergency.peakHoursRange;
  const isPeakHours = (start > end) 
    ? (hour >= start || hour < end) // Rango que cruza medianoche (ej: 20-8)
    : (hour >= start && hour < end);  // Rango normal (ej: 8-20)

  // Obtener precio base según tipo de vet, modalidad (home/clinic) y horario
  // Independientes solo tienen urgencias a domicilio (home)
  // Clínicas tienen tanto a domicilio (home) como presenciales en clínica (clinic)
  const vetEmergencyPrices = config.emergency[vetType] || config.emergency.independent;
  
  // Determinar modalidad: independientes siempre 'home', clínicas según el mode
  const emergencyMode = (vetType === 'independent') ? 'home' : mode;
  
  // Obtener precios según modalidad - manejar estructura antigua y nueva
  let vetPrices;
  if (vetEmergencyPrices && vetEmergencyPrices[emergencyMode]) {
    // Nueva estructura: tiene home/clinic anidado
    vetPrices = vetEmergencyPrices[emergencyMode];
  } else if (vetEmergencyPrices && (vetEmergencyPrices.normalHours !== undefined || vetEmergencyPrices.peakHours !== undefined)) {
    // Estructura antigua: normalHours/peakHours directamente
    vetPrices = {
      normalHours: vetEmergencyPrices.normalHours || 19990,
      peakHours: vetEmergencyPrices.peakHours || 24990
    };
  } else {
    // Fallback a valores por defecto
    vetPrices = {
      normalHours: config.emergency.independent?.home?.normalHours || 19990,
      peakHours: config.emergency.independent?.home?.peakHours || 24990
    };
  }
  
  const basePrice = isPeakHours ? vetPrices.peakHours : vetPrices.normalHours;
  
  // Debug: Log de precio base calculado
  console.log(`💰 Precio base calculado - Tipo: ${vetType}, Hora punta: ${isPeakHours}, Precio: ${basePrice}`);

  // Si el vet tiene precio personalizado, usarlo; sino usar precio según tipo y horario
  let base = customBasePrice || basePrice;
  let timeSurcharge = 0;

  // El recargo por distancia ya está incluido en el precio base del servicio
  // No se calcula por separado

  // Ya no aplicamos recargo adicional por horario ya que el precio base ya considera hora punta
  // El timeSurcharge queda en 0

  // Calcular recargo por urgencia crítica (por separado para mostrar en el desglose)
  let criticalSurcharge = 0;
  let baseBeforeCritical = base;
  
  if (isCritical) {
    criticalSurcharge = Math.round(base * 0.2); // 20% adicional
    base = Math.round(base * 1.2); // Precio base con recargo crítico aplicado
  }

  // El total es solo el precio base (que ya incluye desplazamiento) + recargo crítico si aplica
  const total = base + timeSurcharge;

  return {
    base: base || 0,
    baseBeforeCritical: baseBeforeCritical || 0,
    criticalSurcharge: criticalSurcharge || 0,
    distanceSurcharge: 0, // Ya no se calcula, está incluido en el precio base
    timeSurcharge: timeSurcharge || 0,
    total: total || 0,
    currency: 'CLP',
    vetType: vetType || 'independent',
    isCritical: isCritical || false
  };
};

/**
 * Calcula distancia entre dos puntos (Haversine)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
};

/**
 * Encuentra veterinarios cercanos disponibles
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {number} maxDistance - Distancia máxima en km
 * @param {string} mode - 'home' o 'clinic' (opcional, para filtrar por tipo de urgencia)
 */
const findNearbyVets = async (lat, lng, maxDistance = 10, mode = 'home') => {
  try {
    console.log(`🔍 Buscando veterinarios cercanos a [${lat}, ${lng}] dentro de ${maxDistance}km (modo: ${mode})`);
    
    // Construir query base
    const query = {
      availableNow: true,
      supportsEmergency: true,
      isApproved: true,
      // Solo veterinarios disponibles (no ocupados con otra urgencia)
      currentStatus: { $in: ['available', 'offline'] }, // Solo available u offline, no busy ni on-way
      // Sin urgencias activas
      $or: [
        { activeEmergency: null },
        { activeEmergency: { $exists: false } }
      ],
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // MongoDB usa [lng, lat]
          },
          $maxDistance: maxDistance * 1000 // convertir a metros
        }
      }
    };
    
    // Si es urgencia presencial (clinic), solo buscar clínicas con supportsInPersonEmergency
    if (mode === 'clinic') {
      query.vetType = 'clinic';
      query.supportsInPersonEmergency = true;
      console.log('🏥 Filtrando solo clínicas con urgencias presenciales habilitadas');
    }
    
    const vets = await Vet.find(query).limit(10);

    console.log(`📊 Veterinarios encontrados: ${vets.length}`);
    vets.forEach(vet => {
      console.log(`  - ${vet.name} (${vet._id}): availableNow=${vet.availableNow}, currentStatus=${vet.currentStatus}, activeEmergency=${vet.activeEmergency}, supportsEmergency=${vet.supportsEmergency}, isApproved=${vet.isApproved}`);
    });

    // Calcular distancia y ETA para cada vet
    const result = vets.map(vet => {
      if (!vet.location || !vet.location.coordinates) return null;
      const [vetLng, vetLat] = vet.location.coordinates;
      const distance = calculateDistance(lat, lng, vetLat, vetLng);
      const eta = Math.round(distance * 2); // ETA aproximado: 2 min por km

      // Calcular rating real desde las calificaciones
      let rating = null;
      if (vet.ratings && vet.ratings.total >= 5 && vet.ratings.average > 0) {
        rating = vet.ratings.average;
      }

      const resultVet = {
        _id: vet._id,
        name: vet.name,
        specialization: vet.specialization,
        rating: rating, // Solo incluir si hay calificaciones válidas
        distance: Math.round(distance * 10) / 10, // redondear a 1 decimal
        eta,
        location: { lat: vetLat, lng: vetLng },
        profileImage: vet.profileImage,
        vetType: vet.vetType || 'independent', // 'clinic' o 'independent'
        basePrice: vet.basePrice || null, // precio personalizado o null
        comuna: vet.comuna || null,
        region: vet.region || null
      };

      // Para clínicas, incluir información adicional
      if (vet.vetType === 'clinic') {
        resultVet.clinicAddress = vet.clinicAddress || null;
        resultVet.clinicPhone = vet.clinicPhone || null;
        resultVet.clinicMobile = vet.clinicMobile || null;
        resultVet.tradeName = vet.tradeName || null;
      }

      return resultVet;
    }).filter(vet => vet !== null).sort((a, b) => a.distance - b.distance);
    
    console.log(`✅ Veterinarios válidos después de filtrar: ${result.length}`);
    return result;
  } catch (error) {
    console.error('❌ Error finding nearby vets:', error);
    return [];
  }
};

/**
 * Crea una solicitud de urgencia
 */
export const createEmergencyRequest = async (req, res) => {
  try {
    console.log('🚨 Iniciando creación de urgencia...');
    console.log('📦 Body recibido:', JSON.stringify(req.body, null, 2));
    
    const {
      petId,
      mode, // 'home' o 'clinic'
      triage,
      location,
      assignment,
      consent,
      payment
    } = req.body;

    // Validaciones básicas
    if (!petId || !mode || !triage || !location) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }
    
    console.log('✅ Validación básica pasada');

    // Verificar que la mascota existe
    console.log('🔍 Buscando mascota:', petId);
    const pet = await Pet.findOne({ _id: petId, isDeleted: { $ne: true } });
    if (!pet) {
      console.log('Mascota no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }
    console.log('✅ Mascota encontrada:', pet.name);

    // Obtener userId del token
    const userId = req.userId || req.user?.id;
    if (!userId) {
      console.log('❌ Usuario no autenticado');
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    console.log('✅ Usuario autenticado:', userId);

  // Validar que no exista una urgencia activa para esta mascota
  const activeEmergency = await Appointment.findOne({
    userId,
    petId,
    isEmergency: true,
    status: { $nin: ['completed', 'cancelled'] }
  });

  if (activeEmergency) {
    console.log('⚠️ Ya existe una urgencia activa para esta mascota');
    console.log('📋 Urgencia existente:', {
      id: activeEmergency._id,
      status: activeEmergency.status,
      createdAt: activeEmergency.createdAt
    });
    return res.status(409).json({
      success: false,
      message: `Ya tienes una urgencia activa para ${pet.name}. Revisa su seguimiento o espera a que se complete.`,
      requestId: activeEmergency._id,
      existingEmergency: {
        id: activeEmergency._id,
        status: activeEmergency.status,
        createdAt: activeEmergency.createdAt,
        petName: pet.name
      }
    });
  }

  // Validar también que el usuario no tenga múltiples urgencias activas (por si acaso)
  const userActiveEmergencies = await Appointment.countDocuments({
    userId,
    isEmergency: true,
    status: { $nin: ['completed', 'cancelled'] }
  });

  if (userActiveEmergencies >= 3) {
    console.log('⚠️ Usuario tiene demasiadas urgencias activas:', userActiveEmergencies);
    return res.status(409).json({
      success: false,
      message: 'Tienes demasiadas urgencias activas. Por favor completa o cancela alguna antes de crear una nueva.',
      requestId: null
    });
  }

    // Verificar que la mascota pertenece al usuario
    if (pet.userId.toString() !== userId.toString()) {
      console.log('❌ La mascota no pertenece al usuario');
      return res.status(403).json({
        success: false,
        message: 'La mascota no pertenece al usuario'
      });
    }
    console.log('✅ Mascota pertenece al usuario');

    // Calcular costos
    console.log('💰 Calculando costos...');
    const isCritical = triage.criticalFlags && triage.criticalFlags.length > 0;
    let distance = 5; // Distancia por defecto en desarrollo
    let vetType = 'independent'; // Por defecto
    let customBasePrice = null;

    // Si hay un vet asignado, obtener su tipo y precio
    if (assignment?.preferredVetId) {
      console.log('🔍 Buscando vet preferido:', assignment.preferredVetId);
      try {
        const selectedVet = await Vet.findById(assignment.preferredVetId);
        if (selectedVet) {
          console.log('✅ Vet encontrado:', selectedVet.name);
          vetType = selectedVet.vetType || 'independent';
          customBasePrice = selectedVet.basePrice || null;
          // Si es domicilio, calcular distancia al vet seleccionado
          if (mode === 'home' && location.lat && location.lng && selectedVet.location?.coordinates) {
            const [vetLng, vetLat] = selectedVet.location.coordinates;
            distance = calculateDistance(location.lat, location.lng, vetLat, vetLng);
            console.log('📍 Distancia calculada:', distance, 'km');
          }
        }
      } catch (err) {
        console.log('⚠️ Error al buscar vet, usando valores por defecto:', err.message);
      }
    } else if (mode === 'home' && location.lat && location.lng) {
      // Si no hay vet asignado, calcular distancia al más cercano (solo para domicilio)
      console.log('🔍 Calculando distancia al vet más cercano...');
      try {
        distance = await calculateDistanceToNearestVet(location.lat, location.lng, mode);
        console.log('📍 Distancia al más cercano:', distance, 'km');
      } catch (err) {
        console.log('⚠️ Error al calcular distancia, usando 5km por defecto:', err.message);
        distance = 5;
      }
    }

    const pricing = await calculatePricing({
      mode,
      distance,
      currentHour: new Date().getHours(),
      isCritical,
      vetType,
      customBasePrice
    });

    // Determinar prioridad
    let priorityHint = 'medium';
    if (isCritical) {
      priorityHint = 'high';
    } else if (triage.mainReason === 'otro' || !triage.mainReason) {
      priorityHint = 'low';
    }
    console.log('🎯 Prioridad:', priorityHint);

    // Crear la solicitud
    console.log('📝 Creando objeto de urgencia...');
    
    // Determinar si usar bypass de pago (desarrollo, dev_bypass, o cash)
    // Mercado Pago no usa bypass - se procesa después
    const usePaymentBypass = process.env.NODE_ENV !== 'production' || 
                             payment?.method === 'dev_bypass' || 
                             payment?.method === 'cash';
    
    if (usePaymentBypass) {
      console.log(`💳 Método de pago: ${payment?.method || 'desarrollo'}`);
      if (payment?.method === 'cash') {
        console.log('💵 Pago en efectivo - Se pagará al veterinario directamente');
      } else if (payment?.method === 'dev_bypass') {
        console.log('🔧 Bypass de desarrollo activo');
      }
    } else if (payment?.method === 'mercadopago') {
      console.log('💳 Método de pago: Mercado Pago - El pago se procesará después');
    }
    
    const appointmentData = {
      userId,
      petId,
      appointmentDate: new Date(),
      scheduledTime: new Date().toISOString(),
      isEmergency: true,
      mode,
      triage: {
        ...triage,
        priorityHint
      },
      location: {
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        accessNotes: location.accessNotes,
        clinicId: location.clinicId || null
      },
      assignment: {
        strategy: assignment?.strategy || 'auto',
        preferredVetId: assignment?.preferredVetId || null
      },
      pricing,
      consent: {
        tosAccepted: consent?.tosAccepted || false,
        recordShare: consent?.recordShare || false
      },
      payment: {
        method: payment?.method || 'dev_bypass',
        savedTokenId: payment?.savedTokenId || null,
        provider: payment?.method === 'mercadopago' ? 'mercadopago' : 
                  payment?.method === 'webpay' ? 'webpay' : null
      },
      // Marcar como pagado automáticamente si usamos bypass
      isPaid: usePaymentBypass,
      status: (mode === 'clinic' && assignment?.preferredVetId) ? 'in_progress' : 'pending',
      appointmentType: mode === 'home' ? 'home visit' : mode === 'clinic' ? 'clinic visit' : 'online consultation',
      // Para urgencias en clínica con vet asignado, establecer tracking.status inicial
      tracking: (mode === 'clinic' && assignment?.preferredVetId) ? {
        status: 'accepted',
        acceptedAt: new Date()
      } : {
        status: 'pending'
      }
    };
    
    // Si es urgencia en clínica con vet asignado, asignar el vet directamente
    if (mode === 'clinic' && assignment?.preferredVetId) {
      appointmentData.vetId = assignment.preferredVetId;
    }

    console.log('📦 Datos del appointment:', JSON.stringify(appointmentData, null, 2));
    console.log('💾 Creando instancia de Appointment...');
    
    const emergencyRequest = new Appointment(appointmentData);
    
    console.log('💾 Guardando en MongoDB...');
    await emergencyRequest.save();
    console.log('✅ Urgencia guardada con ID:', emergencyRequest._id);
    console.log(`💳 Estado de pago: ${emergencyRequest.isPaid ? 'PAGADO (bypass)' : 'PENDIENTE'}`);

    // Si es urgencia en clínica con vet asignado, crear conversación y notificar
    if (mode === 'clinic' && assignment?.preferredVetId) {
      try {
        const vetId = assignment.preferredVetId;
        const vet = await Vet.findById(vetId);
        
        if (!vet) {
          console.error('❌ Veterinario asignado no encontrado:', vetId);
          return res.status(404).json({
            success: false,
            message: 'Veterinario seleccionado no encontrado'
          });
        } else if (vet.currentStatus === 'busy' || vet.activeEmergency) {
          console.error(`❌ Veterinario ${vetId} no está disponible (status: ${vet.currentStatus}, activeEmergency: ${vet.activeEmergency})`);
          return res.status(409).json({
            success: false,
            message: 'El veterinario seleccionado no está disponible en este momento. Está atendiendo otra urgencia.'
          });
        } else if (!vet.availableNow || !vet.supportsEmergency || !vet.isApproved) {
          console.error(`❌ Veterinario ${vetId} no cumple requisitos (availableNow: ${vet.availableNow}, supportsEmergency: ${vet.supportsEmergency}, isApproved: ${vet.isApproved})`);
          return res.status(409).json({
            success: false,
            message: 'El veterinario seleccionado no está disponible para emergencias en este momento.'
          });
        } else {
          // Crear conversación
          const userObjectId = emergencyRequest.userId?._id || emergencyRequest.userId;
          const petObjectId = emergencyRequest.petId?._id || emergencyRequest.petId;
          
          let conversation = await Conversation.findOne({
            userId: userObjectId,
            vetId
          });

          if (conversation) {
            const needsUpdate =
              !conversation.appointmentId ||
              conversation.appointmentId.toString() !== emergencyRequest._id.toString() ||
              (petObjectId && (!conversation.petId || conversation.petId.toString() !== petObjectId.toString()));

            if (needsUpdate) {
              conversation.appointmentId = emergencyRequest._id;
              if (petObjectId) {
                conversation.petId = petObjectId;
              }
              await conversation.save();
            }
          } else {
            conversation = await Conversation.create({
              userId: userObjectId,
              vetId,
              appointmentId: emergencyRequest._id,
              petId: petObjectId,
              messages: []
            });
          }

          // Marcar vet como ocupado
          await Vet.findByIdAndUpdate(vetId, {
            currentStatus: 'busy',
            activeEmergency: emergencyRequest._id
          });

          // Notificar al usuario y al vet vía Socket.IO
          const emergencyNamespace = req.app.get('io')?.of('/emergency');
          if (emergencyNamespace) {
            // Notificar al usuario
            emergencyNamespace.to(`user:${userObjectId}`).emit('emergency:accepted', {
              emergency: emergencyRequest,
              vet: {
                name: vet.name,
                phoneNumber: vet.phoneNumber,
                profileImage: vet.profileImage
              },
              conversationId: conversation._id.toString()
            });

            // Notificar al vet
            emergencyNamespace.to(`vet:${vetId}`).emit('emergency:assigned', {
              emergencyId: emergencyRequest._id.toString(),
              emergency: emergencyRequest
            });

            // Notificar en la sala de la emergencia
            emergencyNamespace.to(`emergency:${emergencyRequest._id}`).emit('status:updated', {
              status: 'accepted',
              message: 'Clínica asignada',
              vet: { name: vet.name }
            });
          }

          console.log('✅ Urgencia en clínica asignada directamente a:', vet.name);
        }
      } catch (clinicError) {
        console.error('❌ Error al asignar urgencia en clínica:', clinicError);
      }
    } else {
      // 🚨 Ofrecer urgencia secuencialmente a veterinarios cercanos (solo para urgencias a domicilio o sin vet asignado)
      try {
        const offerManager = req.app.get('emergencyOfferManager');
        let candidates = [];

        // Si es asignación manual con un vet específico, buscar solo ese vet
        if (assignment?.strategy === 'manual' && assignment?.preferredVetId) {
          console.log('👤 Asignación manual: buscando solo el veterinario seleccionado...');
          
          try {
            const selectedVet = await Vet.findById(assignment.preferredVetId);
            if (selectedVet && 
                selectedVet.availableNow && 
                selectedVet.supportsEmergency && 
                selectedVet.isApproved &&
                selectedVet.currentStatus === 'available' &&
                !selectedVet.activeEmergency) {
              // Calcular distancia si tiene ubicación
              let vetDistance = null;
              let vetEta = null;
              
              if (selectedVet.location?.coordinates && location.lat && location.lng) {
                const [vetLng, vetLat] = selectedVet.location.coordinates;
                vetDistance = calculateDistance(location.lat, location.lng, vetLat, vetLng);
                vetEta = Math.round(vetDistance * 2); // ETA aproximado: 2 min por km
              }

              // Calcular rating real desde las calificaciones
              let rating = null;
              if (selectedVet.ratings && selectedVet.ratings.total >= 5 && selectedVet.ratings.average > 0) {
                rating = selectedVet.ratings.average;
              }

              candidates = [{
                _id: selectedVet._id,
                name: selectedVet.name,
                specialization: selectedVet.specialization,
                vetType: selectedVet.vetType,
                distance: vetDistance,
                eta: vetEta,
                rating
              }];
              
              console.log(`✅ Veterinario seleccionado encontrado: ${selectedVet.name} (${candidates.length} candidato)`);
            } else {
              console.warn(`⚠️ Veterinario seleccionado no está disponible o no cumple requisitos`);
              const emergencyNamespace = req.app.get('io')?.of('/emergency');
              if (emergencyNamespace) {
                emergencyNamespace
                  .to(`user:${userId}`)
                  .emit('emergency:selected-vet-unavailable', { 
                    emergencyId: emergencyRequest._id.toString(),
                    message: 'El veterinario seleccionado no está disponible en este momento'
                  });
              }
            }
          } catch (vetError) {
            console.error('❌ Error al buscar veterinario seleccionado:', vetError);
            const emergencyNamespace = req.app.get('io')?.of('/emergency');
            if (emergencyNamespace) {
              emergencyNamespace
                .to(`user:${userId}`)
                .emit('emergency:selected-vet-error', { 
                  emergencyId: emergencyRequest._id.toString(),
                  message: 'Error al buscar el veterinario seleccionado'
                });
            }
          }
        } else {
          // Asignación automática: buscar veterinarios cercanos
          console.log('🔔 Buscando veterinarios disponibles para oferta secuencial...');
          // Pasar el modo para filtrar correctamente (clinic = solo clínicas con urgencias presenciales)
          candidates = await findNearbyVets(location.lat, location.lng, 20, mode); // 20km radius
        }

        if (offerManager && candidates.length > 0) {
          const isManualAssignment = assignment?.strategy === 'manual';
          const assignmentType = isManualAssignment ? 'manual' : 'auto';
          console.log(`📢 Preparando oferta ${assignmentType === 'manual' ? 'MANUAL' : 'AUTOMÁTICA'} para ${candidates.length} veterinario(s)`);

          const offerPayload = {
            petName: pet.name,
            triage: {
              mainReason: triage.mainReason,
              criticalFlags: triage.criticalFlags || []
            },
            location: {
              lat: location.lat,
              lng: location.lng,
              address: location.address
            },
            pricing,
            priority: priorityHint,
            appointmentType: appointmentData.appointmentType
          };

          await offerManager.startOffer({
            appointment: emergencyRequest,
            candidates: candidates,
            payload: offerPayload,
            isManual: isManualAssignment
          });
        } else if (!offerManager) {
          console.warn('⚠️ No se pudo iniciar el gestor de ofertas (offerManager no disponible)');
        } else if (candidates.length === 0) {
          console.log('⚠️ No se encontraron veterinarios disponibles cercanos');
          const emergencyNamespace = req.app.get('io')?.of('/emergency');
          if (emergencyNamespace) {
            emergencyNamespace
              .to(`user:${userId}`)
              .emit('emergency:no-vets', { emergencyId: emergencyRequest._id.toString() });
          }
        }
      } catch (notifyError) {
        console.error('❌ Error al iniciar oferta de urgencia:', notifyError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Solicitud de urgencia creada',
      request: emergencyRequest,
      pricing
    });
  } catch (error) {
    console.error('Error creating emergency request:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud de urgencia',
      error: error.message,
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Calcula distancia al veterinario más cercano
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {string} mode - 'home' o 'clinic' (opcional)
 */
const calculateDistanceToNearestVet = async (lat, lng, mode = 'home') => {
  const nearbyVets = await findNearbyVets(lat, lng, 20, mode);
  if (nearbyVets.length > 0) {
    return nearbyVets[0].distance;
  }
  return 5; // Distancia por defecto si no hay vets cercanos
};

/**
 * Obtiene veterinarios disponibles cerca de una ubicación
 */
export const getNearbyVets = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10, mode = 'home' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere latitud y longitud'
      });
    }

    // Si mode === 'clinic', solo buscar clínicas con supportsInPersonEmergency
    const vets = await findNearbyVets(parseFloat(lat), parseFloat(lng), parseFloat(maxDistance), mode);

    res.json({
      success: true,
      vets
    });
  } catch (error) {
    console.error('Error getting nearby vets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener veterinarios cercanos',
      error: error.message
    });
  }
};

export const getPendingEmergenciesForVet = async (req, res) => {
  try {
    const vetId = req.user?.id || req.userId;

    if (!vetId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    const vet = await Vet.findById(vetId);

    if (!vet) {
      return res.status(404).json({
        success: false,
        message: 'Veterinario no encontrado',
      });
    }

    if (!vet.supportsEmergency) {
      return res.json({
        success: true,
        emergencies: [],
      });
    }

    const maxDistanceKm = Number(req.query.maxDistance || 30);
    const vetCoordinates = vet.location?.coordinates;

    const rawEmergencies = await Appointment.find({
      isEmergency: true,
      status: 'pending',
    })
      .populate('petId')
      .populate('userId', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    const vetIdStr = vet._id.toString();
    const now = Date.now();

    const emergencies = rawEmergencies
      .filter((emergency) => {
        const currentVet = emergency.offer?.currentVet
          ? emergency.offer.currentVet.toString()
          : null;
        
        // Verificar que la oferta es para este vet
        if (currentVet !== vetIdStr) {
          return false;
        }
        
        // Verificar que la oferta no ha expirado
        if (emergency.offer?.expiresAt) {
          const expiresAt = new Date(emergency.offer.expiresAt).getTime();
          if (expiresAt < now) {
            console.log(`⏱️ Oferta ${emergency._id} expirada para vet ${vetIdStr}`);
            return false;
          }
        }
        
        return true;
      })
      .map((emergency) => {
        let distanceKm = null;

        if (
          vetCoordinates &&
          vetCoordinates.length === 2 &&
          emergency.location?.lat != null &&
          emergency.location?.lng != null
        ) {
          distanceKm = calculateDistance(
            vetCoordinates[1],
            vetCoordinates[0],
            parseFloat(emergency.location.lat),
            parseFloat(emergency.location.lng),
          );
        }

        return {
          ...emergency,
          _id: emergency._id?.toString(),
          createdAt: emergency.createdAt,
          distanceKm,
          offer: emergency.offer
        };
      })
      .filter((emergency) => {
        if (emergency.distanceKm == null) {
          return true;
        }

        return emergency.distanceKm <= maxDistanceKm;
      });

    res.json({
      success: true,
      emergencies,
    });
  } catch (error) {
    console.error('Error fetching pending emergencies for vet:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las urgencias pendientes',
    });
  }
};

export const updateEmergencyUserDetails = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { additionalDetails, attachment } = req.body || {};

    if (!additionalDetails && !attachment) {
      return res.status(400).json({
        success: false,
        message: 'Debes enviar detalles adicionales o una imagen'
      });
    }

    const userId = req.userId || req.user?.id;
    const emergency = await Appointment.findById(requestId);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Urgencia no encontrada'
      });
    }

    const emergencyUserId = emergency.userId?._id?.toString() || emergency.userId?.toString();
    if (!userId || emergencyUserId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para actualizar esta urgencia'
      });
    }

    emergency.triage = emergency.triage || {};
    emergency.triage.attachments = emergency.triage.attachments || [];

    if (typeof additionalDetails === 'string') {
      const cleaned = additionalDetails.trim();
      if (cleaned.length > 0) {
        emergency.triage.notes = cleaned;
      }
    }

    if (attachment) {
      if (typeof attachment !== 'string' || !attachment.startsWith('data:')) {
        return res.status(400).json({
          success: false,
          message: 'Formato de imagen inválido'
        });
      }

      const approxBytes = Math.ceil((attachment.length * 3) / 4);
      const maxBytes = 2 * 1024 * 1024; // 2MB
      if (approxBytes > maxBytes) {
        return res.status(400).json({
          success: false,
          message: 'La imagen excede el tamaño máximo de 2MB'
        });
      }

      emergency.triage.attachments.push(attachment);
    }

    await emergency.save();

    const io = req.app.get('io');
    if (io) {
      const emergencyNamespace = io.of('/emergency');
      emergencyNamespace.to(`emergency:${requestId}`).emit('emergency:user-details-update', {
        emergencyId: emergency._id.toString(),
        triage: emergency.triage
      });

      const vetId = emergency.vetId?._id?.toString() || emergency.vetId?.toString();
      if (vetId) {
        emergencyNamespace.to(`vet:${vetId}`).emit('emergency:user-details-update', {
          emergencyId: emergency._id.toString(),
          triage: emergency.triage
        });
      }
    }

    res.json({
      success: true,
      message: 'Información actualizada',
      triage: emergency.triage
    });
  } catch (error) {
    console.error('Error updating emergency user details:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la información',
      error: error.message
    });
  }
};

/**
 * Calcula el precio estimado de una urgencia
 */
export const estimatePricing = async (req, res) => {
  try {
    const {
      mode,
      lat,
      lng,
      vetLat,
      vetLng,
      isCritical,
      vetId,
      vetType: providedVetType
    } = req.body;

    let distance = 0;
    let vetType = providedVetType || 'independent';
    let customBasePrice = null;

    // Si hay vetId, obtener tipo y precio del vet
    if (vetId) {
      const vet = await Vet.findById(vetId);
      if (vet) {
        vetType = vet.vetType || 'independent';
        customBasePrice = vet.basePrice || null;
      }
    }

    // La distancia ya no se calcula para el recargo, ya que está incluida en el precio base
    // El parámetro distance se pasa como 0 ya que no se usa para cálculo de recargos
    
    const pricing = await calculatePricing({
      mode,
      distance: 0, // Ya no se usa para cálculo de recargos, está incluido en precio base
      currentHour: new Date().getHours(),
      isCritical: isCritical || false,
      vetType,
      customBasePrice
    });

    res.json({
      success: true,
      pricing
    });
  } catch (error) {
    console.error('Error estimating pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular el precio',
      error: error.message
    });
  }
};

/**
 * Confirma y procesa el pago de una urgencia
 */
export const confirmEmergencyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { paymentMethod, paymentToken } = req.body;

    const request = await Appointment.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Verificar que el usuario es el dueño
    const userId = req.userId || req.user?.id;
    const requestUserId = request.userId._id || request.userId;
    
    if (requestUserId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }

    // Actualizar método de pago
    request.payment.method = paymentMethod;
    request.payment.savedTokenId = paymentToken;
    request.isPaid = true;
    request.status = 'pending'; // Cambiará a 'assigned' cuando se asigne un vet

    await request.save();

    // TODO: Aquí se procesaría el pago real con Mercado Pago/WebPay
    // Por ahora solo marcamos como pagado

    const conversation = await Conversation.findOne({
      userId: request.userId,
      vetId: request.vetId,
      appointmentId: requestId
    });

    res.json({
      success: true,
      message: 'Solicitud confirmada y pago procesado',
      request,
      conversationId: conversation?._id || null
    });
  } catch (error) {
    console.error('Error confirming emergency request:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar la solicitud',
      error: error.message
    });
  }
};

/**
 * Obtiene el estado de tracking de una urgencia
 */
export const getEmergencyTracking = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Appointment.findById(requestId)
      .populate('vetId', 'name profileImage specialization location phoneNumber')
      .populate('petId', 'name breed image')
      .populate('userId', 'name phoneNumber');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Verificar que el usuario es el dueño o el veterinario asignado
    const userId = req.userId || req.user?.id;
    const userRole = req.user?.role;
    const requestUserId = request.userId?._id || request.userId; // userId puede estar poblado o no
    const requestVetId = request.vetId?._id || request.vetId;

    const isOwner = requestUserId?.toString() === userId?.toString();
    const isAssignedVet = requestVetId && requestVetId.toString() === userId?.toString();

    console.log('🔍 Tracking - Verificando autorización:');
    console.log('   User autenticado:', userId);
    console.log('   Rol:', userRole);
    console.log('   Owner de la solicitud:', requestUserId?.toString());
    console.log('   Veterinario asignado:', requestVetId?.toString() || 'Ninguno (pendiente de asignación)');
    console.log('   Estado de la urgencia:', request.status);
    console.log('   Estado del tracking:', request.tracking?.status);
    console.log('   Oferta activa:', request.offer?.currentVet ? `Sí (vet: ${request.offer.currentVet})` : 'No');
    console.log('   Oferta expira:', request.offer?.expiresAt ? new Date(request.offer.expiresAt).toISOString() : 'N/A');

    if (!isOwner && !(userRole === 'Vet' && isAssignedVet)) {
      console.log('❌ No autorizado - IDs no coinciden o el vet no está asignado');
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }
    
    console.log('✅ Autorización correcta - Enviando datos de tracking');

    const conversation = await Conversation.findOne({
      userId: request.userId,
      vetId: request.vetId,
      appointmentId: requestId
    });

    res.json({
      success: true,
      request,
      conversationId: conversation?._id || null
    });
  } catch (error) {
    console.error('Error getting emergency tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el tracking',
      error: error.message
    });
  }
};

export const expandEmergencySearch = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const emergency = await Appointment.findById(requestId).populate('petId').populate('userId');

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Urgencia no encontrada'
      });
    }

    // Verificar que el usuario es el dueño de la urgencia
    const emergencyUserId = emergency.userId?._id?.toString() || emergency.userId?.toString();
    if (emergencyUserId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar esta urgencia'
      });
    }

    // Verificar que está en modo manual
    if (emergency.assignment?.strategy !== 'manual') {
      return res.status(400).json({
        success: false,
        message: 'La urgencia ya está en modo automático'
      });
    }

    // Verificar que está pendiente
    if (emergency.status !== 'pending' && emergency.tracking?.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'La urgencia ya no está pendiente'
      });
    }

    console.log(`🔄 Ampliando búsqueda para emergencia ${requestId}: cambiando de manual a automático`);

    // Cambiar a modo automático
    await Appointment.findByIdAndUpdate(requestId, {
      $set: {
        'assignment.strategy': 'auto',
        'assignment.preferredVetId': null,
        'offer.manualAttemptCount': 0,
        'offer.status': 'idle',
        'offer.currentVet': null,
        'offer.expiresAt': null
      }
    });

    // Buscar veterinarios cercanos
    if (!emergency.location?.lat || !emergency.location?.lng) {
      return res.status(400).json({
        success: false,
        message: 'La urgencia no tiene ubicación válida'
      });
    }

    const nearbyVets = await findNearbyVets(
      emergency.location.lat,
      emergency.location.lng,
      20,
      emergency.mode || 'home'
    );

    if (nearbyVets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron veterinarios disponibles en el área'
      });
    }

    const offerManager = req.app.get('emergencyOfferManager');
    if (!offerManager) {
      return res.status(500).json({
        success: false,
        message: 'El gestor de ofertas no está disponible'
      });
    }

    // Obtener nombre de la mascota
    let petName = 'Mascota';
    if (emergency.petId) {
      if (typeof emergency.petId === 'object' && emergency.petId.name) {
        petName = emergency.petId.name;
      } else {
        // Si petId es solo un ObjectId, hacer populate
        const pet = await Pet.findById(emergency.petId);
        if (pet && !pet.isDeleted) {
          petName = pet.name;
        }
      }
    }

    // Preparar payload de oferta
    const offerPayload = {
      petName: petName,
      triage: emergency.triage || {},
      location: {
        lat: emergency.location.lat,
        lng: emergency.location.lng,
        address: emergency.location.address
      },
      pricing: emergency.pricing || {},
      priority: emergency.triage?.priorityHint || 'medium',
      appointmentType: emergency.appointmentType || 'home visit'
    };

    // Reiniciar oferta con modo automático
    await offerManager.startOffer({
      appointment: emergency,
      candidates: nearbyVets,
      payload: offerPayload,
      isManual: false
    });

    // Notificar al usuario vía Socket.IO
    const emergencyNamespace = req.app.get('io')?.of('/emergency');
    if (emergencyNamespace) {
      emergencyNamespace.to(`user:${userId}`).emit('emergency:search-expanded', {
        emergencyId: requestId,
        message: 'Búsqueda ampliada. Buscando veterinarios disponibles...'
      });

      emergencyNamespace.to(`emergency:${requestId}`).emit('status:updated', {
        status: 'pending',
        message: 'Buscando veterinarios disponibles automáticamente...'
      });
    }

    res.json({
      success: true,
      message: 'Búsqueda ampliada exitosamente. Buscando veterinarios disponibles...',
      emergencyId: requestId
    });
  } catch (error) {
    console.error('Error expanding emergency search:', error);
    res.status(500).json({
      success: false,
      message: 'Error al ampliar la búsqueda',
      error: error.message
    });
  }
};

export const getUserActiveEmergencies = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const emergencies = await Appointment.find({
      userId,
      isEmergency: true,
      status: { $nin: ['completed', 'cancelled'] },
      $or: [
        { 'tracking.status': { $exists: false } },
        { 'tracking.status': { $nin: ['completed', 'cancelled'] } }
      ]
    })
      .populate('petId', 'name image species breed')
      .populate('vetId', 'name profileImage phoneNumber');

    const results = [];
    for (const emergency of emergencies) {
      let conversationId = null;
      if (emergency.vetId) {
        const conversation = await Conversation.findOne({
          userId,
          vetId: emergency.vetId._id || emergency.vetId,
          appointmentId: emergency._id
        }).select('_id');
        conversationId = conversation?._id || null;
      }

      results.push({
        id: emergency._id,
        status: emergency.status,
        triage: emergency.triage,
        location: emergency.location,
        pricing: emergency.pricing,
        createdAt: emergency.createdAt,
        pet: emergency.petId,
        vet: emergency.vetId,
        conversationId
      });
    }

    res.json({
      success: true,
      emergencies: results
    });
  } catch (error) {
    console.error('Error fetching user emergencies:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tus urgencias',
      error: error.message
    });
  }
};

