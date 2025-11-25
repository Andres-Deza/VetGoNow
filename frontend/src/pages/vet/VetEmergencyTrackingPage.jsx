import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import GoogleMapWrapper from '../../components/GoogleMapWrapper';
import { FaMapMarkerAlt, FaPhone, FaCheckCircle, FaNotesMedical, FaArrowRight } from 'react-icons/fa';

// Función helper para crear iconos personalizados según el estado
const createStatusIcon = (status, type = 'vet', isMapsLoaded = false) => {
  // Verificar que Google Maps esté disponible
  if (!isMapsLoaded || !window.google || !window.google.maps || !window.google.maps.Size || !window.google.maps.Point) {
    // Retornar un icono por defecto simple si Google Maps no está disponible
    return {
      url: type === 'user' ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      scaledSize: { width: 40, height: 40 }
    };
  }

  const baseSize = 50;
  const anchor = { x: baseSize / 2, y: baseSize / 2 };
  
  // Icono para estado "accepted" - Reloj/espera
  if (status === 'accepted') {
    const svg = `
      <svg width="${baseSize}" height="${baseSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="20" fill="#F59E0B"/>
        <text x="${baseSize/2}" y="${baseSize/2 + 7}" text-anchor="middle" font-size="24" fill="#FFFFFF">⏰</text>
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
  
  // Icono por defecto
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

const REASON_LABELS = {
  trauma: 'Golpe / Trauma',
  bleeding: 'Sangrado',
  seizures: 'Convulsiones',
  choking: 'Ahogo',
  vomiting: 'Vómitos persistentes',
  poisoning: 'Envenenamiento',
  fever: 'Fiebre alta',
  urination: 'Retención urinaria',
  pain: 'Dolor intenso',
  other: 'Otro'
};

const CRITICAL_FLAG_LABELS = {
  breathing: 'Dificultad respiratoria',
  active_bleeding: 'Sangrado activo',
  unconscious: 'Pérdida de conciencia',
  seizures: 'Convulsiones',
  cannot_stand: 'No puede ponerse de pie'
};

const formatReason = (reason) => {
  if (!reason || typeof reason !== 'string') return 'Urgencia';
  return REASON_LABELS[reason] ||
    reason.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatCriticalFlag = (flag) => {
  if (!flag || typeof flag !== 'string') return '';
  return CRITICAL_FLAG_LABELS[flag] ||
    flag.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const VetEmergencyTrackingPage = () => {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';
  const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
  
  const [emergency, setEmergency] = useState(null);
  const [vet, setVet] = useState(null);
  const [status, setStatus] = useState('accepted');
  const [isGeolocationValidated, setIsGeolocationValidated] = useState(false);
  const [arrivalDistance, setArrivalDistance] = useState(null);
  
  // Actualizar referencia cuando cambia el estado
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [eta, setEta] = useState(null);
  const [conversationId, setConversationId] = useState(location.state?.conversationId || null);
  const [showCompletedMessage, setShowCompletedMessage] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);
  
  const socketRef = useRef(null);
  const chatSocketRef = useRef(null);
  const watchIdRef = useRef(null);
  const statusRef = useRef(status);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    libraries: ['places', 'geometry']
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || storedUser.role !== 'Vet') {
      navigate('/login');
      return;
    }
    setVet(storedUser);

    // Cargar detalles de la emergencia
    fetchEmergencyDetails();

    // Conectar a Socket.IO
    const socket = io(`${API_BASE}/emergency`, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socket;

    const handleConnect = () => {
      console.log('✅ Conectado al socket de emergencias');
      socket.emit('join:vet', storedUser.id);
      socket.emit('join:emergency', emergencyId);
    };

    const handleEmergencyCancelled = (data) => {
      alert('La urgencia ha sido cancelada: ' + data.reason);
      navigate('/vet/emergencies');
    };

    const handleUserDetailsUpdate = (data) => {
      console.log('Detalles adicionales recibidos:', data);
      setEmergency((prev) =>
        prev
          ? {
              ...prev,
              triage: {
                ...prev.triage,
                ...(data?.triage || {})
              }
            }
          : prev
      );
    };

    const handleUserConfirmed = (data) => {
      console.log('Usuario confirmó llegada:', data);
      setStatus('in-service');
      statusRef.current = 'in-service'; // Actualizar referencia
      setDirections(null); // Limpiar ruta cuando inicia atención
      
      // Verificar si fue por geolocalización automática
      if (data.autoConfirmed || data.geolocationValidated) {
        setIsGeolocationValidated(true);
        if (data.distance) {
          setArrivalDistance(data.distance);
        }
      } else {
        setIsGeolocationValidated(false);
        setArrivalDistance(null);
      }
      
      // Recargar detalles para sincronizar con el backend
      setTimeout(() => {
        fetchEmergencyDetails();
      }, 500);
    };

    const handleEmergencyAccepted = (data) => {
      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }
    };

    const handleStatusUpdated = (data) => {
      console.log('Estado actualizado desde socket:', data);
      if (data.status) {
        setStatus(data.status);
        statusRef.current = data.status; // Actualizar referencia
        // Si el status es 'completed', mostrar mensaje
        if (data.status === 'completed') {
          setShowCompletedMessage(true);
          setTimeout(() => {
            setShowCompletedMessage(false);
          }, 10000);
        }
        // Limpiar ruta cuando el estado cambia a 'arrived' o 'in-service'
        if (data.status === 'arrived' || data.status === 'in-service') {
          setDirections(null);
        }
        // Si el estado cambió a in-service, recargar detalles para sincronizar
        if (data.status === 'in-service') {
          setTimeout(() => {
            fetchEmergencyDetails();
          }, 500);
        }
      }
      // Si fue auto-detectado, recargar detalles para sincronizar
      if (data.autoDetected || data.autoConfirmed) {
        setTimeout(() => {
          fetchEmergencyDetails();
        }, 500);
      }
    };

    const handleEmergencyCompleted = (data) => {
      console.log('Urgencia completada:', data);
      if (data.appointmentId === emergencyId || data.emergencyId === emergencyId) {
        setStatus('completed');
        setShowCompletedMessage(true);
        // Ocultar el mensaje después de 10 segundos
        setTimeout(() => {
          setShowCompletedMessage(false);
        }, 10000);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('emergency:cancelled', handleEmergencyCancelled);
    socket.on('emergency:user-details-update', handleUserDetailsUpdate);

    // Conectar al socket de chat para escuchar mensajes nuevos
    const chatSocket = io(`${API_BASE}`, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    chatSocketRef.current = chatSocket;

    chatSocket.on('connect', () => {
      console.log('✅ Conectado al socket de chat (vet)');
      if (storedUser?.id) {
        chatSocket.emit('join:vet', storedUser.id);
      }
      if (conversationId) {
        chatSocket.emit('join:conversation', conversationId);
      }
    });

    const handleNewMessage = (data) => {
      // Solo contar si el mensaje es de la conversación actual y no es del vet actual
      if (data.conversationId === conversationId && data.senderId !== storedUser?.id) {
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
    socket.on('emergency:user-confirmed', handleUserConfirmed);
    socket.on('emergency:accepted', handleEmergencyAccepted);
    socket.on('status:updated', handleStatusUpdated);
    socket.on('emergency:completed', handleEmergencyCompleted);

    // Iniciar tracking de ubicación
    startLocationTracking(socket, storedUser.id);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('emergency:cancelled', handleEmergencyCancelled);
      socket.off('emergency:user-details-update', handleUserDetailsUpdate);
      socket.off('emergency:user-confirmed', handleUserConfirmed);
      socket.off('emergency:accepted', handleEmergencyAccepted);
      socket.off('status:updated', handleStatusUpdated);
      socket.off('emergency:completed', handleEmergencyCompleted);
      socket.disconnect();
      socketRef.current = null;
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(conversationIdInterval);
      if (chatSocketRef.current) {
        chatSocketRef.current.disconnect();
      }
    };
  }, [emergencyId, API_BASE, navigate, conversationId]);

  const fetchEmergencyDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_BASE}/api/emergency/${emergencyId}/tracking`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setEmergency(data.request);
        // Usar el estado del tracking, que es el estado real de la urgencia
        // Si tracking.status existe, usarlo; si no, mapear status a tracking status
        let trackingStatus = data.request.tracking?.status;
        if (!trackingStatus && data.request.status) {
          // Mapear status del appointment a tracking status
          if (data.request.status === 'in_progress') {
            trackingStatus = 'in-service';
          } else if (data.request.status === 'accepted' || data.request.status === 'assigned') {
            trackingStatus = 'accepted';
          } else {
            trackingStatus = data.request.status;
          }
        }
        trackingStatus = trackingStatus || 'accepted';
        setStatus(trackingStatus);
        statusRef.current = trackingStatus; // Actualizar referencia
        console.log('Estado cargado desde backend:', trackingStatus, 'Status del appointment:', data.request.status, 'Tracking status:', data.request.tracking?.status);
        
        // Si hay ETA, cargarlo también
        if (data.request.tracking?.eta) {
          setEta(data.request.tracking.eta);
        }
        
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
      }
    } catch (error) {
      console.error('Error fetching emergency details:', error);
      if (error.response?.status === 403) {
        alert('No tienes acceso a esta urgencia');
        navigate('/vet/emergencies');
      }
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = (socket, vetId) => {
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setMyLocation(newLocation);
          
          // Enviar ubicación al servidor
          if (socket && socket.connected) {
            socket.emit('update:vet-location', {
              vetId,
              emergencyId,
              lat: newLocation.lat,
              lng: newLocation.lng
            });
          }

          // Actualizar direcciones solo si está en camino (no si ya llegó o está en atención)
          if (emergency?.location && statusRef.current === 'on-way') {
            updateDirections(newLocation);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );
    }
  };

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

  const handleOnWay = async () => {
    if (!socketRef.current || !vet) return;

    try {
      socketRef.current.emit('emergency:on-way', {
        emergencyId,
        vetId: vet.id,
        eta
      });

      // Actualizar estado local para feedback inmediato
      setStatus('on-way');
      statusRef.current = 'on-way'; // Actualizar referencia
      
      // Recargar detalles después de un momento para asegurar sincronización con BD
      setTimeout(() => {
        fetchEmergencyDetails();
      }, 1000);
    } catch (error) {
      console.error('Error al marcar como en camino:', error);
      alert('Error al actualizar el estado. Intenta nuevamente.');
    }
  };

  const handleArrived = async () => {
    setDirections(null); // Limpiar ruta cuando marca "He llegado"
    if (!socketRef.current || !vet) return;

    try {
      socketRef.current.emit('emergency:arrived', {
        emergencyId,
        vetId: vet.id
      });

      // Actualizar estado local para feedback inmediato
      setStatus('arrived');
      statusRef.current = 'arrived'; // Actualizar referencia
      
      // Recargar detalles después de un momento para asegurar sincronización con BD
      setTimeout(() => {
        fetchEmergencyDetails();
      }, 1000);
    } catch (error) {
      console.error('Error al marcar como llegado:', error);
      alert('Error al actualizar el estado. Intenta nuevamente.');
    }
  };

  const handleComplete = async () => {
    // Si el estado es "arrived", primero actualizar a "in-service" y NO redirigir
    if (status === 'arrived') {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.put(
          `${API_BASE}/api/appointments/${emergencyId}/tracking-status`,
          { status: 'in-service' },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          // Actualizar estado local
          setStatus('in-service');
          statusRef.current = 'in-service';
          setDirections(null);
          
          // Emitir evento socket para sincronizar si está disponible
          if (socketRef.current) {
            socketRef.current.emit('emergency:vet-start-service', { emergencyId });
          }

          // Recargar detalles para sincronizar
          setTimeout(() => {
            fetchEmergencyDetails();
          }, 500);
          
          // NO navegar, solo actualizar el estado en la misma página
          return;
        }
      } catch (error) {
        console.error('Error al actualizar estado a in-service:', error);
        alert('Error al actualizar el estado. Intenta nuevamente.');
        return;
      }
    }
    
    // Solo navegar si el estado ya es "in-service" (botón "Finalizar atención")
    if (status === 'in-service') {
      navigate(`/appointments/${emergencyId}/ongoing`);
    }
  };

  const handleOpenChat = () => {
    if (!conversationId) return;
    navigate(`/vet/conversations/${conversationId}`, {
      state: {
        emergencyRequestId: emergencyId,
        fromEmergency: true,
        emergencyStatus: status // Pasar el estado de la emergencia
      }
    });
  };

  const getStatusInfo = () => {
    const statusMap = {
      'accepted': {
        title: 'Urgencia Aceptada',
        description: 'Prepárate para salir',
        action: 'Estoy en camino',
        actionFn: handleOnWay,
        color: 'green'
      },
      'on-way': {
        title: 'En Camino',
        description: eta ? `Llegarás en aproximadamente ${eta} ${eta === 1 ? 'minuto' : 'minutos'}` : 'Navegando hacia el paciente',
        action: 'He llegado',
        actionFn: handleArrived,
        color: 'blue'
      },
      'arrived': {
        title: 'Has Llegado',
        description: 'Esperando confirmación del tutor',
        action: 'Iniciar atención',
        actionFn: handleComplete,
        color: 'violet'
      },
      'in-service': {
        title: 'En Atención',
        description: isGeolocationValidated 
          ? `Llegada validada por geolocalización${arrivalDistance ? ` (${arrivalDistance}m del punto)` : ''}. Continúa con la atención.`
          : 'El tutor confirmó tu llegada. Continúa con la atención.',
        action: 'Finalizar atención',
        actionFn: handleComplete,
        color: 'green'
      }
    };

    return statusMap[status] || statusMap['accepted'];
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles de la urgencia...</p>
        </div>
      </div>
    );
  }

  if (!emergency) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se encontró la urgencia</p>
          <button
            onClick={() => navigate('/vet/emergencies')}
            className="px-6 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700"
          >
            Volver a urgencias
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
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

      <div className="flex-1">
        {/* Mapa */}
        {isLoaded && emergency.location && (
          <div className="h-96 relative">
            <GoogleMapWrapper
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={myLocation || {
                lat: emergency.location.lat,
                lng: emergency.location.lng
              }}
              zoom={14}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false
              }}
            >
              {/* Marcador del destino */}
              <Marker
                position={{
                  lat: emergency.location.lat,
                  lng: emergency.location.lng
                }}
                icon={createStatusIcon('default', 'user', isLoaded)}
              />

              {/* Marcador de mi ubicación - Cambia según el estado */}
              {myLocation && isLoaded && (
                <Marker
                  key={`vet-marker-${status}`}
                  position={myLocation}
                  icon={createStatusIcon(status, 'vet', isLoaded)}
                />
              )}

              {/* Ruta - Solo mostrar si está en camino */}
              {directions && directions.routes && directions.routes.length > 0 && status === 'on-way' && (
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
            </GoogleMapWrapper>
          </div>
        )}

        {/* Contenido */}
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Estado principal */}
          <div className={`bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border-l-4 border-${statusInfo.color}-500`}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{statusInfo.title}</h2>
              <p className="text-gray-600 mb-4">{statusInfo.description}</p>
              
              {statusInfo.action && (
                <button
                  onClick={statusInfo.actionFn}
                  className={`px-6 py-3 bg-${statusInfo.color}-600 text-white rounded-xl hover:bg-${statusInfo.color}-700 font-semibold flex items-center gap-2`}
                >
                  <span>{statusInfo.action}</span>
                  <FaArrowRight />
                </button>
              )}
            </div>
          </div>

        {conversationId && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Chat con {emergency.userId?.name ? String(emergency.userId.name) : 'el tutor'}
                </h3>
                <p className="text-sm text-gray-600">
                  Coordina detalles, resuelve dudas o solicita más información directamente por chat.
                </p>
              </div>
              <button
                onClick={handleOpenChat}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition relative"
              >
                Abrir chat
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Información del paciente */}
          {emergency.petId && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaNotesMedical className="text-violet-600" />
                Paciente
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="font-semibold text-gray-900">{String(emergency.petId?.name || 'Mascota')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Raza</p>
                  <p className="font-semibold text-gray-900">{String(emergency.petId?.breed || 'No especificado')}</p>
                </div>
                {emergency.triage && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Motivo de urgencia</p>
                      <p className="font-semibold text-gray-900">
                        {formatReason(emergency.triage?.mainReason) || 'Urgencia'}
                      </p>
                    </div>
                    {emergency.triage.criticalFlags?.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Signos críticos</p>
                        <div className="flex flex-wrap gap-2">
                          {emergency.triage.criticalFlags.map((flag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium"
                            >
                              {formatCriticalFlag(String(flag || ''))}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {emergency.triage.notes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Detalles adicionales del tutor</p>
                        <div className="bg-violet-50 text-violet-900 px-4 py-3 rounded-xl text-sm leading-relaxed">
                          {String(emergency.triage.notes || '')}
                        </div>
                      </div>
                    )}
                    {emergency.triage.attachments?.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Material adjunto</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {emergency.triage.attachments.map((item, index) => (
                            <div key={`${item}-${index}`} className="relative border rounded-xl overflow-hidden">
                              <img
                                src={item}
                                alt={`Adjunto ${index + 1}`}
                                className="w-full h-32 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Información del cliente */}
          {emergency.userId && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{String(emergency.userId?.name || 'Cliente')}</p>
                  <p className="text-sm text-gray-600">{String(emergency.userId?.phoneNumber || '')}</p>
                </div>
                <a
                  href={`tel:${String(emergency.userId?.phoneNumber || '')}`}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2"
                >
                  <FaPhone />
                  <span>Llamar</span>
                </a>
              </div>
            </div>
          )}

          {/* Ubicación */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaMapMarkerAlt className="text-violet-600" />
              Ubicación del Paciente
            </h3>
            <p className="text-gray-700">{String(emergency.location?.address || 'Sin dirección')}</p>
            {emergency.location?.accessNotes && (
              <div className="mt-3 bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Notas de acceso:</strong> {String(emergency.location.accessNotes || '')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VetEmergencyTrackingPage;

