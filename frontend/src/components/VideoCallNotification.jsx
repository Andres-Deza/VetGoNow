import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { requestNotificationPermission } from '../utils/permissions';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const VideoCallNotification = ({ userId }) => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) return;

    // Solicitar permisos de notificación al montar
    requestNotificationPermission();

    // Conectar socket
    const newSocket = io(API_BASE, { autoConnect: true });
    setSocket(newSocket);

    // Registrar usuario en el socket
    newSocket.emit('register-user', { userId });

    // Escuchar cuando se inicia una videollamada
    newSocket.on('jitsi-video-call-started', async (data) => {
      console.log('Received video call notification:', data);
      setNotification(data);

      // Mostrar notificación del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        const vetName = data.vetName || 'Veterinario';
        const petName = data.petName || 'tu mascota';
        
        const browserNotification = new Notification('Videollamada iniciada', {
          body: `${vetName} ha iniciado la videollamada para ${petName}. Haz clic para unirte.`,
          icon: '/Logo.png',
          badge: '/Logo.png',
          tag: `video-call-${data.appointmentId}`,
          requireInteraction: true,
          data: {
            appointmentId: data.appointmentId,
            url: `/client/video-call/${data.appointmentId}`
          }
        });

        browserNotification.onclick = () => {
          window.focus();
          navigate(`/client/video-call/${data.appointmentId}`);
          browserNotification.close();
          setNotification(null);
        };

        // Cerrar la notificación después de 10 segundos
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      }
    });

    return () => {
      if (newSocket) {
        newSocket.off('jitsi-video-call-started');
        newSocket.disconnect();
      }
    };
  }, [userId, navigate]);

  const handleJoinCall = () => {
    if (notification?.appointmentId) {
      navigate(`/client/video-call/${notification.appointmentId}`);
      setNotification(null);
    }
  };

  const handleDismiss = () => {
    setNotification(null);
  };

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full md:w-96 animate-slide-in">
      <div className="bg-white rounded-lg shadow-2xl border-l-4 border-blue-600 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Videollamada iniciada
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-semibold text-blue-600">{notification.vetName || 'Veterinario'}</span> te ha invitado a unirte a la videollamada de <span className="font-medium">{notification.petName || 'tu mascota'}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleJoinCall}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Unirse ahora
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VideoCallNotification;

