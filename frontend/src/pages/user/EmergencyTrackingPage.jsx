import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import PetAvatar from '../../components/PetAvatar';
import RatingModal from '../../components/RatingModal';

// Función helper para crear iconos personalizados según el estado
const createStatusIcon = (status, type = 'user') => {
  // Verificar que Google Maps esté disponible
  if (!window.google || !window.google.maps || !window.google.maps.Size || !window.google.maps.Point) {
    // Retornar un icono por defecto simple si Google Maps no está disponible
    return {
      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      scaledSize: { width: 40, height: 40 }
    };
  }

  const baseSize = 50;
  const anchor = { x: baseSize / 2, y: baseSize / 2 };
  
  // Icono para estado "pending" - Radar pulsante
  if (status === 'pending') {
    const svg = `
      <svg width="${baseSize}" height="${baseSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="20" fill="#FF6B6B" opacity="0.8">
          <animate attributeName="r" values="20;25;20" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="15" fill="#FF6B6B"/>
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="8" fill="#FFFFFF"/>
        <text x="${baseSize/2}" y="${baseSize/2 + 5}" text-anchor="middle" font-size="20" fill="#FF6B6B">🔍</text>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(baseSize, baseSize),
      anchor: new window.google.maps.Point(Number(anchor.x), Number(anchor.y))
    };
  }
  
  // Icono para estado "on-way" - Vehículo en movimiento
  if (status === 'on-way') {
    const svg = `
      <svg width="${baseSize}" height="${baseSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="22" fill="#3B82F6" opacity="0.3">
          <animate attributeName="r" values="22;28;22" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="18" fill="#3B82F6"/>
        <text x="${baseSize/2}" y="${baseSize/2 + 7}" text-anchor="middle" font-size="24" fill="#FFFFFF">🚗</text>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(baseSize, baseSize),
      anchor: new window.google.maps.Point(Number(anchor.x), Number(anchor.y))
    };
  }
  
  // Icono para estado "arrived" - Checkmark verde
  if (status === 'arrived') {
    const svg = `
      <svg width="${baseSize}" height="${baseSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="20" fill="#10B981" opacity="0.9">
          <animate attributeName="r" values="20;23;20" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="18" fill="#10B981"/>
        <path d="M ${baseSize/2 - 6} ${baseSize/2} L ${baseSize/2 - 2} ${baseSize/2 + 4} L ${baseSize/2 + 6} ${baseSize/2 - 4}" 
              stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(baseSize, baseSize),
      anchor: new window.google.maps.Point(Number(anchor.x), Number(anchor.y))
    };
  }
  
  // Icono para estado "in-service" - Atención médica
  if (status === 'in-service') {
    const svg = `
      <svg width="${baseSize}" height="${baseSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="20" fill="#8B5CF6"/>
        <text x="${baseSize/2}" y="${baseSize/2 + 7}" text-anchor="middle" font-size="24" fill="#FFFFFF">🏥</text>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(baseSize, baseSize),
      anchor: new window.google.maps.Point(Number(anchor.x), Number(anchor.y))
    };
  }
  
  // Icono por defecto - Casa para usuario, ubicación para vet
  const iconEmoji = type === 'user' ? '🏠' : '📍';
  const iconColor = type === 'user' ? '#EF4444' : '#3B82F6';
  const svg = `
    <svg width="${baseSize}" height="${baseSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${baseSize/2}" cy="${baseSize/2}" r="18" fill="${iconColor}"/>
      <text x="${baseSize/2}" y="${baseSize/2 + 7}" text-anchor="middle" font-size="24" fill="#FFFFFF">${iconEmoji}</text>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(baseSize, baseSize),
    anchor: new window.google.maps.Point(Number(anchor.x), Number(anchor.y))
  };
};

const EmergencyTrackingPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
  const REASON_LABELS = {
    trauma: 'Golpe/Trauma',
    bleeding: 'Sangrado',
    seizures: 'Convulsión',
    choking: 'Ahogo',
    vomiting: 'Vómitos persistentes',
    poisoning: 'Envenenamiento',
    fever: 'Fiebre alta',
    urination: 'Retención urinaria',
    pain: 'Dolor intenso',
    other: 'Otro'
  };
  
  const [emergency, setEmergency] = useState(null);
  const [vet, setVet] = useState(null);
  const [vetLocation, setVetLocation] = useState(null);
  const [status, setStatus] = useState('pending');
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGeolocationValidated, setIsGeolocationValidated] = useState(false);
  const [arrivalDistance, setArrivalDistance] = useState(null);
  const [directions, setDirections] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonOther, setCancelReasonOther] = useState('');

  // Opciones predefinidas de cancelación (similar a Uber)
  const cancellationReasons = [
    { value: 'no-longer-needed', label: 'Ya no lo necesito' },
    { value: 'found-other-vet', label: 'Encontré otro veterinario' },
    { value: 'changed-mind', label: 'Cambié de opinión' },
    { value: 'wrong-location', label: 'Ubicación incorrecta' },
    { value: 'pet-feeling-better', label: 'Mi mascota se siente mejor' },
    { value: 'too-expensive', label: 'Muy caro' },
    { value: 'other', label: 'Otro motivo' }
  ];

  // Mapeo de valores a textos legibles para el backend
  const getCancelReasonLabel = (value) => {
    const reason = cancellationReasons.find(r => r.value === value);
    return reason ? reason.label : value;
  };
  const [confirmingArrival, setConfirmingArrival] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [noVetsMessage, setNoVetsMessage] = useState(null);
  const [showCallToAction, setShowCallToAction] = useState(false);
  const [showCompletedMessage, setShowCompletedMessage] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);
  const [showExpandSearchBanner, setShowExpandSearchBanner] = useState(false);
  const [expandSearchMessage, setExpandSearchMessage] = useState('');
  const [isExpandingSearch, setIsExpandingSearch] = useState(false);
  const [clinicLocation, setClinicLocation] = useState(null);
  
  const socketRef = useRef(null);
  const chatSocketRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: ['places', 'geometry']
  });

  const fetchEmergencyDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/api/emergency/${requestId}/tracking`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setEmergency(data.request);
        // Priorizar tracking.status, luego status del appointment, luego 'pending'
        const trackingStatus = data.request.tracking?.status;
        const appointmentStatus = data.request.status;
        // Si el appointment está completado, usar 'completed'
        if (appointmentStatus === 'completed' || trackingStatus === 'completed') {
          setStatus('completed');
        } else {
          setStatus(trackingStatus || appointmentStatus || 'pending');
        }
        setEta(data.request.tracking?.eta);
        
        // Verificar si la llegada fue validada por geolocalización
        if (data.request.tracking?.autoConfirmed) {
          setIsGeolocationValidated(true);
          if (data.request.tracking?.arrivalDistance) {
            setArrivalDistance(data.request.tracking.arrivalDistance);
          }
        }
        
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        
        // Verificar si fue cancelada automáticamente (sin veterinarios disponibles)
        const cancellationReasonCode = data.request.cancellationReasonCode;
        const cancellationReason = data.request.cancellationReason || '';
        
        if (cancellationReasonCode === 'no-vets-available' || cancellationReasonCode === 'no-vets-timeout' ||
            cancellationReason.includes('No se encontraron veterinarios') || cancellationReason === 'timeout') {
          setNoVetsMessage('No se encontraron veterinarios disponibles en este momento. Te recomendamos agendar una cita presencial o de telemedicina.');
          setShowCallToAction(true);
        } else if (appointmentStatus === 'cancelled' || trackingStatus === 'cancelled') {
          // Si fue cancelada por otro motivo, mostrar mensaje genérico (sin "timeout")
          const friendlyMessage = cancellationReason === 'timeout' 
            ? 'La urgencia ha sido cancelada.' 
            : cancellationReason || 'La urgencia ha sido cancelada.';
          setNoVetsMessage(friendlyMessage);
          setShowCallToAction(false);
        }
        
        if (data.request.vetId) {
          setVet({
            name: data.request.vetId.name,
            phoneNumber: data.request.vetId.phoneNumber,
            profileImage: data.request.vetId.profileImage
          });
        }
        
        if (data.request.tracking?.currentLocation) {
          setVetLocation(data.request.tracking.currentLocation);
        }
        
        // Para urgencias en clínica, obtener ubicación de la clínica
        if (data.request.mode === 'clinic' && data.request.vetId) {
          // Si el vet tiene location, usarla como ubicación de la clínica
          if (data.request.vetId.location?.coordinates) {
            const [lng, lat] = data.request.vetId.location.coordinates;
            setClinicLocation({ lat, lng });
            // Si el estado es "in-progress" o similar, calcular ruta
            if (data.request.tracking?.status === 'in-service' || 
                data.request.tracking?.status === 'tutor-arrived' ||
                data.request.status === 'in_progress') {
              // Calcular ruta desde la ubicación del tutor hasta la clínica
              updateDirectionsToClinic({ lat, lng });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching emergency details:', error);
    } finally {
      setLoading(false);
    }
  }, [requestId, API_BASE]);

  // Función para ampliar la búsqueda (fuera del useEffect para que esté disponible en todo el componente)
  const handleExpandSearch = useCallback(async () => {
    try {
      setIsExpandingSearch(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/api/emergency/${requestId}/expand-search`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setShowExpandSearchBanner(false);
        setExpandSearchMessage('');
        // Recargar detalles de la emergencia
        await fetchEmergencyDetails();
      } else {
        alert(response.data.message || 'Error al ampliar la búsqueda. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error expanding search:', error);
      alert(error?.response?.data?.message || 'Error al ampliar la búsqueda. Intenta nuevamente.');
    } finally {
      setIsExpandingSearch(false);
    }
  }, [requestId, API_BASE, fetchEmergencyDetails]);

  useEffect(() => {
    fetchEmergencyDetails();

    // Polling periódico para sincronizar el estado (cada 10 segundos)
    const pollingInterval = setInterval(() => {
      fetchEmergencyDetails();
    }, 10000);

    const socket = io(`${API_BASE}/emergency`, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socket;

    const user = JSON.parse(localStorage.getItem('user'));

    const handleConnect = () => {
      console.log('Connected to emergency socket');
      if (user?.id) {
        socket.emit('join:user', user.id);
      }
      socket.emit('join:emergency', requestId);
    };

    const handleEmergencyAccepted = (data) => {
      console.log('Emergency accepted:', data);
      setVet(data.vet);
      setStatus('accepted');
      setEmergency((prev) => ({ ...prev, ...data.emergency }));
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    };

    const handleVetLocationUpdate = (location) => {
      console.log('Vet location updated:', location);
      setVetLocation(location);
      updateDirections(location);
    };

    const handleStatusUpdated = (data) => {
      console.log('Status updated:', data);
      if (data.status) {
        setStatus(data.status);
        // Si el status es 'completed', mostrar mensaje y recargar detalles
        if (data.status === 'completed') {
          // Recargar detalles desde el backend para asegurar sincronización
          fetchEmergencyDetails().then(() => {
            setShowCompletedMessage(true);
            setTimeout(() => {
              setShowCompletedMessage(false);
            }, 10000);
          });
        }
      }
      if (data.status === 'in-service') {
        setConfirmingArrival(false);
        setDirections(null); // Limpiar ruta cuando ya está en servicio
      } else if (data.status === 'arrived') {
        setDirections(null); // Limpiar ruta cuando ya llegó
      }
      if (data.eta) setEta(data.eta);
      
      // Si fue detectado automáticamente, mostrar mensaje
      if (data.autoDetected || data.geolocationValidated) {
        console.log(`📍 Llegada detectada automáticamente por geolocalización${data.distance ? ` (${data.distance}m de distancia)` : ''}`);
        if (data.distance) {
          setArrivalDistance(data.distance);
        }
        setIsGeolocationValidated(true);
      }
      if (data.autoConfirmed || data.geolocationValidated) {
        console.log('⏱️ Atención iniciada automáticamente por validación de geolocalización');
        setIsGeolocationValidated(true);
        if (data.distance) {
          setArrivalDistance(data.distance);
        }
      }
    };

    const handleUserConfirmSuccess = (data) => {
      console.log('User confirm arrival success:', data);
      setConfirmingArrival(false);
      setStatus('in-service');
      setDirections(null); // Limpiar ruta cuando inicia atención
      setEmergency((prev) => ({
        ...prev,
        tracking: {
          ...prev?.tracking,
          status: 'in-service',
          userConfirmedAt: new Date()
        }
      }));
    };

    const handleUserConfirmError = (data) => {
      console.error('User confirm arrival error:', data);
      setConfirmingArrival(false);
      alert(data.message || 'Error al confirmar la llegada. Intenta nuevamente.');
    };

    const handleConfirmSuccess = () => {
      setConfirmingArrival(false);
      setStatus('in-service');
      setDirections(null); // Limpiar ruta cuando inicia atención
    };

    const handleConfirmError = (error) => {
      console.error('Error confirming arrival:', error);
      setConfirmingArrival(false);
      alert(error?.message || 'No se pudo confirmar la llegada. Intenta nuevamente.');
    };

    const handleRequestRating = () => {
      setShowRatingModal(true);
    };

    const handleEmergencyCancelled = (data) => {
      setStatus('cancelled');
      // Si la razón es "timeout" o contiene "No se encontraron veterinarios", mostrar call to action
      const reason = data?.reason || '';
      const isAutoCancellation = reason.includes('No se encontraron veterinarios') || 
                                 reason === 'timeout' || 
                                 reason.includes('tiempo límite');
      
      if (isAutoCancellation) {
        setNoVetsMessage('No se encontraron veterinarios disponibles en este momento. Te recomendamos agendar una cita presencial o de telemedicina.');
        setShowCallToAction(true);
      } else {
        // Filtrar "timeout" y mostrar mensaje más amigable
        const friendlyMessage = reason === 'timeout' 
          ? 'La urgencia ha sido cancelada.' 
          : reason || 'La urgencia ha sido cancelada.';
        setNoVetsMessage(friendlyMessage);
        setShowCallToAction(false);
      }
    };

    const handleNoVetsAvailable = (payload) => {
      if (payload?.emergencyId && payload.emergencyId !== requestId) return;
      setStatus('cancelled');
      setNoVetsMessage(payload?.message || 'No hay veterinarios disponibles en este momento. Intenta más tarde.');
      setShowCallToAction(payload?.showCallToAction || false);
    };

    const handleEmergencyCompleted = (data) => {
      console.log('Urgencia completada:', data);
      // Comparar como strings para evitar problemas de tipo
      const appointmentIdStr = String(data.appointmentId || '');
      const emergencyIdStr = String(data.emergencyId || '');
      const requestIdStr = String(requestId || '');
      
      // Verificar si el evento corresponde a esta emergencia
      // Si no hay appointmentId o emergencyId específico, asumir que es para esta emergencia
      if (!appointmentIdStr && !emergencyIdStr) {
        // Si no hay ID específico, recargar detalles de todas formas
        fetchEmergencyDetails().then(() => {
          setShowCompletedMessage(true);
          setTimeout(() => {
            setShowCompletedMessage(false);
          }, 10000);
        });
      } else if (appointmentIdStr === requestIdStr || emergencyIdStr === requestIdStr) {
        // Recargar detalles desde el backend para asegurar sincronización
        // fetchEmergencyDetails ya establece el estado a 'completed' si corresponde
        fetchEmergencyDetails().then(() => {
          setShowCompletedMessage(true);
          setTimeout(() => {
            setShowCompletedMessage(false);
          }, 10000);
        });
      }
    };

    const handleEmergencyInService = (data) => {
      console.log('Atención iniciada automáticamente:', data);
      if (data.geolocationValidated || data.autoConfirmed) {
        setIsGeolocationValidated(true);
        if (data.distance) {
          setArrivalDistance(data.distance);
        }
      }
    };

    const handleManualAttemptsExhausted = (data) => {
      console.log('Intentos manuales agotados:', data);
      if (data?.emergencyId && data.emergencyId !== requestId) return;
      
      setExpandSearchMessage(data?.message || 'El veterinario seleccionado no ha respondido después de 2 intentos. ¿Deseas ampliar la búsqueda para encontrar otros veterinarios disponibles?');
      setShowExpandSearchBanner(true);
    };

    const handleSearchExpanded = (data) => {
      console.log('Búsqueda ampliada:', data);
      setShowExpandSearchBanner(false);
      setExpandSearchMessage('');
      // Recargar detalles de la emergencia
      fetchEmergencyDetails();
    };

    socket.on('connect', handleConnect);
    socket.on('emergency:accepted', handleEmergencyAccepted);
    socket.on('vet:location-update', handleVetLocationUpdate);
    socket.on('status:updated', handleStatusUpdated);
    socket.on('emergency:user-confirm-arrival:success', handleUserConfirmSuccess);
    socket.on('emergency:user-confirm-arrival:error', handleUserConfirmError);
    socket.on('request:rating', handleRequestRating);
    socket.on('emergency:cancelled', handleEmergencyCancelled);
    socket.on('emergency:no-vets', handleNoVetsAvailable);
    socket.on('emergency:completed', handleEmergencyCompleted);
    socket.on('emergency:in-service', handleEmergencyInService);
    socket.on('emergency:manual-attempts-exhausted', handleManualAttemptsExhausted);
    socket.on('emergency:search-expanded', handleSearchExpanded);

    // Conectar al socket de chat para escuchar mensajes nuevos
    const chatSocket = io(`${API_BASE}`, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    chatSocketRef.current = chatSocket;

    chatSocket.on('connect', () => {
      console.log('✅ Conectado al socket de chat');
      if (user?.id) {
        chatSocket.emit('join:user', user.id);
      }
      if (conversationId) {
        chatSocket.emit('join:conversation', conversationId);
      }
    });

    const handleNewMessage = (data) => {
      // Solo contar si el mensaje es de la conversación actual y no es del usuario actual
      if (data.conversationId === conversationId && data.senderId !== user?.id) {
        setUnreadMessagesCount(prev => prev + 1);
        setShowNewMessageNotification(true);
        // Ocultar notificación después de 5 segundos
        setTimeout(() => {
          setShowNewMessageNotification(false);
        }, 5000);
      }
    };

    chatSocket.on('conversation:new-message', handleNewMessage);

    // Actualizar cuando cambia conversationId
    const updateConversationRoom = () => {
      if (conversationId && chatSocket.connected) {
        chatSocket.emit('join:conversation', conversationId);
      }
    };

    const conversationIdInterval = setInterval(() => {
      if (conversationId) {
        updateConversationRoom();
      }
    }, 2000);

    // Actualizar suscripción cuando cambia conversationId
    if (conversationId && chatSocket.connected) {
      chatSocket.emit('join:conversation', conversationId);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('emergency:accepted', handleEmergencyAccepted);
      clearInterval(conversationIdInterval);
      if (chatSocket) {
        chatSocket.off('conversation:new-message', handleNewMessage);
        chatSocket.disconnect();
      }
      socket.off('vet:location-update', handleVetLocationUpdate);
      socket.off('status:updated', handleStatusUpdated);
      socket.off('emergency:user-confirm-arrival:success', handleUserConfirmSuccess);
      socket.off('emergency:user-confirm-arrival:error', handleUserConfirmError);
      socket.off('request:rating', handleRequestRating);
      socket.off('emergency:cancelled', handleEmergencyCancelled);
      socket.off('emergency:no-vets', handleNoVetsAvailable);
      socket.off('emergency:completed', handleEmergencyCompleted);
      socket.off('emergency:in-service', handleEmergencyInService);
      socket.off('emergency:manual-attempts-exhausted', handleManualAttemptsExhausted);
      socket.off('emergency:search-expanded', handleSearchExpanded);
      socket.disconnect();
      socketRef.current = null;
      clearInterval(pollingInterval);
    };
  }, [requestId, API_BASE, navigate]);

  // Calcular distancia en metros usando fórmula de Haversine
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  };

  // Calcular ETA basado en distancia (velocidad promedio 40 km/h en ciudad)
  const calculateETA = (distanceMeters) => {
    const speedKmh = 40; // Velocidad promedio en ciudad
    const speedMs = speedKmh * 1000 / 3600; // Convertir a m/s
    const timeSeconds = distanceMeters / speedMs;
    return Math.ceil(timeSeconds / 60); // Convertir a minutos
  };

  const updateDirections = (vetLoc) => {
    if (!emergency || !vetLoc || !window.google) return;
    
    // Calcular distancia y ETA como fallback
    const distance = calculateDistance(
      vetLoc.lat,
      vetLoc.lng,
      emergency.location.lat,
      emergency.location.lng
    );
    const estimatedETA = calculateETA(distance);
    
    // Intentar usar DirectionsService si está disponible
    try {
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: new window.google.maps.LatLng(vetLoc.lat, vetLoc.lng),
          destination: new window.google.maps.LatLng(
            emergency.location.lat,
            emergency.location.lng
          ),
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === 'OK') {
            setDirections(result);
            const duration = result.routes[0].legs[0].duration.value;
            setEta(Math.ceil(duration / 60));
          } else {
            // Si la API falla, usar ETA calculado y no mostrar direcciones
            console.warn('Directions API no disponible, usando ETA estimado:', status);
            setDirections(null);
            setEta(estimatedETA);
          }
        }
      );
    } catch (error) {
      // Si hay un error al crear el servicio, usar ETA calculado
      console.warn('Error al usar DirectionsService, usando ETA estimado:', error);
      setDirections(null);
      setEta(estimatedETA);
    }
  };

  // Calcular ruta desde la ubicación del tutor hasta la clínica (para urgencias en clínica)
  const updateDirectionsToClinic = (clinicLoc) => {
    if (!emergency || !clinicLoc || !emergency.location || !window.google) return;
    
    // Calcular distancia y ETA como fallback
    const distance = calculateDistance(
      emergency.location.lat,
      emergency.location.lng,
      clinicLoc.lat,
      clinicLoc.lng
    );
    const estimatedETA = calculateETA(distance);
    
    // Intentar usar DirectionsService si está disponible
    try {
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: new window.google.maps.LatLng(emergency.location.lat, emergency.location.lng),
          destination: new window.google.maps.LatLng(clinicLoc.lat, clinicLoc.lng),
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === 'OK') {
            setDirections(result);
            const duration = result.routes[0].legs[0].duration.value;
            setEta(Math.ceil(duration / 60));
          } else {
            console.warn('Directions API no disponible, usando ETA estimado:', status);
            setDirections(null);
            setEta(estimatedETA);
          }
        }
      );
    } catch (error) {
      console.warn('Error al usar DirectionsService, usando ETA estimado:', error);
      setDirections(null);
      setEta(estimatedETA);
    }
  };

  const handleCancelEmergency = async () => {
    if (!cancelReason) {
      alert('Por favor selecciona el motivo de la cancelación');
      return;
    }

    // Si seleccionó "Otro motivo", validar que haya escrito algo
    if (cancelReason === 'other' && !cancelReasonOther.trim()) {
      alert('Por favor describe el motivo de cancelación');
      return;
    }

    try {
      // Construir el motivo final
      let finalReason = getCancelReasonLabel(cancelReason);
      if (cancelReason === 'other' && cancelReasonOther.trim()) {
        finalReason = `Otro: ${cancelReasonOther.trim()}`;
      }

      socketRef.current?.emit('emergency:cancel', {
        emergencyId: requestId,
        userId: JSON.parse(localStorage.getItem('user')).id,
        reason: finalReason,
        reasonCode: cancelReason // Enviar también el código para análisis
      });

      socketRef.current?.on('emergency:cancel:success', (data) => {
        let message = 'Urgencia cancelada exitosamente';
        if (data.cancellationFee > 0) {
          message += `\nSe aplicará un cargo por cancelación de $${data.cancellationFee.toLocaleString()}`;
        }
        alert(message);
        navigate('/user/home');
      });
    } catch (error) {
      console.error('Error cancelling emergency:', error);
      alert('Error al cancelar la urgencia');
    }
  };

  const getStatusInfo = () => {
    const statusMap = {
      'pending': {
        title: 'Buscando veterinario',
        description: 'Estamos buscando un veterinario disponible cerca de ti',
        icon: '🔍',
        color: 'blue',
        spinner: true
      },
      'vet-assigned': {
        title: 'Veterinario asignado',
        description: vet ? `${vet.name} aceptó tu urgencia` : 'Un veterinario fue asignado',
        icon: '✅',
        color: 'green',
        spinner: false
      },
      'accepted': {
        title: 'Veterinario asignado',
        description: vet ? `${vet.name} aceptó tu urgencia` : 'Un veterinario fue asignado',
        icon: '✅',
        color: 'green',
        spinner: false
      },
      'on-way': {
        title: 'En camino',
        description: eta ? `Llegará en aproximadamente ${eta} ${eta === 1 ? 'minuto' : 'minutos'}` : 'El veterinario está en camino',
        icon: '🚗',
        color: 'violet',
        spinner: false
      },
      'arrived': {
        title: 'El veterinario ha llegado',
        description: isGeolocationValidated && arrivalDistance
          ? `El veterinario está en tu ubicación (validado por geolocalización a ${arrivalDistance}m del punto). Confirma cuando estés con él.`
          : 'El veterinario está en tu ubicación. Confirma cuando estés con él.',
        icon: '📍',
        color: 'green',
        spinner: false
      },
      'tutor-arrived': {
        title: 'Has llegado a la clínica',
        description: 'La clínica ha confirmado tu llegada. La atención comenzará pronto.',
        icon: '🏥',
        color: 'green',
        spinner: false
      },
      'in-service': {
        title: 'Atención en progreso',
        description: isGeolocationValidated 
          ? `Atención iniciada por validación de geolocalización${arrivalDistance ? ` (vet a ${arrivalDistance}m)` : ''}. El veterinario está atendiendo a tu mascota.`
          : 'El veterinario está atendiendo a tu mascota',
        icon: '🩺',
        color: 'blue',
        spinner: false
      },
      'completed': {
        title: 'Urgencia completada',
        description: 'La atención ha finalizado',
        icon: '🎉',
        color: 'green',
        spinner: false
      },
      cancelled: {
        title: showCallToAction ? 'No se encontraron veterinarios' : 'Solicitud cancelada',
        description: showCallToAction 
          ? 'No se encontraron veterinarios disponibles en este momento.'
          : (noVetsMessage && !noVetsMessage.includes('timeout') 
              ? noVetsMessage 
              : 'La urgencia fue cancelada. Si necesitas ayuda, crea una nueva solicitud o contacta a soporte.'),
        icon: '⚠️',
        color: 'gray',
        spinner: false
      }
    };

    return statusMap[status] || statusMap['pending'];
  };

  const statusInfo = getStatusInfo();

  const handleConfirmArrival = () => {
    if (!socketRef.current) return;
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      navigate('/login');
      return;
    }
    setConfirmingArrival(true);
    socketRef.current.emit('emergency:user-confirm-arrival', {
      emergencyId: requestId,
      userId: user.id
    });
  };

  const handleOpenChat = () => {
    if (!conversationId) return;
    // Limpiar contador de mensajes no leídos al abrir el chat
    setUnreadMessagesCount(0);
    setShowNewMessageNotification(false);
    navigate(`/conversations/${conversationId}`, {
      state: { 
        emergencyRequestId: requestId, 
        fromEmergency: true,
        emergencyStatus: status // Pasar el estado de la emergencia
      }
    });
  };


  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value ?? 0);

  const attachments = emergency?.triage?.attachments || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles de la urgencia...</p>
        </div>
      </div>
    );
  }

  if (!emergency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No se encontró la urgencia</p>
          <button
            onClick={() => navigate('/user/home')}
            className="mt-4 px-6 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mensaje de finalización */}
      {showCompletedMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">¡Solicitud finalizada!</p>
              <p className="text-sm text-green-100">La atención de emergencia ha sido completada exitosamente.</p>
            </div>
            <button
              onClick={() => setShowCompletedMessage(false)}
              className="ml-auto text-white hover:text-green-100 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Notificación de mensaje nuevo */}
      {showNewMessageNotification && unreadMessagesCount > 0 && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="flex-1 text-sm font-medium">
              {unreadMessagesCount === 1 ? 'Nuevo mensaje' : `${unreadMessagesCount} mensajes nuevos`}
            </p>
            <button
              onClick={() => {
                setShowNewMessageNotification(false);
                handleOpenChat();
              }}
              className="text-white hover:text-blue-100 transition underline text-sm"
            >
              Ver
            </button>
            <button
              onClick={() => setShowNewMessageNotification(false)}
              className="text-white hover:text-blue-100 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mapa */}
      {isLoaded && emergency.location && (
        <div className="h-80 relative">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{
              lat: emergency.location.lat,
              lng: emergency.location.lng
            }}
            zoom={status === 'pending' ? 13 : 14}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              styles: status === 'pending' ? [
                {
                  featureType: 'all',
                  elementType: 'geometry',
                  stylers: [{ saturation: -80 }, { lightness: 20 }]
                }
              ] : []
            }}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {/* Marcador del usuario */}
            <Marker
              position={{
                lat: emergency.location.lat,
                lng: emergency.location.lng
              }}
              icon={createStatusIcon(status === 'pending' ? 'pending' : 'default', 'user')}
            />

            {/* Marcador del veterinario/clínica - Mostrar según el estado */}
            {emergency.mode === 'clinic' && clinicLocation && (
              <Marker
                position={{
                  lat: clinicLocation.lat,
                  lng: clinicLocation.lng
                }}
                icon={createStatusIcon(status === 'tutor-arrived' || status === 'in-service' ? 'in-service' : 'default', 'vet')}
              />
            )}
            {emergency.mode === 'home' && vetLocation && (status === 'on-way' || status === 'accepted' || status === 'arrived' || status === 'in-service') && (
              <Marker
                position={{
                  lat: vetLocation.lat,
                  lng: vetLocation.lng
                }}
                icon={createStatusIcon(status, 'vet')}
              />
            )}

            {/* Ruta - Para urgencias a domicilio: mostrar cuando el vet está en camino */}
            {emergency.mode === 'home' && directions && directions.routes && directions.routes.length > 0 && status === 'on-way' && vetLocation && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#8b5cf6',
                    strokeWeight: 5
                  }
                }}
              />
            )}

            {/* Ruta - Para urgencias en clínica: mostrar desde la ubicación del tutor hasta la clínica cuando está en proceso */}
            {emergency.mode === 'clinic' && directions && directions.routes && directions.routes.length > 0 && 
             (status === 'in-service' || status === 'tutor-arrived' || status === 'accepted') && clinicLocation && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#2563EB',
                    strokeWeight: 5
                  }
                }}
              />
            )}
          </GoogleMap>
          
          {/* Overlay visual según el estado */}
          {status === 'pending' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Efecto de radar - círculos concéntricos pulsantes */}
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-30 animate-ping"></div>
                <div className="absolute inset-4 rounded-full border-4 border-blue-400 opacity-40 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-8 rounded-full border-4 border-blue-300 opacity-50 animate-ping" style={{ animationDelay: '1s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🔍</span>
                  </div>
                </div>
              </div>
              {/* Texto flotante */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold animate-pulse">
                Buscando veterinario...
              </div>
            </div>
          )}
          
          {status === 'arrived' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Efecto de llegada - círculo verde pulsante */}
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 rounded-full border-4 border-green-500 opacity-40 animate-ping"></div>
                <div className="absolute inset-4 rounded-full border-4 border-green-400 opacity-50 animate-ping" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">✓</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {status === 'on-way' && vetLocation && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
              <div className="bg-violet-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>🚗 En camino</span>
                {eta && <span className="text-violet-200">• Llegará en {eta} {eta === 1 ? 'minuto' : 'minutos'}</span>}
              </div>
            </div>
          )}
          
          {status === 'in-service' && (
            <div className="absolute top-4 right-4 pointer-events-none">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>En atención</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenido */}
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-4xl lg:max-w-6xl">
        {noVetsMessage && (
          <div className={`mb-3 sm:mb-4 ${showCallToAction ? 'bg-gradient-to-r from-orange-50 to-red-50' : 'bg-amber-50'} ${showCallToAction ? 'border-2 border-orange-300' : 'border border-amber-300'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm`}>
            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 ${showCallToAction ? 'bg-orange-500' : 'bg-amber-500'} rounded-full flex items-center justify-center shadow-lg`}>
                <svg className={`w-5 h-5 sm:w-6 sm:h-6 text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base sm:text-lg font-bold ${showCallToAction ? 'text-orange-900' : 'text-amber-900'} mb-1 sm:mb-2`}>
                  {showCallToAction ? 'No se encontraron veterinarios disponibles' : 'Urgencia cancelada'}
                </h3>
                <p className={`text-sm sm:text-base ${showCallToAction ? 'text-orange-800' : 'text-amber-800'}`}>
                  {noVetsMessage}
                </p>
              </div>
            </div>
            {showCallToAction && (
              <div className="space-y-3 sm:space-y-4 mt-4">
                {/* Botón "Intentar de nuevo" */}
                <button
                  onClick={() => {
                    // Extraer datos de la emergencia cancelada para pre-llenar el formulario
                    const retryData = {
                      petId: emergency?.petId?._id || emergency?.petId,
                      location: emergency?.location ? {
                        lat: emergency.location.lat,
                        lng: emergency.location.lng,
                        address: emergency.location.address,
                        accessNotes: emergency.location.accessNotes
                      } : null,
                      triage: emergency?.triage ? {
                        mainReason: emergency.triage.mainReason,
                        criticalFlags: emergency.triage.criticalFlags || [],
                        onsetMinutes: emergency.triage.onsetMinutes,
                        notes: emergency.triage.notes || emergency.triage.details
                      } : null
                    };
                    navigate('/emergency/request', { state: { retryData } });
                  }}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base shadow-lg bg-violet-600 hover:bg-violet-700 active:scale-98 hover:shadow-xl"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Intentar de nuevo</span>
                </button>
                
                {/* Botones de agendar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => navigate('/appointments')}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base shadow-lg bg-violet-600 hover:bg-violet-700 active:scale-98 hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Agendar presencial</span>
                  </button>
                  <button
                    onClick={() => navigate('/appointments?type=telemedicine')}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base shadow-lg bg-blue-600 hover:bg-blue-700 active:scale-98 hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Agendar telemedicina</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Banner para ampliar búsqueda después de 2 intentos manuales */}
        {showExpandSearchBanner && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">
                  El veterinario no ha respondido
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  {expandSearchMessage}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleExpandSearch}
                    disabled={isExpandingSearch}
                    className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 text-sm sm:text-base shadow-md ${
                      isExpandingSearch
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-tutor-btn-primary hover:bg-tutor-btn-primary-hover active:scale-98'
                    }`}
                  >
                    {isExpandingSearch ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Ampliando búsqueda...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                        <span>Ampliar búsqueda</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowExpandSearchBanner(false)}
                    disabled={isExpandingSearch}
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Estado principal */}
        <div className={`bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden mb-4 sm:mb-6 lg:mb-8 border-l-4 border-${statusInfo.color}-500`}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-4 lg:gap-6">
              <div className="text-3xl sm:text-5xl lg:text-6xl flex-shrink-0">
                {statusInfo.spinner ? (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>{statusInfo.icon}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 lg:mb-3">{statusInfo.title}</h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">{statusInfo.description}</p>
                {eta != null && eta !== 0 && status === 'on-way' && (
                  <div className="mt-2 sm:mt-3 inline-flex items-center gap-2 bg-violet-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-semibold text-violet-700">Llegará en {eta} {eta === 1 ? 'minuto' : 'minutos'}</span>
                  </div>
                )}
                {status === 'completed' && (
                  <>
                    {/* Sección de acciones para solicitud completada */}
                    <div className="mt-4 sm:mt-6 lg:mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
                      <div className="flex items-start gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 lg:mb-3">
                            ¡Atención completada exitosamente!
                          </h3>
                          <p className="text-xs sm:text-sm lg:text-base text-gray-700 mb-3 sm:mb-4 lg:mb-5">
                            La urgencia ha sido atendida. Puedes crear una nueva solicitud si lo necesitas o descargar la receta médica.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                        {/* Botón: Crear nueva solicitud */}
                        <button
                          onClick={() => navigate('/appointments')}
                          className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg shadow-lg bg-violet-600 hover:bg-violet-700 active:scale-98 hover:shadow-xl"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Crear nueva solicitud</span>
                        </button>
                        {/* Botón: Descargar receta */}
                        <button
                          onClick={() => navigate(`/completed-appointment/${requestId}`)}
                          className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base lg:text-lg shadow-lg bg-blue-600 hover:bg-blue-700 active:scale-98 hover:shadow-xl"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Descargar receta</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {status === 'arrived' && (
                  <>
                    {/* Sección principal de confirmación */}
                    <div className="mt-3 sm:mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
                      <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-xl sm:text-2xl">📍</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                            El veterinario ha llegado
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-700">
                            {isGeolocationValidated && arrivalDistance
                              ? `El veterinario está en tu ubicación (validado por geolocalización a ${arrivalDistance}m del punto). Confirma cuando estés con él para iniciar la atención.`
                              : 'El veterinario está en tu ubicación. Confirma cuando estés con él para iniciar la atención.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleConfirmArrival}
                        disabled={confirmingArrival}
                        className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base shadow-lg ${
                          confirmingArrival
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 active:scale-98'
                        }`}
                      >
                        {confirmingArrival ? (
                          <>
                            <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Confirmando...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg sm:text-xl">✓</span>
                            <span>Confirmar llegada</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Sección de chat - Solo si hay conversationId */}
                    {conversationId && (
                      <div className="mt-3 sm:mt-4 bg-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-5">
                        <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-1">
                              Comparte información adicional
                            </h3>
                            <p className="text-xs sm:text-sm text-blue-800 mb-2 sm:mb-3">
                              Envía mensajes, fotos y detalles sobre el estado de tu mascota directamente al veterinario.
                            </p>
                            <button
                              onClick={handleOpenChat}
                              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm relative"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Abrir chat con el veterinario
                              {unreadMessagesCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Acciones para urgencias en clínica (después de crear la solicitud) */}
                {emergency.mode === 'clinic' && (status === 'accepted' || status === 'in-service' || status === 'tutor-arrived') && (
                  <div className="mt-3 sm:mt-4 lg:mt-6 space-y-3 sm:space-y-4">
                    {/* Botón: Ver ruta a la clínica */}
                    {clinicLocation && emergency.location && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-start gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900 mb-1 lg:mb-2">
                              Ruta a la clínica
                            </h3>
                            <p className="text-xs sm:text-sm lg:text-base text-blue-800 mb-2 sm:mb-3 lg:mb-4">
                              {status === 'tutor-arrived' || status === 'in-service'
                                ? 'Ya estás en la clínica. La atención está en progreso.'
                                : 'Puedes ver la ruta recomendada para llegar a la clínica.'}
                            </p>
                            {directions && directions.routes && directions.routes.length > 0 && eta && (
                              <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 bg-blue-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs sm:text-sm font-semibold text-blue-700">Tiempo estimado: {eta} minutos</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botón: Chatear con la clínica */}
                    {conversationId && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 lg:p-6">
                        <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-green-900 mb-1 lg:mb-2">
                              Chat con la clínica
                            </h3>
                            <p className="text-xs sm:text-sm lg:text-base text-green-800 mb-2 sm:mb-3 lg:mb-4">
                              Puedes comunicarte con la clínica para coordinar detalles o compartir información adicional sobre tu mascota.
                            </p>
                            <button
                              onClick={handleOpenChat}
                              className="w-full sm:w-auto px-3 sm:px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base bg-green-600 text-white hover:bg-green-700 relative"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Abrir chat con la clínica
                              {unreadMessagesCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat para otros estados (no arrived, pero incluye completed) */}
                {emergency.mode === 'home' && conversationId && status !== 'pending' && status !== 'cancelled' && status !== 'arrived' && (
                  <div className="mt-3 sm:mt-4 lg:mt-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 lg:p-6">
                    <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900 mb-1 lg:mb-2">
                          {status === 'completed' ? 'Ver historial del chat' : 'Comparte información adicional'}
                        </h3>
                        <p className="text-xs sm:text-sm lg:text-base text-blue-800 mb-2 sm:mb-3 lg:mb-4">
                          {status === 'completed' 
                            ? 'Puedes revisar el historial de mensajes de esta solicitud.'
                            : 'Puedes enviar mensajes, fotos y detalles sobre el estado de tu mascota directamente al veterinario a través del chat.'}
                        </p>
                        <button
                          onClick={handleOpenChat}
                          className={`w-full sm:w-auto px-3 sm:px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base ${
                            status === 'completed'
                              ? 'bg-gray-500 text-white hover:bg-gray-600'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } relative`}
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {status === 'completed' ? 'Ver chat (solo lectura)' : 'Abrir chat con el veterinario'}
                          {unreadMessagesCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de la solicitud */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 lg:mb-6">Resumen de tu urgencia</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm lg:text-base text-gray-700">
            <div>
              <span className="font-semibold text-gray-500 block text-xs uppercase">Dirección</span>
              <p className="mt-1 text-base">
                {emergency.location?.address ? String(emergency.location.address) : 'Dirección no especificada'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block text-xs uppercase">Tipo de atención</span>
              <p className="mt-1 text-base">
                {String(emergency.mode || '') === 'home'
                  ? 'Visita a domicilio'
                  : String(emergency.mode || '') === 'clinic'
                  ? 'Atención en clínica'
                  : 'Telemedicina'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block text-xs uppercase">Motivo principal</span>
              <p className="mt-1 text-base">
                {emergency.triage?.mainReason
                  ? (REASON_LABELS[String(emergency.triage.mainReason)] || String(emergency.triage.mainReason))
                  : 'No especificado'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block text-xs uppercase">Valor estimado</span>
              <p className="mt-1 text-base font-semibold text-violet-700">
                {formatCurrency(Number(emergency.pricing?.total) || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Información del veterinario */}
        {vet && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 lg:mb-6">Tu veterinario</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                <img
                  src={vet.profileImage ? String(vet.profileImage) : '/default-vet-image.jpg'}
                  alt={String(vet?.name || 'Veterinario')}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const vetName = String(vet?.name || 'V');
                    e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-violet-500 text-white text-2xl font-bold">${vetName.charAt(0)}</div>`;
                  }}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{String(vet?.name || 'Veterinario')}</h4>
                <p className="text-gray-600 text-sm">{String(vet?.phoneNumber || '')}</p>
              </div>
              {status !== 'completed' && (
                <a
                  href={`tel:${String(vet?.phoneNumber || '')}`}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Llamar</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Información de la mascota */}
        {emergency.petId && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mascota</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                <PetAvatar
                  image={emergency.petId?.image ? String(emergency.petId.image) : undefined}
                  species={emergency.petId?.species ? String(emergency.petId.species) : undefined}
                  name={emergency.petId?.name ? String(emergency.petId.name) : undefined}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{String(emergency.petId?.name || 'Mascota')}</h4>
                <p className="text-gray-600 text-sm">{String(emergency.petId?.breed || '')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje cuando aún no hay chat disponible (solo si no está en in-service) */}
        {!conversationId && status !== 'pending' && status !== 'cancelled' && status !== 'in-service' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  ¿Necesitas compartir información?
                </h3>
                <p className="text-sm text-yellow-800">
                  Una vez que el veterinario acepte tu urgencia, podrás comunicarte con él a través del chat para compartir fotos, videos y detalles adicionales sobre el estado de tu mascota.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Adjuntos existentes */}
        {attachments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Archivos compartidos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {attachments.map((item, index) => (
                <div key={`${item}-${index}`} className="relative group border rounded-xl overflow-hidden">
                  <img
                    src={item}
                    alt={`Adjunto ${index + 1}`}
                    className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        {status !== 'completed' && status !== 'cancelled' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3 border-2 border-red-500 text-red-600 rounded-xl hover:bg-red-50 font-semibold transition-all"
            >
              Cancelar urgencia
            </button>
            {(status === 'pending' || status === 'vet-assigned') && emergency.mode === 'home' && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Sin cargo si cancelas en los próximos 2 minutos
              </p>
            )}
            {emergency.mode === 'clinic' && (
              <p className="text-xs text-red-600 text-center mt-2 font-medium">
                Se aplicará un cargo del 50% del total por cancelación
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-red-600 px-6 py-5 flex-shrink-0">
              <h3 className="text-xl font-bold text-white">Cancelar urgencia</h3>
            </div>
            
            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-5">
                <p className="text-base text-gray-700 mb-1 font-medium">
                  ¿Por qué cancelas esta urgencia?
                </p>
                <p className="text-sm text-gray-500">
                  Selecciona el motivo principal
                </p>
              </div>
              
              {/* Lista de opciones */}
              <div className="space-y-2.5 mb-4">
                {cancellationReasons.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      cancelReason === reason.value
                        ? 'border-red-500 bg-red-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason.value}
                      checked={cancelReason === reason.value}
                      onChange={(e) => {
                        setCancelReason(e.target.value);
                        if (e.target.value !== 'other') {
                          setCancelReasonOther('');
                        }
                      }}
                      className="w-5 h-5 text-red-600 focus:ring-red-500 focus:ring-2 border-gray-300 flex-shrink-0"
                    />
                    <span className="ml-4 text-sm font-medium text-gray-700 flex-1">
                      {reason.label}
                    </span>
                  </label>
                ))}
              </div>
              
              {/* Campo de texto adicional para "Otro motivo" */}
              {cancelReason === 'other' && (
                <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2.5">
                    Describe el motivo
                  </label>
                  <textarea
                    value={cancelReasonOther}
                    onChange={(e) => setCancelReasonOther(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all"
                    rows="3"
                    placeholder="Por favor describe el motivo de cancelación..."
                  />
                </div>
              )}
            </div>
            
            {/* Footer fijo */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setCancelReasonOther('');
                  }}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-xl hover:bg-white hover:border-gray-400 font-semibold text-gray-700 transition-all"
                >
                  Volver
                </button>
                <button
                  onClick={handleCancelEmergency}
                  disabled={!cancelReason || (cancelReason === 'other' && !cancelReasonOther.trim())}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                >
                  Confirmar cancelación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calificación */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        appointmentId={requestId}
        vetId={emergency?.vetId?._id || emergency?.vetId}
        petId={emergency?.petId?._id || emergency?.petId}
        vetName={emergency?.vetId?.name}
        vetRating={emergency?.vetId?.ratings?.average && emergency?.vetId?.ratings?.total >= 5 
          ? emergency.vetId.ratings.average 
          : null}
        appointmentDate={emergency?.appointmentDate || emergency?.createdAt}
        scheduledTime={emergency?.scheduledTime}
        onSuccess={(rating) => {
          console.log('Calificación guardada:', rating);
          setShowRatingModal(false);
          // Opcional: mostrar mensaje de éxito
        }}
      />
    </div>
  );
};

export default EmergencyTrackingPage;
