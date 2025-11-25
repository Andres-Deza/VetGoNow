import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import PetAvatar from "../../components/PetAvatar";
import { validateLocationPermission } from '../../utils/permissions';

const VetEmergencyPanel = () => {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  
  const PENDING_CACHE_KEY = 'vet:pending-emergencies';

  const [pendingEmergencies, setPendingEmergencies] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(PENDING_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn('Error reading cached emergencies:', err);
    }
    return [];
  });
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [lastSocketEmergencyId, setLastSocketEmergencyId] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const socketRef = useRef(null);
  const audioRef = useRef(new Audio('/notification-sound.mp3'));
  const activeEmergencyIdRef = useRef(null);

  useEffect(() => {
    activeEmergencyIdRef.current = activeEmergency?._id || null;
  }, [activeEmergency]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(PENDING_CACHE_KEY, JSON.stringify(pendingEmergencies));
      } catch (err) {
        console.warn('Error caching emergencies:', err);
      }
    }
  }, [pendingEmergencies]);

  const fetchEmergencyDetails = useCallback(async (emergencyId) => {
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
      console.error('Error fetching emergency details:', error);
      return null;
    }
  }, [API_BASE]);

  const fetchPendingEmergencies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE}/api/emergency/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(data.emergencies)) {
        const sanitized = data.emergencies.filter((emergency) => {
          const status = (emergency?.status || '').toLowerCase();
          return !status.includes('cancel');
        });
        console.log(`fetchPendingEmergencies: recibidas ${data.emergencies.length}, visibles ${sanitized.length}`);
        setPendingEmergencies(sanitized);
      } else {
        console.log('fetchPendingEmergencies: respuesta sin listado de emergencias', data);
      }
    } catch (error) {
      console.error('Error fetching pending emergencies:', error);
    }
  }, [API_BASE]);

  const fetchVetStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const { data } = await axios.get(`${API_BASE}/api/vets/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsAvailable(data.availableNow || false);
      
      if (data.activeEmergency) {
        const details = await fetchEmergencyDetails(data.activeEmergency);
        const status = (details?.status || '').toLowerCase();
        setActiveEmergency(details && !status.includes('cancel') ? details : null);
        console.log('fetchVetStatus: emergencia activa', details?._id, status);
      } else {
        console.log('fetchVetStatus: sin emergencia activa');
        setActiveEmergency(null);
      }
    } catch (error) {
      console.error('Error fetching vet status:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, fetchEmergencyDetails]);

  const pollUpdates = useCallback(() => {
    fetchPendingEmergencies();
    fetchVetStatus();
    console.log('pollUpdates ejecutado');
  }, [fetchPendingEmergencies, fetchVetStatus]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'Vet') {
      navigate('/login');
      return;
    }

    fetchVetStatus();
    fetchPendingEmergencies();

    const socket = io(`${API_BASE}/emergency`, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current = socket;

    const handleConnect = () => {
      console.log('Vet connected to emergency socket');
      socket.emit('join:vet', user.id);
    };

    const handleUserConfirmed = (data) => {
      if (activeEmergencyIdRef.current === data.emergencyId) {
        setActiveEmergency((prev) =>
          prev
            ? {
                ...prev,
                tracking: {
                  ...(prev.tracking || {}),
                  status: 'in-service'
                }
              }
            : prev
        );
      }
    };

    const handleIncomingEmergency = async (data) => {
      console.log('New emergency received:', data);

      setLastSocketEmergencyId(data?.emergencyId || null);

      playNotificationSound();
      showBrowserNotification(
        'Nueva urgencia disponible',
        'Tienes una nueva solicitud de urgencia'
      );

      const details = await fetchEmergencyDetails(data.emergencyId);
      if (details) {
        setPendingEmergencies((prev) => {
          const exists = prev.some((e) => e._id === details._id);
          if (exists) {
            return prev.map((e) => (e._id === details._id ? details : e));
          }
          return [details, ...prev];
        });
      } else {
        await fetchPendingEmergencies();
      }
    };

    const handleEmergencyCancelled = (data) => {
      setPendingEmergencies((prev) => prev.filter((e) => e._id !== data.emergencyId));
      pollUpdates();

      if (activeEmergency?._id === data.emergencyId) {
        setActiveEmergency(null);
        alert('El usuario canceló la urgencia');
      }
    };

    const handleOfferWithdrawn = (data) => {
      console.log('ℹ️ Oferta retirada:', data);
      setPendingEmergencies((prev) => prev.filter((e) => {
        const id = e._id || e.id;
        return id !== data.emergencyId;
      }));
    };

    const handleOfferRejectedAuto = (data) => {
      console.log('ℹ️ Oferta rechazada automáticamente:', data);
      setPendingEmergencies((prev) => prev.filter((e) => {
        const id = e._id || e.id;
        return id !== data.emergencyId;
      }));
    };

    socket.on('connect', handleConnect);
    socket.on('emergency:user-confirmed', handleUserConfirmed);
    socket.on('new:emergency', handleIncomingEmergency);
    socket.on('emergency:new', handleIncomingEmergency);
    socket.on('emergency:cancelled', handleEmergencyCancelled);
    socket.on('emergency:offer-withdrawn', handleOfferWithdrawn);
    socket.on('emergency:offer-rejected-auto', handleOfferRejectedAuto);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('emergency:user-confirmed', handleUserConfirmed);
      socket.off('new:emergency', handleIncomingEmergency);
      socket.off('emergency:new', handleIncomingEmergency);
      socket.off('emergency:cancelled', handleEmergencyCancelled);
      socket.off('emergency:offer-withdrawn', handleOfferWithdrawn);
      socket.off('emergency:offer-rejected-auto', handleOfferRejectedAuto);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [API_BASE, fetchPendingEmergencies, fetchVetStatus, fetchEmergencyDetails, pollUpdates, navigate]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    pollUpdates();
    console.log('Inicializando polling de urgencias');

    const intervalId = window.setInterval(pollUpdates, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollUpdates();
        console.log('Tab visible nuevamente, poll ejecutado');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollUpdates]);

  useEffect(() => {
    if (!lastSocketEmergencyId) return;

    const timeoutId = setTimeout(async () => {
      const details = await fetchEmergencyDetails(lastSocketEmergencyId);
      if (details) {
        setPendingEmergencies(prev => {
          const exists = prev.some(e => e._id === details._id);
          if (exists) {
            return prev.map(e => (e._id === details._id ? details : e));
          }
          return [details, ...prev];
        });
      } else {
        await fetchPendingEmergencies();
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [lastSocketEmergencyId, fetchEmergencyDetails, fetchPendingEmergencies]);

  const toggleAvailability = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
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
      
      await axios.put(
        `${API_BASE}/api/vets/update/${user.id}`,
        {
          availableNow: newAvailability,
          currentStatus: newAvailability ? 'available' : 'offline'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsAvailable(newAvailability);
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Error al cambiar disponibilidad');
    }
  };

  const handleAcceptEmergency = async (emergency) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Verificar si ya hay una emergencia activa
    if (activeEmergency && activeEmergency._id) {
      alert('Ya tienes una emergencia activa. Finaliza la actual antes de aceptar otra.');
      return;
    }
    
    socketRef.current?.emit('emergency:accept', {
      emergencyId: String(emergency._id || emergency.id || ''),
      vetId: user.id
    });

    socketRef.current?.once('emergency:accept:success', (payload) => {
      if (!payload?.emergencyId) return;

      setActiveEmergency({
        ...emergency,
        _id: payload.emergencyId,
        conversationId: payload?.conversationId || null
      });
      setPendingEmergencies(prev => prev.filter(e => e._id !== payload.emergencyId));
      
      // Redirigir a página de navegación
      navigate(`/vet/emergency/${payload.emergencyId}/navigate`, {
        state: { conversationId: payload?.conversationId || null }
      });
    });

    socketRef.current?.once('emergency:accept:error', (data) => {
      alert('Error al aceptar urgencia: ' + data.message);
    });
  };

  const handleRejectEmergency = (emergency) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    socketRef.current?.emit('emergency:reject', {
      emergencyId: String(emergency._id || emergency.id || ''),
      vetId: user.id,
      reason: 'Veterinario ocupado'
    });

    setPendingEmergencies(prev => prev.filter(e => e._id !== emergency._id));
  };

  const playNotificationSound = () => {
    audioRef.current.play().catch(err => console.log('Error playing sound:', err));
  };

  const showBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/logo.png' });
        }
      });
    }
  };

  const getReasonLabel = (reason) => {
    if (!reason || typeof reason !== 'string') {
      return 'Urgencia';
    }
    const labels = {
      'trauma': 'Trauma / Accidente',
      'bleeding': 'Sangrado',
      'breathing': 'Dificultad respiratoria',
      'seizures': 'Convulsiones',
      'poisoning': 'Envenenamiento',
      'vomiting': 'Vómitos persistentes',
      'pain': 'Dolor intenso',
      'urinary': 'Retención urinaria',
      'other': 'Otro'
    };
    
    return labels[reason] || String(reason);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de urgencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-900">Panel de Urgencias</h1>
              <span className="text-sm text-gray-500">Solicitudes cercanas a tu ubicación</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                <span>Conectado</span>
              </div>

              <button
                onClick={toggleAvailability}
                className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  isAvailable
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-white' : 'bg-gray-600'}`}></div>
                <span>{isAvailable ? 'Disponible' : 'No disponible'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Estado de tu disponibilidad</h2>
            <p className="text-sm text-gray-500">
              Cambia tu estado cuando puedas recibir nuevas urgencias. Si estás en verde, los tutores podrán
              encontrarte.
            </p>
            <div className="mt-3 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              Si el tutor cancela después de que aceptes la urgencia, se cobrará solo el porcentaje correspondiente al desplazamiento realizado.
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span>Conectado</span>
            </div>
            <button
              onClick={toggleAvailability}
              className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                isAvailable
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-white' : 'bg-gray-600'}`}></div>
              <span>{isAvailable ? 'Disponible' : 'No disponible'}</span>
            </button>
          </div>
        </div>
        {/* Urgencia activa */}
        {activeEmergency && (
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <h2 className="text-xl font-bold">Urgencia en curso</h2>
            </div>
            <p className="text-violet-100 mb-4">
              {getReasonLabel(activeEmergency.triage?.mainReason) || 'Urgencia'} - {String(activeEmergency.petId?.name || 'Mascota')}
            </p>
            <button
              onClick={() => navigate(`/vet/emergency/${String(activeEmergency._id || '')}/navigate`)}
              className="px-6 py-3 bg-white text-violet-600 rounded-xl hover:bg-gray-100 font-semibold"
            >
              Ver navegación
            </button>
            {activeEmergency.tracking?.status === 'in-service' && (
              <div className="mt-4 text-sm text-violet-100 bg-white/10 px-3 py-2 rounded-lg">
                {activeEmergency.tracking?.autoConfirmed
                  ? `Llegada validada por geolocalización${activeEmergency.tracking?.arrivalDistance ? ` (${activeEmergency.tracking.arrivalDistance}m del punto)` : ''}. Continúa con la atención o finalízala cuando corresponda.`
                  : 'El tutor confirmó tu llegada. Continúa con la atención o finalízala cuando corresponda.'}
              </div>
            )}
          </div>
        )}

        {/* Urgencias pendientes */}
        <div className="mb-6">
          {(() => {
            const visibleEmergencies = pendingEmergencies.filter(
              (emergency) => emergency?.status !== 'cancelled'
            );
            const visibleCount = visibleEmergencies.length;
            return (
              <>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Urgencias disponibles
            {visibleCount > 0 && (
              <span className="ml-2 bg-red-600 text-white text-sm px-3 py-1 rounded-full">
                {visibleCount}
              </span>
            )}
          </h2>

          {!isAvailable && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                Activa tu disponibilidad para recibir solicitudes de urgencia
              </p>
            </div>
          )}

          {visibleCount === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <p className="text-gray-600">No hay urgencias disponibles en este momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleEmergencies.map((emergency) => (
                <div key={String(emergency._id || emergency.id || Math.random())} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🚨</span>
                          <h3 className="text-lg font-bold text-gray-900">
                            {getReasonLabel(emergency.triage?.mainReason) || 'Urgencia'}
                          </h3>
                          {emergency.triage?.priorityHint === 'high' && (
                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
                              CRÍTICO
                            </span>
                          )}
                        </div>
                        
                        {/* Información de la mascota */}
                        {emergency.petId && (
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                              <PetAvatar
                                image={emergency.petId.image}
                                species={emergency.petId.species}
                                name={emergency.petId.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{String(emergency.petId.name || 'Mascota')}</p>
                              <p className="text-sm text-gray-600">{String(emergency.petId.breed || '')}</p>
                            </div>
                          </div>
                        )}

                        {/* Ubicación */}
                        {emergency.location && (
                          <p className="text-sm text-gray-600 mb-2">
                            📍 {emergency.location.address || 
                              (emergency.location.lat != null && emergency.location.lng != null
                                ? `${Number(emergency.location.lat || 0).toFixed(4)}, ${Number(emergency.location.lng || 0).toFixed(4)}`
                                : 'Ubicación no disponible')}
                          </p>
                        )}

                        {/* Detalles adicionales */}
                        {emergency.triage?.details && (
                          <p className="text-sm text-gray-600 italic">
                            "{String(emergency.triage.details || '')}"
                          </p>
                        )}

                        {/* Pricing */}
                        {emergency.pricing && emergency.pricing.total !== undefined && (
                          <div className="mt-3 inline-flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
                            <span className="text-sm font-semibold text-green-700">
                              Pago: ${Number(emergency.pricing.total || 0).toLocaleString()} CLP
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAcceptEmergency(emergency)}
                        disabled={!isAvailable || activeEmergency}
                        className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Aceptar urgencia
                      </button>
                      <button
                        onClick={() => handleRejectEmergency(emergency)}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default VetEmergencyPanel;

