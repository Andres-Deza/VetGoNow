import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { JitsiMeeting } from '@jitsi/react-sdk';
import io from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5555';

export default function VideoCall() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  const [appt, setAppt] = useState(null);
  const [pres, setPres] = useState({ 
    symptoms: '', 
    medication: '', 
    dosage: '', 
    instructions: '',
    vaccinesApplied: [],
    dewormingsApplied: [],
    weightAtConsultation: null
  });
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [showDewormingForm, setShowDewormingForm] = useState(false);
  const [newVaccine, setNewVaccine] = useState({ name: '', type: '', batchNumber: '', manufacturer: '', nextDoseDate: '' });
  const [newDeworming, setNewDeworming] = useState({ name: '', type: '', productName: '', activeIngredient: '', dosage: '' });
  const [showPrescription, setShowPrescription] = useState(false);
  const [jitsiApi, setJitsiApi] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [isInCall, setIsInCall] = useState(false); // Iniciar en false para detectar cuando realmente se une
  const [hasLeft, setHasLeft] = useState(false);
  const isInitialJoinRef = useRef(true); // Bandera para detectar el login inicial
  const [appointmentCompleted, setAppointmentCompleted] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0); // Tiempo esperando cliente
  const [hasClient, setHasClient] = useState(false); // Si hay cliente conectado
  const [connectionQuality, setConnectionQuality] = useState(5); // Calidad de conexión (0-5)
  const [jitsiKey, setJitsiKey] = useState(0); // Key para reiniciar Jitsi
  const socketRef = useRef(null);
  const isRoleChangingRef = useRef(false); // Bandera para rastrear cambios de rol
  
  // Inicializar socket
  useEffect(() => {
    socketRef.current = io(API_BASE, { autoConnect: true });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token not found, vet is not authenticated!");
          alert("Vet is not authenticated. Please login.");
          navigate("/login");
          return;
        }

        const res = await axios.get(`/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Loaded appointment:', res.data.appointment);
        const appointment = res.data.appointment;
        setAppt(appointment);
        
        // Generar nombre de sala único usando el appointmentId
        const roomId = `vetgo-${appointmentId}`;
        setRoomName(roomId);
        
        // Obtener nombre del veterinario desde localStorage o datos de la cita
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const vetName = storedUser.name || appointment.vetId?.name || 'Veterinario';
        setUserDisplayName(vetName);
        console.log("Veterinario display name:", vetName);
      } catch (err) {
        console.error('Failed to load appointment:', err);
        alert('Failed to load appointment');
      }
    };
  
    fetchAppointment();
  }, [appointmentId, navigate]);

  const finish = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Validar que la receta esté completa antes de finalizar
      if (!pres.symptoms || !pres.medication || !pres.dosage || !pres.instructions) {
        const missingFields = [];
        if (!pres.symptoms) missingFields.push('Síntomas Observados');
        if (!pres.medication) missingFields.push('Medicamento');
        if (!pres.dosage) missingFields.push('Dosificación');
        if (!pres.instructions) missingFields.push('Instrucciones Adicionales');
        
        alert(`Por favor completa todos los campos de la receta antes de finalizar:\n- ${missingFields.join('\n- ')}`);
      return;
    }

      // PRIMERO: Guardar la receta (si falla, no se finaliza la cita)
      try {
      await axios.put(`/api/appointments/${appointmentId}/prescription`, {
        ...pres,
        petId: appt.petId._id,
        userId: appt.userId._id,
        vetId: appt.vetId._id,
        appointmentDate: appt.appointmentDate,
        scheduledTime: appt.scheduledTime,
        vaccinesApplied: pres.vaccinesApplied || [],
        dewormingsApplied: pres.dewormingsApplied || [],
        weightAtConsultation: pres.weightAtConsultation || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
        console.log('Receta guardada exitosamente');
      } catch (prescriptionError) {
        console.error('Error al guardar la receta:', prescriptionError);
        alert(`Error al guardar la receta: ${prescriptionError.response?.data?.message || prescriptionError.message}. Por favor intenta nuevamente.`);
        return; // No continuar si falla la receta
      }
      
      // SEGUNDO: Marcar la cita como completada (solo si la receta se guardó correctamente)
      try {
        await axios.put(`/api/appointments/${appointmentId}/status`, 
          { status: 'completed' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Cita marcada como completada');
        setAppointmentCompleted(true);
      } catch (statusError) {
        console.error('Error al marcar la cita como completada:', statusError);
        alert(`Error al finalizar la cita: ${statusError.response?.data?.message || statusError.message}`);
        return; // No continuar si falla el cambio de estado
      }

      // TERCERO: Expulsar a todos los participantes antes de cerrar
      if (jitsiApi) {
        try {
          const participants = jitsiApi.getParticipantsInfo();
          // Expulsar a todos excepto al veterinario local
          participants.forEach(participant => {
            if (!participant.isLocal) {
              jitsiApi.executeCommand('kickParticipant', {
                id: participant.id,
                reason: 'Consulta finalizada por el veterinario'
              });
            }
          });
          
          // Pequeño delay para que se procesen las expulsiones
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Error al expulsar participantes:', error);
        }
        
        // Cerrar la llamada
        jitsiApi.executeCommand('hangup');
      }

      alert('Cita completada exitosamente.');
      // Usar replace para evitar que el usuario pueda volver atrás a la videollamada
      console.log('Redirigiendo a /vet/history después de finalizar consulta');
      navigate('/vet/history', { replace: true });
    } catch (err) {
      console.error('Error completing appointment:', err);
      setAppointmentCompleted(false);
      alert(`Error al completar la cita: ${err.response?.data?.message || err.message}`);
    }
  };

  // Reiniciar videollamada (RECOMENDACIÓN 6)
  const restartCall = () => {
    if (jitsiApi) {
      try {
        jitsiApi.dispose();
      } catch (error) {
        console.error('Error al limpiar Jitsi API:', error);
      }
    }
    setJitsiKey(prev => prev + 1); // Forzar remount del componente
    setHasLeft(false);
    setIsInCall(true);
  };

  // Contador de tiempo de espera (RECOMENDACIÓN 5)
  useEffect(() => {
    if (isInCall && !hasClient && !hasLeft) {
      const interval = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setWaitingTime(0);
    }
  }, [isInCall, hasClient, hasLeft]);

  // Verificar estado de la cita periódicamente
  useEffect(() => {
    if (!appointmentId || appointmentCompleted) return;

    const checkAppointmentStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.data.appointment?.status === 'completed') {
          setAppointmentCompleted(true);
          if (jitsiApi) {
            jitsiApi.executeCommand('hangup');
          }
          alert('La consulta ha sido finalizada.');
          // Usar replace para evitar que el usuario pueda volver atrás a la videollamada
          console.log('Redirigiendo a /vet/history después de detectar cita completada');
          navigate('/vet/history', { replace: true });
        }
    } catch (err) {
        console.error('Error checking appointment status:', err);
      }
    };

    const interval = setInterval(checkAppointmentStatus, 5000); // Verificar cada 5 segundos
    return () => clearInterval(interval);
  }, [appointmentId, appointmentCompleted, jitsiApi, navigate]);

  if (!appt || !roomName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando cita...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Animación CSS para el panel móvil */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
      <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white overflow-hidden">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showPrescription ? 'md:w-auto' : ''}`}>
        {/* Header - Responsive */}
        <div className="bg-gray-800 px-4 md:px-6 py-3 md:py-4 border-b border-gray-700 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg md:text-xl font-semibold truncate">Consulta por Video</h1>
              {appt.petId?.name && appt.userId?.name && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-vet-primary/20 rounded-lg border border-vet-primary/30">
                  <span className="text-sm font-semibold text-white">
                    {appt.petId?.name}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-300">
                    Tutor: {appt.userId?.name}
                  </span>
                </div>
              )}
            </div>
            {/* En móvil, mostrar nombre y tutor en línea separada más visible */}
            {appt.petId?.name && appt.userId?.name && (
              <div className="md:hidden mb-2">
                <p className="text-sm font-semibold text-white">
                  {appt.petId?.name}
                </p>
                <p className="text-xs text-gray-300">
                  Tutor: {appt.userId?.name}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1 truncate">Sala: {roomName}</p>
          {/* Indicadores de estado */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            {/* Indicador de calidad de conexión (RECOMENDACIÓN 3) */}
            {connectionQuality !== null && (
              <div className="flex items-center gap-1">
                {connectionQuality >= 4 ? (
                  <span className="text-green-400">🟢 Conexión excelente</span>
                ) : connectionQuality >= 2 ? (
                  <span className="text-yellow-400">🟡 Conexión media</span>
                ) : (
                  <span className="text-red-400">🔴 Conexión débil</span>
                )}
              </div>
            )}
            {/* Contador de tiempo de espera (RECOMENDACIÓN 5) */}
            {!hasClient && waitingTime > 0 && (
              <span className="text-gray-400">
                Esperando cliente... {Math.floor(waitingTime / 60)}:{(waitingTime % 60).toString().padStart(2, '0')}
              </span>
            )}
            {hasClient && (
              <span className="text-green-400">✓ Cliente conectado</span>
            )}
          </div>
          </div>
          {/* Botón de notificar tutor - Desktop */}
          <button
            onClick={() => {
              if (appt && appointmentId && socketRef.current) {
                const userId = appt.userId?._id;
                if (userId) {
                  socketRef.current.emit('notify-tutor-during-call', {
                    appointmentId,
                    message: 'El veterinario te está notificando',
                    type: 'info'
                  });
                  
                  // Mostrar notificación local
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Notificación enviada', {
                      body: 'Se ha notificado al tutor',
                      icon: '/logo.png'
                    });
                  }
                  
                  // Mostrar mensaje temporal en la UI
                  alert('Notificación enviada al tutor');
                } else {
                  alert('No se pudo obtener el ID del tutor');
                }
              }
            }}
            className="hidden md:flex px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors items-center gap-2 ml-2"
            title="Notificar al tutor"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notificar Tutor
          </button>
          
          {/* Botón de notificar tutor - Móvil */}
          <button
            onClick={() => {
              if (appt && appointmentId && socketRef.current) {
                const userId = appt.userId?._id;
                if (userId) {
                  socketRef.current.emit('notify-tutor-during-call', {
                    appointmentId,
                    message: 'El veterinario te está notificando',
                    type: 'info'
                  });
                  
                  // Mostrar notificación local
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Notificación enviada', {
                      body: 'Se ha notificado al tutor',
                      icon: '/logo.png'
                    });
                  }
                  
                  // Mostrar mensaje temporal en la UI
                  alert('Notificación enviada al tutor');
                } else {
                  alert('No se pudo obtener el ID del tutor');
                }
              }
            }}
            className="md:hidden px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors ml-2"
            title="Notificar al tutor"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          {/* Botón de receta - Desktop */}
          <button
            onClick={() => setShowPrescription(!showPrescription)}
            className="hidden md:flex px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors items-center gap-2 ml-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showPrescription ? 'Ocultar' : 'Mostrar'} Receta
          </button>
          
          {/* Botón de receta móvil - Siempre visible */}
          <button
            onClick={() => setShowPrescription(!showPrescription)}
            className="md:hidden px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors ml-2 relative"
            title="Receta"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showPrescription && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
            )}
          </button>
        </div>

        {/* Jitsi Video Container */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          {/* Banner de desconexión para reconexión */}
          {hasLeft && !appointmentCompleted && (
            <div className="absolute inset-x-0 top-0 bg-yellow-600 text-white px-4 py-3 z-50 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium">Te has desconectado de la videollamada. Puedes volver a unirte sin recargar la página.</span>
              </div>
              <button
                onClick={() => {
                  restartCall();
                }}
                className="px-4 py-2 bg-white text-yellow-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Reconectar
              </button>
            </div>
          )}
          
          {!hasLeft && (
          <JitsiMeeting
            key={jitsiKey}
            domain="meet.jit.si"
            roomName={roomName}
            lang="es"
            getIFrameRef={(iframeRef) => {
              if (iframeRef) {
                // Configurar el iframe para mejorar la conexión
                iframeRef.style.width = '100%';
                iframeRef.style.height = '100%';
                iframeRef.style.border = 'none';
              }
            }}
            configOverwrite={{
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              enableWelcomePage: false,
              enableClosePage: false,
              enableModeratorIndicator: true,
              enableEmailInStats: false,
              enableLayerSuspension: true,
              channelLastN: -1,
              startAudioOnly: false,
              defaultLanguage: 'es',
              disableRemoteMute: false,
              enableNoAudioDetection: true,
              enableNoisyMicDetection: true,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              enableDisplayNameInStats: true,
              enableDisplayNameInUI: true,
              requireDisplayName: false,
              disableLogin: true,
              enableUserRolesBasedOnToken: false,
              enableInsecureRoomNameWarning: false,
              enableWelcomePageStats: false,
              enableCalendarIntegration: false,
              enableKnockingLobby: false,
              enableLobbyChat: false,
              enableRembrandt: true,
              enableJitsiMobileSDK: false,
              enableNoDomainCalldata: true,
              requirePassword: false,
              hideDisplayName: false,
              disableInviteFunctions: true,
              enableModeratorTools: true,
              disableModeratorIndicator: false,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
              DISABLE_PRESENCE_STATUS: true,
              DISABLE_FOCUS_INDICATOR: true,
              DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
              DEFAULT_REMOTE_DISPLAY_NAME: appt.userId?.name || 'Usuario',
              DEFAULT_LOCAL_DISPLAY_NAME: userDisplayName,
              DISPLAY_WELCOME_PAGE_CONTENT: false,
              DISPLAY_WELCOME_FOOTER: false,
              HIDE_INVITE_MORE_HEADER: true,
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              BRAND_WATERMARK_LINK: '',
              SHOW_BRAND_WATERMARK: false,
              SHOW_POWERED_BY: false,
              SHOW_BROWSER_PICKER_BUTTON: true,
              NATIVE_APP_NAME: 'VetGo Now',
              PROVIDER_NAME: 'VetGo Now',
              // Desactivar opciones que puedan causar desconexión
              DISABLE_VIDEO_BACKGROUND: false,
              DISABLE_TRANSCRIPTION_SUBTITLES: false,
              // Desactivar la opción de "soy anfitrión" (raise hand)
              DISABLE_RAISE_HAND: true,
              // Ocultar opciones de configuración avanzada que puedan causar problemas
              TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'chat', 'settings', 'videoquality',
                'filmstrip', 'feedback', 'stats', 'shortcuts', 'tileview', 'videobackgroundblur',
                'download', 'help', 'mute-everyone', 'mute-video-everyone'
              ],
            }}
            userInfo={{
              displayName: userDisplayName || appt.vetId?.name || 'Veterinario',
              email: appt.vetId?.email || '',
            }}
            onReadyToClose={() => {
              console.log('Ready to close Jitsi');
            }}
            jwt={null}
            onApiReady={(externalApi) => {
              console.log('Jitsi API ready');
              setJitsiApi(externalApi);
              
              // Notificar al cliente que la videollamada ha iniciado
              if (appt && appointmentId && socketRef.current && roomName) {
                const vetId = appt.vetId?._id;
                if (vetId) {
                  socketRef.current.emit('jitsi-call-started', {
                    appointmentId,
                    vetId,
                    roomName: roomName
                  });
                  console.log('Notified client about Jitsi call start');
                }
              }
              
              // Configurar eventos
              externalApi.addEventListeners({
                conferenceError: (error) => {
                  // Manejar errores de conexión WebSocket silenciosamente
                  if (error && error.error && (
                    error.error.includes('websocket') || 
                    error.error.includes('keep alive') ||
                    error.error.includes('_unlock') ||
                    error.error.includes('membersOnly')
                  )) {
                    // Estos son errores no críticos de conexión - ignorarlos silenciosamente
                    console.log('Error de conexión WebSocket no crítico (ignorado):', error.error);
                    return;
                  }
                  // Para otros errores, loguear normalmente
                  console.error('Error en conferencia:', error);
                },
                videoConferenceJoined: (data) => {
                  console.log('Veterinario se unió a la conferencia:', data);
                  setIsInCall(true);
                  setHasLeft(false);
                  // Resetear bandera de cambio de rol al unirse
                  isRoleChangingRef.current = false;
                  // Marcar que ya se unió (después del login inicial)
                  isInitialJoinRef.current = false;
                },
                participantRoleChanged: (data) => {
                  // Manejar cambios de rol sin desconectar
                  console.log('Rol de participante cambiado:', data);
                  
                  // Marcar que estamos en medio de un cambio de rol (aumentar tiempo para cubrir todo el proceso)
                  isRoleChangingRef.current = true;
                  
                  // Verificar que el veterinario siga siendo moderador
                  try {
                    const participants = externalApi.getParticipantsInfo();
                    const localParticipant = participants.find(p => p.isLocal === true);
                    
                    if (localParticipant) {
                      // Si el veterinario perdió el rol de moderador, recuperarlo silenciosamente
                      if (localParticipant.role !== 'moderator') {
                        console.log('Veterinario perdió el rol de moderador, recuperándolo...');
                        // Usar un pequeño delay para evitar conflictos
                        setTimeout(() => {
                          try {
                            externalApi.executeCommand('grantModerator', {
                              id: localParticipant.id
                            });
                            // Resetear la bandera después de un tiempo más largo para cubrir todo el proceso
                            setTimeout(() => {
                              isRoleChangingRef.current = false;
                            }, 3000); // Aumentado a 3 segundos
                          } catch (error) {
                            console.error('Error al recuperar rol de moderador:', error);
                            setTimeout(() => {
                              isRoleChangingRef.current = false;
                            }, 2000);
                          }
                        }, 500);
                      } else {
                        // Si ya es moderador, resetear la bandera después de un delay para asegurar que el proceso termine
                        setTimeout(() => {
                          isRoleChangingRef.current = false;
                        }, 2000);
                      }
                    }
                  } catch (error) {
                    console.error('Error al verificar rol después de cambio:', error);
                    setTimeout(() => {
                      isRoleChangingRef.current = false;
                    }, 2000);
                  }
                },
                moderatorChanged: (data) => {
                  // Manejar cambios de moderador sin desconectar
                  console.log('Moderador cambiado:', data);
                  
                  // Marcar que estamos en medio de un cambio de rol (aumentar tiempo)
                  isRoleChangingRef.current = true;
                  
                  // Verificar si el veterinario sigue siendo moderador
                  try {
                    const participants = externalApi.getParticipantsInfo();
                    const localParticipant = participants.find(p => p.isLocal === true);
                    
                    if (localParticipant && localParticipant.role !== 'moderator') {
                      // Si el veterinario perdió el rol de moderador, intentar recuperarlo
                      console.log('Veterinario perdió el rol de moderador, intentando recuperarlo...');
                      setTimeout(() => {
                        try {
                          externalApi.executeCommand('grantModerator', {
                            id: localParticipant.id
                          });
                          // Resetear la bandera después de un tiempo más largo
                          setTimeout(() => {
                            isRoleChangingRef.current = false;
                          }, 3000); // Aumentado a 3 segundos
                        } catch (error) {
                          console.error('Error al recuperar rol de moderador:', error);
                          setTimeout(() => {
                            isRoleChangingRef.current = false;
                          }, 2000);
                        }
                      }, 500);
                    } else {
                      // Si ya es moderador, resetear la bandera después de un delay
                      setTimeout(() => {
                        isRoleChangingRef.current = false;
                      }, 2000);
                    }
                  } catch (error) {
                    console.error('Error al verificar rol de moderador:', error);
                    setTimeout(() => {
                      isRoleChangingRef.current = false;
                    }, 2000);
                  }
                },
                videoConferenceLeft: (data) => {
                  console.log('Veterinario salió de la conferencia:', data);
                  
                  // Si es el login inicial (antes de que videoConferenceJoined se dispare),
                  // ignorar completamente este evento para no interferir con el diálogo de login
                  if (isInitialJoinRef.current) {
                    console.log('Evento videoConferenceLeft durante login inicial, ignorando completamente...');
                    return;
                  }
                  
                  // Si estamos en medio de un cambio de rol, no marcar como desconectado
                  if (isRoleChangingRef.current) {
                    console.log('Cambio de rol detectado, ignorando desconexión temporal');
      return;
    }

                  // Si aún no se ha establecido isInCall, probablemente es durante el proceso de login inicial
                  // Ignorar este evento durante el login para evitar que se cierre el diálogo
                  if (!isInCall) {
                    console.log('Evento videoConferenceLeft durante login inicial, ignorando...');
                    return;
                  }
                  
                  // Agregar un delay más largo para verificar si fue un cambio de rol que aún no se detectó
                  // Esto es especialmente importante cuando el usuario hace clic en "soy anfitrión"
                  setTimeout(() => {
                    // Verificar nuevamente si estamos en medio de un cambio de rol
                    if (isRoleChangingRef.current) {
                      console.log('Cambio de rol detectado después del delay, ignorando desconexión');
      return;
    }

                    // Verificar si realmente se desconectó o si fue solo un cambio de rol temporal
                    // Intentar verificar el estado de la conexión
                    try {
                      const participants = externalApi.getParticipantsInfo();
                      const localParticipant = participants.find(p => p.isLocal === true);
                      
                      // Si todavía hay un participante local, probablemente no se desconectó realmente
                      if (localParticipant) {
                        console.log('Participante local aún existe, fue un cambio de rol temporal - no mostrar mensaje de reconexión');
                        // No mostrar el mensaje de reconexión, solo reiniciar la bandera de estado
                        setIsInCall(true);
                        setHasLeft(false);
                        return;
                      }
                    } catch (error) {
                      // Si no podemos verificar y la bandera no está activa, puede ser una desconexión real
                      console.log('No se pudo verificar el estado');
                    }
                    
                    // Solo marcar como desconectado si no fue intencional Y no es un cambio de rol
                    if (!appointmentCompleted && !isRoleChangingRef.current && isInCall) {
                      setIsInCall(false);
                      setHasLeft(true);
                    }
                  }, 2500); // Delay aumentado a 2.5 segundos para dar más tiempo al cambio de rol
                  
                  // NO redirigir automáticamente - permitir reconexión
                  // Solo el botón "Finalizar Consulta" debe terminar la videollamada
                },
                participantJoined: (data) => {
                  console.log('Participant joined:', data);
                  // Verificar si es el cliente (RECOMENDACIÓN 2)
                  const participants = externalApi.getParticipantsInfo();
                  const remoteParticipants = participants.filter(p => !p.isLocal);
                  if (remoteParticipants.length > 0) {
                    setHasClient(true);
                    setWaitingTime(0);
                  }
                  
                  // Intentar otorgar rol de moderador solo si el usuario ya se autenticó
                  // Esperar un poco para asegurar que el usuario completó la autenticación
                  setTimeout(() => {
                    try {
                      const participants = externalApi.getParticipantsInfo();
                      const localParticipant = participants.find(p => p.isLocal === true);
                      
                      if (localParticipant && localParticipant.role !== 'moderator') {
                        console.log('Usuario autenticado detectado, verificando rol de moderador...');
                        // Intentar otorgar rol de moderador solo después de que el usuario se haya autenticado
                        externalApi.executeCommand('grantModerator', {
                          id: localParticipant.id
                        });
                        console.log('Rol de moderador otorgado después de autenticación');
                      }
                    } catch (error) {
                      console.error('Error al otorgar rol de moderador después de autenticación:', error);
                    }
                  }, 2000);
                },
                participantLeft: (data) => {
                  console.log('Participant left:', data);
                  // RECOMENDACIÓN 2: Notificar cuando alguien se desconecta
                  const participants = externalApi.getParticipantsInfo();
                  const remoteParticipants = participants.filter(p => !p.isLocal);
                  
                  if (remoteParticipants.length === 0) {
                    setHasClient(false);
                    // Mostrar notificación al veterinario
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('Cliente desconectado', {
                        body: 'El cliente se ha desconectado de la videollamada. Puede reconectarse.',
                        icon: '/logo.png'
                      });
                    }
                    // También mostrar en la UI
                    alert('El cliente se ha desconectado. Puede reconectarse.');
                  }
                },
                connectionQualityChanged: (data) => {
                  // RECOMENDACIÓN 3: Indicadores de calidad de conexión
                  if (data && data.quality !== undefined) {
                    setConnectionQuality(data.quality);
                    if (data.quality < 2) {
                      console.warn('Conexión muy débil. La videollamada puede verse afectada.');
                    }
                  }
                },
                readyToClose: () => {
                  console.log('Ready to close');
                  // Cerrar cuando Jitsi esté listo
                }
              });
            }}
            spinner={null}
            loadingComponent={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white">Conectando a la videollamada...</p>
                </div>
              </div>
            }
          />
          )}
          </div>

        {/* Controls Bar - Responsive */}
        {!showPrescription && (
        <div className="bg-gray-800 px-4 md:px-6 py-3 md:py-4 border-t border-gray-700 flex items-center justify-center gap-4 z-10 flex-wrap">
          {/* Botón de reinicio de llamada desactivado temporalmente para permitir login de Google/GitHub */}
          {false && (
          <button
            onClick={restartCall}
            className="w-full md:w-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            title="Reiniciar videollamada"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reiniciar Llamada
          </button>
        )}
          <button
            onClick={finish}
            className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Finalizar Consulta
          </button>
          </div>
        )}
        </div>

      {/* Prescription Panel - Mejorado y Responsive */}
      {showPrescription && (
        <>
          {/* Overlay para móvil */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity"
            onClick={() => setShowPrescription(false)}
          />
          
          {/* Panel de Receta */}
          <div className="fixed md:static inset-y-0 right-0 w-full md:w-96 md:flex-shrink-0 h-full bg-gray-800 border-l border-gray-700 flex flex-col z-50 md:z-auto shadow-2xl md:shadow-none animate-slide-in-right md:animate-none">
            {/* Header con botón cerrar para móvil */}
            <div className="p-4 md:p-6 border-b border-gray-700 flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-semibold mb-1">Receta Médica</h2>
                <p className="text-sm text-gray-400">Mascota: {appt.petId?.name}</p>
          </div>
              {/* Botón cerrar solo en móvil */}
              <button
                onClick={() => setShowPrescription(false)}
                className="md:hidden ml-4 p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Cerrar receta"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
          </div>
            
            {/* Contenido de la receta - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5">
              {/* Síntomas Observados */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Síntomas Observados
                </label>
                <textarea
                  rows="4"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm transition-all"
                  value={pres.symptoms}
                  onChange={(e) => setPres({ ...pres, symptoms: e.target.value })}
                  placeholder="Describe los síntomas observados durante la consulta..."
                />
        </div>

              {/* Medicamento */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Medicamento
                </label>
                <textarea
                  rows="3"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm transition-all"
                  value={pres.medication}
                  onChange={(e) => setPres({ ...pres, medication: e.target.value })}
                  placeholder="Nombre del medicamento prescrito..."
                />
      </div>

              {/* Dosificación */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Dosificación
                </label>
              <textarea
                rows="3"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm transition-all"
                  value={pres.dosage}
                  onChange={(e) => setPres({ ...pres, dosage: e.target.value })}
                  placeholder="Cantidad y frecuencia del medicamento..."
                />
              </div>

              {/* Instrucciones Adicionales */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Instrucciones Adicionales
                </label>
                <textarea
                  rows="4"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm transition-all"
                  value={pres.instructions}
                  onChange={(e) => setPres({ ...pres, instructions: e.target.value })}
                  placeholder="Instrucciones especiales, cuidados, seguimiento..."
              />
            </div>

            {/* Peso del animal - Solo para presenciales */}
            {appt?.appointmentType !== 'online consultation' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  Peso (kg) - Opcional
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={pres.weightAtConsultation || ''}
                  onChange={(e) => setPres({ ...pres, weightAtConsultation: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Ej: 5.5"
                />
              </div>
            )}

            {/* Sección de Vacunas Aplicadas - Solo para presenciales */}
            {appt?.appointmentType !== 'online consultation' && (
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Vacunas Aplicadas
                </label>
                <button
                  type="button"
                  onClick={() => setShowVaccineForm(!showVaccineForm)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {showVaccineForm ? 'Cancelar' : '+ Agregar Vacuna'}
                </button>
              </div>

              {/* Lista de vacunas agregadas */}
              {pres.vaccinesApplied && pres.vaccinesApplied.length > 0 && (
                <div className="space-y-2">
                  {pres.vaccinesApplied.map((vaccine, idx) => (
                    <div key={idx} className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{vaccine.name}</p>
                        <p className="text-xs text-gray-400">{vaccine.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = pres.vaccinesApplied.filter((_, i) => i !== idx);
                          setPres({ ...pres, vaccinesApplied: updated });
                        }}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para agregar vacuna */}
              {showVaccineForm && (
                <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Nombre de la vacuna *</label>
                    <input
                      type="text"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                      value={newVaccine.name}
                      onChange={(e) => setNewVaccine({ ...newVaccine, name: e.target.value })}
                      placeholder="Ej: Antirrábica, Polivalente"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Tipo *</label>
                    <select
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                      value={newVaccine.type}
                      onChange={(e) => setNewVaccine({ ...newVaccine, type: e.target.value })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="Rabia">Rabia</option>
                      <option value="Polivalente">Polivalente</option>
                      <option value="Tos de las perreras">Tos de las perreras</option>
                      <option value="Leucemia felina">Leucemia felina</option>
                      <option value="Triple felina">Triple felina</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Lote</label>
                      <input
                        type="text"
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                        value={newVaccine.batchNumber}
                        onChange={(e) => setNewVaccine({ ...newVaccine, batchNumber: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Laboratorio</label>
                      <input
                        type="text"
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                        value={newVaccine.manufacturer}
                        onChange={(e) => setNewVaccine({ ...newVaccine, manufacturer: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Próxima dosis (opcional)</label>
                    <input
                      type="date"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                      value={newVaccine.nextDoseDate}
                      onChange={(e) => setNewVaccine({ ...newVaccine, nextDoseDate: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newVaccine.name && newVaccine.type) {
                        setPres({
                          ...pres,
                          vaccinesApplied: [...(pres.vaccinesApplied || []), { ...newVaccine }]
                        });
                        setNewVaccine({ name: '', type: '', batchNumber: '', manufacturer: '', nextDoseDate: '' });
                        setShowVaccineForm(false);
                      }
                    }}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                  >
                    Agregar Vacuna
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Sección de Desparasitaciones Aplicadas - Solo para presenciales */}
            {appt?.appointmentType !== 'online consultation' && (
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Desparasitaciones Aplicadas
                </label>
                <button
                  type="button"
                  onClick={() => setShowDewormingForm(!showDewormingForm)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {showDewormingForm ? 'Cancelar' : '+ Agregar Desparasitación'}
                </button>
              </div>

              {/* Lista de desparasitaciones agregadas */}
              {pres.dewormingsApplied && pres.dewormingsApplied.length > 0 && (
                <div className="space-y-2">
                  {pres.dewormingsApplied.map((deworming, idx) => (
                    <div key={idx} className="bg-green-900/30 border border-green-700 rounded-lg p-3 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{deworming.name}</p>
                        <p className="text-xs text-gray-400">{deworming.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = pres.dewormingsApplied.filter((_, i) => i !== idx);
                          setPres({ ...pres, dewormingsApplied: updated });
                        }}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
            </div>
          ))}
                </div>
              )}

              {/* Formulario para agregar desparasitación */}
              {showDewormingForm && (
                <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Nombre *</label>
                    <input
                      type="text"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                      value={newDeworming.name}
                      onChange={(e) => setNewDeworming({ ...newDeworming, name: e.target.value })}
                      placeholder="Ej: Desparasitante interno"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Tipo *</label>
                    <select
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                      value={newDeworming.type}
                      onChange={(e) => setNewDeworming({ ...newDeworming, type: e.target.value })}
                    >
                      <option value="">Seleccione...</option>
                      <option value="Interna">Interna</option>
                      <option value="Externa">Externa</option>
                      <option value="Combinada">Combinada</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Producto</label>
                      <input
                        type="text"
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                        value={newDeworming.productName}
                        onChange={(e) => setNewDeworming({ ...newDeworming, productName: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Dosificación</label>
                      <input
                        type="text"
                        className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                        value={newDeworming.dosage}
                        onChange={(e) => setNewDeworming({ ...newDeworming, dosage: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Principio Activo</label>
                    <input
                      type="text"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white text-sm"
                      value={newDeworming.activeIngredient}
                      onChange={(e) => setNewDeworming({ ...newDeworming, activeIngredient: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newDeworming.name && newDeworming.type) {
                        setPres({
                          ...pres,
                          dewormingsApplied: [...(pres.dewormingsApplied || []), { ...newDeworming }]
                        });
                        setNewDeworming({ name: '', type: '', productName: '', activeIngredient: '', dosage: '' });
                        setShowDewormingForm(false);
                      }
                    }}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                  >
                    Agregar Desparasitación
                  </button>
                </div>
              )}
            </div>
            )}
            </div>

            {/* Footer con botón de guardar */}
            <div className="p-4 md:p-6 border-t border-gray-700 bg-gray-800">
        <button
          onClick={finish}
                className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Guardar y Finalizar Consulta
        </button>
      </div>
    </div>
        </>
      )}
    </div>
    </>
  );
}
