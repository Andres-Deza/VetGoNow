import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { JitsiMeeting } from '@jitsi/react-sdk';
import io from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const ClientVideoCall = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [jitsiApi, setJitsiApi] = useState(null);
  const [isInCall, setIsInCall] = useState(true);
  const [hasLeft, setHasLeft] = useState(false);
  const [appointmentCompleted, setAppointmentCompleted] = useState(false);
  const [jitsiKey, setJitsiKey] = useState(0); // Key para reiniciar Jitsi
  const socketRef = useRef(null);

  // Inicializar socket para recibir notificaciones
  useEffect(() => {
    socketRef.current = io(API_BASE, { autoConnect: true });
    
    // Registrar usuario en el socket
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const currentUserId = currentUser ? currentUser.id : null;

    if (currentUserId && socketRef.current) {
      socketRef.current.emit('register-user', { userId: currentUserId });
    }
    
    // Escuchar notificaciones del veterinario
    socketRef.current.on('tutor-notification', (data) => {
      console.log('Notificación recibida del veterinario:', data);
      
      // Mostrar notificación del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Notificación del Veterinario', {
          body: data.message || 'El veterinario te está notificando',
          icon: '/logo.png',
          tag: `vet-notification-${data.appointmentId}`
        });
      } else if (Notification.permission === 'default') {
        // Solicitar permiso si aún no se ha otorgado
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Notificación del Veterinario', {
              body: data.message || 'El veterinario te está notificando',
              icon: '/logo.png'
            });
          }
        });
      }
      
      // Mostrar alerta en la UI
      alert(`Notificación del veterinario: ${data.message || 'El veterinario te está notificando'}`);
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('tutor-notification');
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const currentUserId = currentUser ? currentUser.id : null;

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Token no encontrado, el usuario no está autenticado!");
      alert("El usuario no está autenticado. Por favor inicia sesión.");
      navigate("/login");
      return;
    }

    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`/api/appointments/users/${currentUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchedAppointments = res.data.appointments || res.data;
        const onlineAppointments = fetchedAppointments
          .filter((appt) => appt.appointmentType === 'online consultation' && appt.status === 'scheduled')
          .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
        
        // Buscar la cita específica por appointmentId o la próxima
        let selectedAppointment = onlineAppointments.find(
          (appt) => appt._id === appointmentId
        );

        // Si no se encuentra por ID, buscar la próxima cita
        if (!selectedAppointment) {
          selectedAppointment = onlineAppointments.find(
          (appt) => new Date(appt.appointmentDate) > new Date()
        );
        }

        if (selectedAppointment) {
          console.log("Cita encontrada:", selectedAppointment);
          setAppointment(selectedAppointment);
          
          // Generar nombre de sala único usando el appointmentId
          const roomId = `vetgo-${selectedAppointment._id}`;
          setRoomName(roomId);
          
          // Obtener nombre del usuario - usar el nombre completo del perfil
          const userName = currentUser?.name || appointment?.userId?.name || 'Usuario';
          setUserDisplayName(userName);
          console.log("Usuario display name set to:", userName);
        } else {
          setAppointment(null);
        }
      } catch (err) {
        console.error("Error al obtener las citas:", err);
        alert("No se pudieron cargar las citas.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId, navigate]);

  const leaveCall = () => {
    // Solo cerrar la llamada, NO redirigir automáticamente
    if (jitsiApi) {
      jitsiApi.executeCommand('hangup');
    }
    setHasLeft(true);
    setIsInCall(false);
    // NO navegar - permitir reconexión
  };

  // Reiniciar videollamada sin recargar la página
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

  // Verificar estado de la cita periódicamente
  useEffect(() => {
    if (!appointmentId || appointmentCompleted || !appointment) return;

    const checkAppointmentStatus = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("user"));
        const currentUserId = currentUser ? currentUser.id : null;
        const token = localStorage.getItem("token");
        
        const res = await axios.get(`/api/appointments/users/${currentUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const fetchedAppointments = res.data.appointments || res.data;
        const currentAppointment = fetchedAppointments.find(
          (appt) => appt._id === appointmentId
        );
        
        if (currentAppointment?.status === 'completed') {
          setAppointmentCompleted(true);
          if (jitsiApi) {
            jitsiApi.executeCommand('hangup');
      }
          alert('La consulta ha sido finalizada por el veterinario.');
          navigate('/my-appointments');
        }
      } catch (err) {
        console.error('Error checking appointment status:', err);
      }
    };

    const interval = setInterval(checkAppointmentStatus, 5000); // Verificar cada 5 segundos
    return () => clearInterval(interval);
  }, [appointmentId, appointmentCompleted, appointment, jitsiApi, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando...</p>
        </div>
      </div>
    );
      }

  if (!appointment || !roomName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg mb-2">No se encontró la cita</p>
          <button
            onClick={() => navigate('/my-appointments')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            Volver a Mis Citas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 z-10">
          <h1 className="text-xl font-semibold">Consulta por Video</h1>
          <p className="text-sm text-gray-400">
            {appointment?.petId?.name && `Mascota: ${appointment.petId.name}`}
            {appointment?.vetId?.name && ` - Veterinario: ${appointment.vetId.name}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Sala: {roomName}</p>
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
                onClick={restartCall}
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
            configOverwrite={{
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              enableWelcomePage: false,
              enableClosePage: false,
              disableModeratorIndicator: true,
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
              enableLobbyChat: false,
              enableKnockingLobby: false,
              enableRembrandt: true,
              enableJitsiMobileSDK: false,
              enableNoDomainCalldata: true,
              requirePassword: false,
              deploymentInfo: {},
              // Desactivar opción de ser anfitrión para el tutor
              enableRaiseHand: false,
              hideRaiseHandButton: true,
              disableModeratorTools: true,
              enableModeratorTools: false,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
              DISABLE_PRESENCE_STATUS: true,
              DISABLE_FOCUS_INDICATOR: true,
              DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
              DEFAULT_REMOTE_DISPLAY_NAME: appointment?.vetId?.name || 'Veterinario',
              DEFAULT_LOCAL_DISPLAY_NAME: userDisplayName || 'Usuario',
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
              // Ocultar botones y opciones de moderador/anfitrión
              HIDE_RAISE_HAND_BUTTON: true,
              TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'chat', 'settings', 'videoquality', 'filmstrip',
                'feedback', 'stats', 'shortcuts'
              ],
            }}
            userInfo={{
              displayName: userDisplayName || appointment?.userId?.name || 'Usuario',
              email: appointment?.userId?.email || '',
            }}
            onApiReady={(externalApi) => {
              console.log('Jitsi API ready (client)');
              setJitsiApi(externalApi);
              
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
                  console.log('Cliente se unió a la conferencia:', data);
                  setIsInCall(true);
                  setHasLeft(false);
                  
                  // Asegurar que el cliente NO sea moderador
                  try {
                    const localParticipant = externalApi.getParticipantsInfo().find(
                      p => p.isLocal === true
                    );
                    
                    if (localParticipant && localParticipant.role === 'moderator') {
                      // Si por alguna razón el cliente es moderador, revocar el rol
                      console.log('Cliente no debería ser moderador, revocando rol...');
                      try {
                        externalApi.executeCommand('toggleModerator');
                      } catch (error) {
                        console.error('Error al revocar rol de moderador:', error);
                      }
                    }
                    
                    // Ocultar botones de moderador si existen
                    try {
                      const toolbarButtons = externalApi.getAvailableDevices();
                      // Desactivar herramientas de moderador
                      externalApi.executeCommand('toggleModeratorTools', false);
                    } catch (error) {
                      // Ignorar errores si no existen estos métodos
                      console.log('No se pudieron ocultar herramientas de moderador (normal para cliente)');
                    }
                  } catch (error) {
                    console.error('Error al verificar rol:', error);
      }
                },
                videoConferenceLeft: (data) => {
                  console.log('Cliente salió de la conferencia:', data);
                  setIsInCall(false);
                  setHasLeft(true);
                  // NO redirigir automáticamente - permitir reconexión
                  // Solo cuando el veterinario finalice la consulta se redirigirá
                },
                participantJoined: (data) => {
                  console.log('Participant joined:', data);
                },
                participantLeft: (data) => {
                  console.log('Participant left:', data);
                  // RECOMENDACIÓN 2: Notificar cuando el veterinario se desconecta
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Veterinario desconectado', {
                      body: 'El veterinario se ha desconectado de la videollamada. Esperando reconexión...',
                      icon: '/logo.png'
                    });
                  }
                },
                connectionQualityChanged: (data) => {
                  // RECOMENDACIÓN 3: Indicadores de calidad de conexión (solo log para cliente)
                  if (data && data.quality !== undefined) {
                    console.log('Calidad de conexión:', data.quality);
                    if (data.quality < 2) {
                      console.warn('Conexión muy débil. La videollamada puede verse afectada.');
    }
                  }
                },
                readyToClose: () => {
                  console.log('Ready to close');
                  // NO redirigir automáticamente - permitir reconexión
                  // Solo redirigir cuando el veterinario finalice la consulta
                },
                participantRoleChanged: (data) => {
                  // Prevenir que el cliente se convierta en moderador
                  console.log('Cambio de rol detectado:', data);
                  if (data && data.id) {
                    try {
                      const localParticipant = externalApi.getParticipantsInfo().find(
                        p => p.isLocal === true
                      );
                      // Si el cliente se convirtió en moderador, revocar el rol inmediatamente
                      if (localParticipant && localParticipant.role === 'moderator') {
                        console.log('Cliente intentó ser moderador, revocando rol...');
                        setTimeout(() => {
                          try {
                            externalApi.executeCommand('toggleModerator');
                          } catch (error) {
                            console.error('Error al revocar rol de moderador:', error);
                          }
                        }, 100);
                      }
                    } catch (error) {
                      console.error('Error al verificar cambio de rol:', error);
                    }
                  }
                }
              });
            }}
            getIFrameRef={(iframeRef) => {
              if (iframeRef) {
                iframeRef.style.width = '100%';
                iframeRef.style.height = '100%';
                iframeRef.style.border = 'none';
              }
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

        {/* Controls Bar - Responsive con reconexión */}
        <div className="bg-gray-800 px-4 md:px-6 py-3 md:py-4 border-t border-gray-700 flex items-center justify-center gap-4 z-10">
          {hasLeft ? (
            <button
              onClick={restartCall}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Volver a Unirse
            </button>
          ) : (
            <button
              onClick={leaveCall}
              className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Salir de la Llamada
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientVideoCall;
