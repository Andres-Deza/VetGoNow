import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { requestNotificationPermission } from '../utils/permissions';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Obtener URL de Socket.io de forma segura (solo usa variables de entorno)
const getSocketURL = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  console.warn('Socket.io: No se configuró VITE_SOCKET_URL o VITE_API_BASE. Socket deshabilitado.');
  return null;
};

const SOCKET_URL = getSocketURL();

const EmergencyChatNotification = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState(null);
  const [socket, setSocket] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Obtener el ID del usuario
    const userId = user.id || user._id;
    if (!userId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Solicitar permisos de notificación al montar
    requestNotificationPermission();

    // Conectar al namespace de chat solo si hay URL configurada
    if (!SOCKET_URL) {
      console.warn('Socket.io deshabilitado: No se configuró VITE_SOCKET_URL o VITE_API_BASE');
      return;
    }

    // Conectar al namespace de chat
    const chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(chatSocket);

    // Función auxiliar para manejar nuevas notificaciones (debe estar definida antes de usarse)
    const handleNewNotification = (data) => {
      // Limpiar timeout anterior si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Establecer la notificación
      setNotification(data);
      
      // Configurar timeout para que expire después de 20 segundos
      timeoutRef.current = setTimeout(() => {
        console.log('Notificación de urgencia expirada (20 segundos)');
        setNotification(null);
        timeoutRef.current = null;
      }, 20000); // 20 segundos = 20000 ms

      // Mostrar notificación del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        const senderName = data.senderName || (data.isFromVet ? 'Veterinario' : 'Cliente');
        const messageContent = data.messageContent || 'Nuevo mensaje de urgencia';
        
        const browserNotification = new Notification(`Urgencia: ${senderName}`, {
          body: messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent,
          icon: data.senderAvatar || '/Logo.png',
          badge: '/Logo.png',
          tag: `emergency-chat-${data.conversationId}`,
          requireInteraction: false,
          data: {
            conversationId: data.conversationId,
            appointmentId: data.appointmentId,
            url: user.role === 'Vet' 
              ? `/vet/conversations/${data.conversationId}`
              : `/conversations/${data.conversationId}`
          }
        });

        browserNotification.onclick = () => {
          window.focus();
          const url = user.role === 'Vet' 
            ? `/vet/conversations/${data.conversationId}`
            : `/conversations/${data.conversationId}`;
          navigate(url);
          browserNotification.close();
          setNotification(null);
        };

        // Cerrar la notificación después de 10 segundos
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      }
    };

    // Unirse a la sala correspondiente según el rol
    chatSocket.on('connect', () => {
      console.log('Conectado al namespace de chat para notificaciones de urgencia');
      
      if (user.role === 'Vet') {
        chatSocket.emit('join:vet', userId);
      } else {
        chatSocket.emit('join:user', userId);
      }
    });

    // Escuchar eventos de mensajes de urgencia (evento específico)
    chatSocket.on('emergency:new-message', async (data) => {
      console.log('Received emergency chat notification:', data);
      handleNewNotification(data);
    });

    // También escuchar conversation:new-message para detectar urgencias
    chatSocket.on('conversation:new-message', async (payload) => {
      if (payload && payload.isEmergency && payload.message) {
        // Verificar que el mensaje no sea del usuario actual
        const currentUserIsVet = user.role === 'Vet';
        const currentUserId = user.id || user._id;
        const isFromVet = payload.message?.senderType === 'Vet';
        
        // Si el mensaje es del usuario actual, no mostrar notificación
        if (isFromVet === currentUserIsVet) {
          return;
        }
        
        // Verificar también por ID del remitente
        if (payload.message?.senderId) {
          const senderId = payload.message.senderId.toString();
          const currentUserIdStr = currentUserId?.toString();
          if (senderId === currentUserIdStr) {
            return;
          }
        }

        // Convertir el payload a formato de emergency:new-message
        const emergencyData = {
          conversationId: payload.conversationId,
          message: payload.message,
          senderName: payload.summary?.senderName,
          senderAvatar: payload.summary?.senderAvatar,
          messageContent: payload.message?.content || (payload.message?.image ? 'Imagen' : 'Nuevo mensaje'),
          isFromVet: payload.message?.senderType === 'Vet',
          appointmentId: payload.appointmentId || null
        };
        
        console.log('Received emergency chat notification via conversation:new-message:', emergencyData);
        handleNewNotification(emergencyData);

        // Mostrar notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          const senderName = emergencyData.senderName || (emergencyData.isFromVet ? 'Veterinario' : 'Cliente');
          const messageContent = emergencyData.messageContent || 'Nuevo mensaje de urgencia';
          
          const browserNotification = new Notification(`Urgencia: ${senderName}`, {
            body: messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent,
            icon: emergencyData.senderAvatar || '/Logo.png',
            badge: '/Logo.png',
            tag: `emergency-chat-${emergencyData.conversationId}`,
            requireInteraction: false,
            data: {
              conversationId: emergencyData.conversationId,
              appointmentId: emergencyData.appointmentId,
              url: user.role === 'Vet' 
                ? `/vet/conversations/${emergencyData.conversationId}`
                : `/conversations/${emergencyData.conversationId}`
            }
          });

          browserNotification.onclick = () => {
            window.focus();
            const url = user.role === 'Vet' 
              ? `/vet/conversations/${emergencyData.conversationId}`
              : `/conversations/${emergencyData.conversationId}`;
            navigate(url);
            browserNotification.close();
            setNotification(null);
          };

          // Cerrar la notificación después de 10 segundos
          setTimeout(() => {
            browserNotification.close();
          }, 10000);
        }
      }
    });

    return () => {
      // Limpiar timeout si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (chatSocket) {
        chatSocket.off('emergency:new-message');
        chatSocket.off('conversation:new-message');
        chatSocket.off('connect');
        chatSocket.disconnect();
      }
    };
  }, [user, navigate]);
  
  // Ocultar el banner si estamos en la página del chat de la conversación
  useEffect(() => {
    if (!notification) return;
    
    const currentPath = location.pathname;
    const conversationId = notification.conversationId;
    
    // Verificar si estamos en la página del chat de esta conversación
    const isInChatPage = user?.role === 'Vet'
      ? currentPath === `/vet/conversations/${conversationId}` || currentPath.startsWith(`/vet/conversations/${conversationId}`)
      : currentPath === `/conversations/${conversationId}` || currentPath.startsWith(`/conversations/${conversationId}`);
    
    if (isInChatPage) {
      console.log('Estamos en la página del chat, ocultando banner');
      setNotification(null);
      // Limpiar timeout si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [location.pathname, notification, user]);

  const handleOpenChat = () => {
    if (notification?.conversationId) {
      // Limpiar timeout al abrir el chat
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const url = user.role === 'Vet' 
        ? `/vet/conversations/${notification.conversationId}`
        : `/conversations/${notification.conversationId}`;
      navigate(url);
      setNotification(null);
    }
  };

  const handleDismiss = () => {
    // Limpiar timeout al cerrar manualmente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setNotification(null);
  };

  // Ocultar el banner si estamos en la página del chat
  const currentPath = location.pathname;
  const isInChatPage = notification && (user?.role === 'Vet'
    ? currentPath === `/vet/conversations/${notification.conversationId}` || currentPath.startsWith(`/vet/conversations/${notification.conversationId}/`)
    : currentPath === `/conversations/${notification.conversationId}` || currentPath.startsWith(`/conversations/${notification.conversationId}/`));
  
  if (!notification || isInChatPage) return null;

  const senderName = notification.senderName || (notification.isFromVet ? 'Veterinario' : 'Cliente');
  const messageContent = notification.messageContent || 'Nuevo mensaje de urgencia';
  const truncatedContent = messageContent.length > 100 
    ? messageContent.substring(0, 100) + '...' 
    : messageContent;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] md:w-96 animate-slide-in">
      <div 
        className="relative rounded-3xl p-6 overflow-hidden" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.75) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.3) inset, 0 1px 0 rgba(255, 255, 255, 0.5) inset',
          border: '1px solid rgba(255, 255, 255, 0.4)'
        }}
      >
        {/* Indicador de urgencia en la izquierda */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 via-red-600 to-red-500"></div>
        
        <div className="flex items-start gap-4 ml-2">
          {/* Icono moderno */}
          <div className="flex-shrink-0 relative">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
              <svg className="w-6 h-6 text-red-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600/80">Urgencia</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 truncate">
                  {senderName}
                </h3>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1.5 -mt-1 -mr-1 hover:bg-white/60 rounded-xl transition-all duration-200 active:scale-95"
                title="Cerrar"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">
              {truncatedContent}
            </p>
            
            <button
              onClick={handleOpenChat}
              className="w-full group relative px-5 py-3.5 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-700 hover:via-red-700 hover:to-red-800 text-white rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.97] overflow-hidden"
              style={{
                boxShadow: '0 8px 20px -6px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="relative z-10">Abrir Chat</span>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(calc(100% + 1rem));
            opacity: 0;
            scale: 0.95;
          }
          to {
            transform: translateX(0);
            opacity: 1;
            scale: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default EmergencyChatNotification;

