import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaBell, FaMapMarkerAlt, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { validateLocationPermission, getPermissionsStatus } from '../../utils/permissions';

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

const formatReason = (reason) =>
  REASON_LABELS[reason] ||
  reason?.replace(/[_-]/g, ' ')?.replace(/\b\w/g, (char) => char.toUpperCase());

const formatCriticalFlag = (flag) =>
  CRITICAL_FLAG_LABELS[flag] ||
  flag?.replace(/[_-]/g, ' ')?.replace(/\b\w/g, (char) => char.toUpperCase());

const VetEmergenciesPage = () => {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  
  const CACHE_KEY = 'vet:emergencies:persistent';
  const REJECTED_CACHE_KEY = 'vet:emergencies:rejected';
  const [vet, setVet] = useState(null);
  const [emergencies, setEmergencies] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Error reading cached emergencies', error);
    }
    return [];
  });
  const [activeEmergency, setActiveEmergency] = useState(null);
  const AVAILABILITY_CACHE_KEY = 'vet:availability:persistent';
  const [isAvailable, setIsAvailable] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = sessionStorage.getItem(AVAILABILITY_CACHE_KEY);
      return stored === 'true';
    } catch (error) {
      return false;
    }
  });
  const [currentStatus, setCurrentStatus] = useState('offline');
  const [rejectedEmergencies, setRejectedEmergencies] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(REJECTED_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Error reading rejected emergencies cache', error);
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [offerSecondsLeft, setOfferSecondsLeft] = useState(null);
  
  const socketRef = useRef(null);
  const pendingFetchRef = useRef(false);
  const locationWatchIdRef = useRef(null);
  const lastLocationRef = useRef(null);
  const vetIdRef = useRef(null);
  const tokenRef = useRef(null);
  const countdownRef = useRef(null);
  const audioContextRef = useRef(null);

  const [locationStatus, setLocationStatus] = useState('idle'); // idle | requesting | granted | denied | unsupported | error
  const [locationError, setLocationError] = useState(null);
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);

  const calculateDistanceMeters = useCallback((from, to) => {
    if (!from || !to) return Number.POSITIVE_INFINITY;
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // metros
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const normalizeEmergency = (raw) => {
    if (!raw) return null;
    const emergencyId = raw.emergencyId || raw._id;
    const triage = raw.triage || {
      mainReason: raw.mainReason,
      criticalFlags: raw.criticalFlags || [],
      priorityHint: raw.urgency || raw.priorityHint || 'medium'
    };

    return {
      emergencyId,
      petName: raw.petName || raw.petId?.name || 'Mascota',
      triage,
      urgency: raw.urgency || triage?.priorityHint || 'medium',
      location: raw.location || { address: raw.address || '' },
      pricing: raw.pricing || { total: raw.pricingTotal || raw.total || 0 },
      distance: raw.distanceKm ?? raw.distance ?? null,
      offer: raw.offer || null,
      offerExpiresAt: raw.offer?.expiresAt
        ? new Date(raw.offer.expiresAt).getTime()
        : raw.expiresAt
        ? new Date(raw.expiresAt).getTime()
        : null,
      raw
    };
  };

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setOfferSecondsLeft(null);
  }, []);

  const startCountdown = useCallback(
    (deadline) => {
      if (!deadline) {
        clearCountdown();
        return;
      }

      const deadlineMs = typeof deadline === 'number' ? deadline : new Date(deadline).getTime();
      if (Number.isNaN(deadlineMs)) {
        clearCountdown();
        return;
      }

      clearCountdown();

      const tick = () => {
        const diff = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
        setOfferSecondsLeft(diff);
        if (diff <= 0) {
          clearCountdown();
        }
      };

      tick();
      countdownRef.current = window.setInterval(tick, 500);
    },
    [clearCountdown]
  );

  const fetchEmergencyDetails = useCallback(
    async (emergencyId) => {
      if (!emergencyId) return null;
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_BASE}/api/emergency/${emergencyId}/tracking`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (data.success) {
          return {
            ...data.request,
            conversationId: data.conversationId || null
          };
        }
        return null;
      } catch (error) {
        console.error('Error al obtener detalles de la urgencia:', error);
        return null;
      }
    },
    [API_BASE]
  );

  const fetchVetStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser || !token) return;

      const { data } = await axios.get(`${API_BASE}/api/vets/${storedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📊 Estado del vet desde backend:', {
        availableNow: data.availableNow,
        currentStatus: data.currentStatus,
        supportsEmergency: data.supportsEmergency,
        isApproved: data.isApproved
      });

      // Obtener valores del backend (fuente de verdad)
      const cachedAvailability = sessionStorage.getItem(AVAILABILITY_CACHE_KEY) === 'true';
      const backendAvailability = data.availableNow || false;
      const backendStatus = data.currentStatus || 'offline';
      
      // SIEMPRE respetar el estado del backend como fuente de verdad
      // Si el backend dice no disponible u offline, respetarlo (el usuario puede haber desactivado)
      if (!backendAvailability || backendStatus === 'offline') {
        // El backend dice no disponible u offline -> respetar y actualizar cache
        console.log('📊 Backend indica no disponible u offline. Respetando estado del backend.');
        setIsAvailable(false);
        setCurrentStatus('offline');
        // Actualizar cache para reflejar el estado real
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(AVAILABILITY_CACHE_KEY, 'false');
        }
      } else {
        // El backend dice disponible y no está offline
        // Usar los valores del backend como fuente de verdad
        setIsAvailable(backendAvailability);
        setCurrentStatus(backendStatus);
        // Actualizar cache para mantener sincronización
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(AVAILABILITY_CACHE_KEY, String(backendAvailability));
        }
      }

      if (data.activeEmergency) {
        const details = await fetchEmergencyDetails(data.activeEmergency);
        setActiveEmergency(details);
      } else {
        setActiveEmergency(null);
      }
    } catch (error) {
      console.error('Error al obtener estado del veterinario:', error);
    }
  }, [API_BASE, fetchEmergencyDetails]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(REJECTED_CACHE_KEY, JSON.stringify(rejectedEmergencies));
      } catch (error) {
        console.warn('Error caching rejected emergencies', error);
      }
    }
  }, [rejectedEmergencies]);

  const isRejected = useCallback(
    (id) => rejectedEmergencies.includes(id),
    [rejectedEmergencies]
  );

  const stopLocationWatch = useCallback(() => {
    if (locationWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
  }, []);

  const updateVetLocation = useCallback(
    async ({ lat, lng }) => {
      const vetId = vetIdRef.current;
      const token = tokenRef.current || localStorage.getItem('token');
      if (!vetId || !token) return;

      try {
        const lastSent = lastLocationRef.current;
        const now = Date.now();
        if (lastSent?.timestamp) {
          const secondsSinceLastSend = (now - lastSent.timestamp) / 1000;
          const distance = calculateDistanceMeters(lastSent.coords, { lat, lng });
          if (secondsSinceLastSend < 20 && distance < 30) {
            return;
          }
        }

        lastLocationRef.current = {
          coords: { lat, lng },
          timestamp: now
        };

        await axios.put(
          `${API_BASE}/api/vets/update/${vetId}`,
          { lat, lng },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (error) {
        console.error('Error al actualizar la ubicación del veterinario:', error);
      }
    },
    [API_BASE, calculateDistanceMeters]
  );

  const handleLocationSuccess = useCallback(
    (position) => {
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setLocationStatus('granted');
      setLocationError(null);

      updateVetLocation(coords);
    },
    [updateVetLocation]
  );

  const handleLocationError = useCallback(
    (error) => {
      if (!error) return;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setLocationStatus('denied');
          setLocationError('Necesitamos tu ubicación para priorizar urgencias cercanas.');
          stopLocationWatch();
          break;
        case error.POSITION_UNAVAILABLE:
          setLocationStatus('error');
          setLocationError('No pudimos obtener tu ubicación. Intenta nuevamente.');
          break;
        case error.TIMEOUT:
          setLocationStatus('error');
          setLocationError('La solicitud de ubicación demoró demasiado. Intenta otra vez.');
          break;
        default:
          setLocationStatus('error');
          setLocationError('Ocurrió un error al obtener tu ubicación.');
      }
    },
    [stopLocationWatch]
  );

  const requestLocationAccess = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported');
      setLocationError('Tu navegador no soporta geolocalización.');
      return;
    }

    setLocationStatus('requesting');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    stopLocationWatch();
    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationSuccess,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 15000
      }
    );
  }, [handleLocationError, handleLocationSuccess, stopLocationWatch]);

  // Inicializar AudioContext con interacción del usuario
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log('AudioContext inicializado');
      } catch (error) {
        console.error('Error al inicializar AudioContext:', error);
      }
    }
    
    // Reanudar si está suspendido
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('AudioContext reanudado');
      }).catch((error) => {
        console.error('Error al reanudar AudioContext:', error);
      });
    }
  }, []);

  const toggleAvailability = useCallback(async () => {
    try {
      // Inicializar AudioContext con la interacción del usuario
      initAudioContext();

      const token = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser || !token) return;

      const newAvailability = !isAvailable;
      
      // Si está intentando ACTIVAR la disponibilidad, validar permisos obligatorios
      if (newAvailability) {
        // Solo validar ubicación para urgencias (notificaciones no son obligatorias)
        const permissionsResult = await validateLocationPermission();
        
        if (!permissionsResult.success) {
          // Construir mensaje de error detallado
          const errorMessage = `Para activar tu disponibilidad para urgencias, es obligatorio habilitar el permiso de ubicación.\n\n${permissionsResult.errors.join('\n')}\n\nPor favor, habilita el permiso de ubicación e intenta nuevamente.`;
          
          alert(errorMessage);
          return; // No activar la disponibilidad si falta el permiso de ubicación
        }
      }
      
      // Actualizar estado optimísticamente ANTES de la llamada al backend
      // Esto evita que el botón esté deshabilitado mientras se procesa la petición
      setIsAvailable(newAvailability);
      const newStatus = newAvailability ? 'available' : 'offline';
      setCurrentStatus(newStatus);
      
      // Persistir en sessionStorage inmediatamente
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(AVAILABILITY_CACHE_KEY, String(newAvailability));
      }
      
      console.log(`Disponibilidad actualizada (optimista): ${newAvailability ? 'Disponible' : 'No disponible'}, Estado: ${newStatus}`);
      
      // Luego actualizar en el backend
      await axios.put(
        `${API_BASE}/api/vets/update/${storedUser.id}`,
        {
          availableNow: newAvailability,
          currentStatus: newStatus
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`Disponibilidad confirmada en backend: ${newAvailability ? 'Disponible' : 'No disponible'}`);
    } catch (error) {
      console.error('Error al cambiar disponibilidad:', error);
      // Revertir el estado optimista si falla
      setIsAvailable(!isAvailable);
      setCurrentStatus(isAvailable ? 'available' : 'offline');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(AVAILABILITY_CACHE_KEY, String(!isAvailable));
      }
      alert('No se pudo actualizar tu disponibilidad. Intenta nuevamente.');
    }
  }, [API_BASE, initAudioContext, isAvailable]);

  const fetchPendingEmergencies = useCallback(async () => {
    if (pendingFetchRef.current) return;
    pendingFetchRef.current = true;
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE}/api/emergency/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (Array.isArray(data?.emergencies)) {
        const normalized = data.emergencies
          .map(normalizeEmergency)
          .filter((item) => {
            const status = (item?.raw?.status || '').toLowerCase();
            return !status.includes('cancel');
          })
          .filter((item) => item && !isRejected(item.emergencyId));
        setEmergencies(normalized);
        if (normalized.length > 0 && normalized[0].offerExpiresAt) {
          startCountdown(normalized[0].offerExpiresAt);
        } else {
          clearCountdown();
        }
      } else {
        setEmergencies([]);
        clearCountdown();
      }
    } catch (error) {
      console.error('Error fetching pending emergencies:', error);
    } finally {
      pendingFetchRef.current = false;
    }
  }, [API_BASE, clearCountdown, isRejected, startCountdown]);

  const pollUpdates = useCallback(() => {
    fetchPendingEmergencies();
    fetchVetStatus();
  }, [fetchPendingEmergencies, fetchVetStatus]);

  // Función para reproducir sonido de notificación
  const playNotificationSound = useCallback(async () => {
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) {
        console.log('AudioContext no disponible - activa tu disponibilidad primero');
        return;
      }

      // Reanudar si está suspendido
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('AudioContext reanudado para reproducir sonido');
        } catch (error) {
          console.error('No se pudo reanudar AudioContext:', error);
          return;
        }
      }

      // Esperar a que esté en estado 'running'
      if (audioContext.state !== 'running') {
        console.log('AudioContext no está listo, estado:', audioContext.state);
        return;
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Frecuencia inicial más alta para un sonido más llamativo
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // Segundo beep más corto para hacerlo más distintivo
      setTimeout(() => {
        if (!audioContextRef.current || audioContextRef.current.state !== 'running') return;
        
        const oscillator2 = audioContextRef.current.createOscillator();
        const gainNode2 = audioContextRef.current.createGain();

        oscillator2.type = 'sine';
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContextRef.current.destination);

        oscillator2.frequency.setValueAtTime(900, audioContextRef.current.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(700, audioContextRef.current.currentTime + 0.1);

        gainNode2.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);

        oscillator2.start(audioContextRef.current.currentTime);
        oscillator2.stop(audioContextRef.current.currentTime + 0.2);
      }, 150);
    } catch (error) {
      console.log('No se pudo reproducir sonido de notificación:', error);
    }
  }, []);

  // Persistir en cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(emergencies));
      } catch (error) {
        console.warn('Error caching vet emergencies', error);
      }
    }
  }, [emergencies]);

  // Conectar al socket y cargar datos iniciales
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || storedUser.role !== 'Vet') {
      navigate('/login');
      return;
    }
    setVet(storedUser);
    vetIdRef.current = storedUser.id;
    tokenRef.current = localStorage.getItem('token');

    if (!hasRequestedLocation) {
      requestLocationAccess();
      setHasRequestedLocation(true);
    }

    // Conectar a Socket.IO
    const socket = io(`${API_BASE}/emergency`, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Conectado al socket de emergencias');
      console.log('🔌 Socket ID:', socket.id);
      setConnectionStatus('connected');
      
      // Unirse a la sala del veterinario
      socket.emit('join:vet', storedUser.id);
      console.log(`🩺 Veterinario registrado: ${storedUser.id}`);
      console.log(`📡 Escuchando eventos en sala: vet:${storedUser.id}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Desconectado del socket');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error);
      setConnectionStatus('error');
    });

    const handleEmergencyOffer = (payload) => {
      console.log('🚨 Oferta de urgencia recibida:', payload);

      // Reproducir sonido de notificación
      playNotificationSound();

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nueva urgencia disponible', {
          body: `${payload.petName || 'Paciente'} • ${payload.priority || 'Normal'} • ${
            payload.distance ?? '?'
          } km`,
          icon: '/vet-icon.png',
          tag: payload.emergencyId
        });
      }

      const normalized = normalizeEmergency({
        emergencyId: payload.emergencyId,
        petName: payload.petName,
        triage: payload.triage,
        urgency: payload.priority || payload.urgency,
        location: payload.location,
        pricing: payload.pricing,
        distance: payload.distance,
        offer: {
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt).toISOString() : null
        }
      });

      if (normalized) {
        normalized.eta = payload.eta ?? null;
        normalized.offerPosition = payload.position ?? null;
        normalized.offerTotal = payload.totalCandidates ?? null;
        setEmergencies([normalized]);
        if (payload.expiresAt) {
          startCountdown(payload.expiresAt);
        } else {
          clearCountdown();
        }
      }
    };

    const handleOfferExpired = ({ emergencyId }) => {
      console.log('⏱️ Oferta expirada automáticamente:', emergencyId);
      setEmergencies((prev) => prev.filter((e) => e.emergencyId !== emergencyId));
      clearCountdown();
    };

    const handleOfferWithdrawn = ({ emergencyId }) => {
      console.log('ℹ️ Oferta retirada:', emergencyId);
      setEmergencies((prev) => prev.filter((e) => e.emergencyId !== emergencyId));
      clearCountdown();
    };

    const handleOfferCancelled = ({ emergencyId }) => {
      console.log('ℹ️ Oferta cancelada:', emergencyId);
      setEmergencies((prev) => prev.filter((e) => e.emergencyId !== emergencyId));
      clearCountdown();
    };

    const handleEmergencyCancelled = (data) => {
      console.log('ℹ️ Urgencia cancelada:', data);
      setEmergencies((prev) => prev.filter((e) => e.emergencyId !== data.emergencyId));
      clearCountdown();
      fetchPendingEmergencies();
      setActiveEmergency((prev) => (prev?._id === data.emergencyId ? null : prev));
      fetchVetStatus();
    };

    const handleUserConfirmed = (data) => {
      setActiveEmergency((prev) => {
        if (!prev || prev._id !== data.emergencyId) return prev;
        return {
          ...prev,
          tracking: {
            ...(prev.tracking || {}),
            status: 'in-service'
          }
        };
      });
    };

    // Escuchar todos los eventos de ofertas
    socket.on('emergency:offer', (payload) => {
      console.log('📨 Evento emergency:offer recibido:', payload);
      handleEmergencyOffer(payload);
    });
    socket.on('emergency:new', (payload) => {
      console.log('📨 Evento emergency:new recibido:', payload);
      handleEmergencyOffer(payload);
    });
    socket.on('emergency:offer-expired', (data) => {
      console.log('⏱️ Evento emergency:offer-expired recibido:', data);
      handleOfferExpired(data);
    });
    socket.on('emergency:offer-withdrawn', (data) => {
      console.log('ℹ️ Evento emergency:offer-withdrawn recibido:', data);
      handleOfferWithdrawn(data);
    });
    socket.on('emergency:offer-cancelled', (data) => {
      console.log('ℹ️ Evento emergency:offer-cancelled recibido:', data);
      handleOfferCancelled(data);
    });
    socket.on('emergency:cancelled', (data) => {
      console.log('ℹ️ Evento emergency:cancelled recibido:', data);
      handleEmergencyCancelled(data);
    });
    socket.on('emergency:user-confirmed', handleUserConfirmed);

    socket.on('emergency:completed', (data) => {
      console.log('✅ Urgencia completada:', data);
      setActiveEmergency(null);
      fetchPendingEmergencies(); // Refrescar lista de emergencias pendientes
    });

    socket.on('status:updated', (data) => {
      if (data.status === 'completed') {
        console.log('✅ Estado actualizado a completado:', data);
        setActiveEmergency(null);
        fetchPendingEmergencies(); // Refrescar lista de emergencias pendientes
      }
    });
    
    // Log de todos los eventos recibidos para debug
    socket.onAny((eventName, ...args) => {
      if (eventName.startsWith('emergency:')) {
        console.log(`🔔 Evento socket recibido: ${eventName}`, args);
      }
    });

    // Pedir permiso para notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    setLoading(false);

    return () => {
      if (socket) {
        socket.off('emergency:offer');
        socket.off('emergency:new');
        socket.off('emergency:offer-expired');
        socket.off('emergency:offer-withdrawn');
        socket.off('emergency:offer-cancelled');
        socket.off('emergency:cancelled');
        socket.off('emergency:user-confirmed');
        socket.offAny();
        socket.disconnect();
      }
    };
  }, [
    API_BASE,
    clearCountdown,
    fetchPendingEmergencies,
    fetchVetStatus,
    hasRequestedLocation,
    navigate,
    playNotificationSound,
    requestLocationAccess,
    startCountdown
  ]);

  const handleAccept = (emergency) => {
    if (!socketRef.current) {
      alert('No hay conexión con el servidor');
      return;
    }
    if (!vet) return;
    
    // Verificar disponibilidad básica
    // El backend validará la disponibilidad real, pero mostramos un mensaje si claramente no está disponible
    if (!isAvailable && currentStatus === 'offline') {
      alert('Activa tu disponibilidad para aceptar urgencias.');
      return;
    }
    
    // Verificar si ya hay una emergencia activa
    if (activeEmergency && activeEmergency._id) {
      alert('Ya tienes una emergencia activa. Finaliza la actual antes de aceptar otra.');
      return;
    }

    console.log('✅ Aceptando urgencia:', emergency.emergencyId);
    console.log('📊 Estado actual:', { isAvailable, connectionStatus, currentStatus });
    
    socketRef.current.emit('emergency:accept', {
      emergencyId: emergency.emergencyId,
      vetId: vet.id
    });

    // Escuchar respuesta
    socketRef.current.once('emergency:accept:success', async (data) => {
      console.log('✅ Urgencia aceptada exitosamente');
      
      setEmergencies(prev => prev.filter(e => e.emergencyId !== emergency.emergencyId));
      clearCountdown();

      if (data?.emergencyId) {
        const details = await fetchEmergencyDetails(data.emergencyId);
        setActiveEmergency(details || { ...emergency, _id: data.emergencyId });
      } else {
        setActiveEmergency({ ...emergency });
      }

      fetchVetStatus();
      navigate(`/vet/emergency/${emergency.emergencyId}/tracking`);
    });

    socketRef.current.once('emergency:accept:error', (error) => {
      console.error('❌ Error al aceptar urgencia:', error);
      alert('Error al aceptar la urgencia: ' + error.message);
    });
  };

  const handleReject = (emergency) => {
    if (!socketRef.current || !vet) return;

    console.log('❌ Rechazando urgencia:', emergency.emergencyId);
    
    socketRef.current.emit('emergency:reject', {
      emergencyId: emergency.emergencyId,
      vetId: vet.id,
      reason: 'No disponible'
    });

    // Remover de la lista
    setEmergencies(prev => prev.filter(e => e.emergencyId !== emergency.emergencyId));
    clearCountdown();
    setRejectedEmergencies((prev) => {
      if (prev.includes(emergency.emergencyId)) return prev;
      return [...prev, emergency.emergencyId];
    });
  };

  useEffect(() => {
    pollUpdates();
  }, [pollUpdates]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Polling más frecuente para no perder ofertas que expiran en 10 segundos
    const intervalId = window.setInterval(() => {
      pollUpdates();
    }, 5000); // 5 segundos en lugar de 15

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pollUpdates]);

  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  useEffect(() => {
    return () => {
      stopLocationWatch();
    };
  }, [stopLocationWatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Cargando panel de urgencias...</p>
        </div>
      </div>
    );
  }

  const statusLabels = {
    available: 'En línea',
    busy: 'Atendiendo',
    'on-way': 'En camino',
    offline: 'Fuera de línea'
  };

  const currentStatusLabel = statusLabels[currentStatus] || currentStatus;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Panel de urgencias</h1>
          <p className="text-sm text-gray-600">
            Revisa tu disponibilidad y gestiona las solicitudes cercanas en tiempo real.
          </p>
        </header>

        <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Conexión</p>
              <p className="text-sm text-gray-800">
                {connectionStatus === 'connected'
                  ? 'Conectado al sistema'
                  : connectionStatus === 'error'
                  ? 'Error de conexión'
                  : 'Reconectando...'}
              </p>
              </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Ubicación</p>
              <p className="text-sm text-gray-800">
                {locationStatus === 'granted'
                  ? 'Compartida'
                  : locationStatus === 'requesting'
                  ? 'Solicitando permiso...'
                  : 'No disponible'}
              </p>
            </div>
          </div>

          {(locationStatus === 'denied' ||
            locationStatus === 'error' ||
            locationStatus === 'unsupported') && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm text-amber-800">
                Necesitamos tu ubicación para ordenar urgencias cercanas.{' '}
                <button
                  onClick={requestLocationAccess}
                  className="font-semibold underline hover:no-underline"
                >
                  Reintentar
                </button>
              </p>
              {locationError && <p className="text-xs text-amber-700 mt-1">{locationError}</p>}
        </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                      <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Disponibilidad</p>
              <p className="text-base font-medium text-gray-900">
                {isAvailable ? 'Disponible' : 'No disponible'}
              </p>
              <p className="text-xs text-gray-500">Estado actual: {currentStatusLabel}</p>
                      </div>
            <button
              onClick={toggleAvailability}
              className={`px-4 py-2 rounded-md text-sm font-semibold border transition ${
                isAvailable
                  ? 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isAvailable ? 'Ir a fuera de línea' : 'Activar disponibilidad'}
                    </button>
                  </div>
        </section>

        {activeEmergency && (
          <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Urgencia en curso</h2>
              <span className="text-xs uppercase text-gray-500">
                {formatReason(activeEmergency.triage?.mainReason) || 'Sin motivo'}
              </span>
                </div>
            <p className="text-sm text-gray-700">
              {activeEmergency.petId?.name || activeEmergency.petName || 'Paciente'} ·{' '}
              {activeEmergency.location?.address || 'Ubicación no disponible'}
            </p>
            <button
              onClick={() => navigate(`/vet/emergency/${activeEmergency._id || activeEmergency.emergencyId}/tracking`)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Abrir seguimiento →
            </button>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FaBell className="text-indigo-500" />
              Urgencias pendientes
          </h2>
            <span className="text-sm text-gray-500">
              {emergencies.length} {emergencies.length === 1 ? 'urgencia' : 'urgencias'}
            </span>
        </div>

        {emergencies.length === 0 ? (
            <div className="text-sm text-gray-500">No hay solicitudes pendientes por ahora.</div>
          ) : (
            <div className="space-y-3">
              {emergencies.map((emergency) => (
                <article
                  key={emergency.emergencyId}
                  className="border border-gray-200 rounded-md p-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {emergency.petName || 'Paciente'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatReason(emergency.triage?.mainReason) || 'Motivo no indicado'}
                      </p>
                      {typeof emergency.eta === 'number' && (
                        <p className="text-xs text-gray-400 mt-1">ETA aprox: {emergency.eta} min</p>
            )}
          </div>
                    <span className="text-xs text-gray-500">
                      {emergency.distance !== null && emergency.distance !== undefined
                        ? `${Number(emergency.distance).toFixed(1)} km`
                        : '—'}
                    </span>
                </div>

                  {offerSecondsLeft !== null && emergency.offerExpiresAt && (
                    <div className="text-xs font-semibold text-indigo-600">
                      Responde en {offerSecondsLeft}s
                      {emergency.offerPosition && emergency.offerTotal
                        ? ` • Turno ${emergency.offerPosition}/${emergency.offerTotal}`
                        : ''}
                      </div>
                    )}

                  {emergency.location?.address && (
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <FaMapMarkerAlt className="text-gray-400" />
                      {emergency.location.address}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>Pago estimado</span>
                    <span>
                      $
                      {new Intl.NumberFormat('es-CL').format(emergency.pricing?.total || 0)}
                      </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleReject(emergency)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                    >
                      <FaTimesCircle /> Rechazar
                    </button>
                    <button
                      onClick={() => handleAccept(emergency)}
                      disabled={!isAvailable && currentStatus === 'offline'}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        (isAvailable || currentStatus !== 'offline')
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      title={!isAvailable && currentStatus === 'offline' ? 'Activa tu disponibilidad para aceptar urgencias' : ''}
                    >
                      <FaCheckCircle /> Aceptar
                    </button>
                </div>

                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <FaClock />
                    Hace unos momentos
                  </div>
                </article>
            ))}
          </div>
        )}
        </section>
      </div>
    </div>
  );
};

export default VetEmergenciesPage;

