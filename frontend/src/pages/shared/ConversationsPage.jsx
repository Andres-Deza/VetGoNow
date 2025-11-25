import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MessageList, Input } from 'react-chat-elements';
import 'react-chat-elements/dist/main.css';
import { 
  showNewMessageNotification, 
  initializeNotifications,
  requestNotificationPermissionIfNeeded, 
  isNotificationAvailable,
  playNotificationSound 
} from '../../utils/notifications';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Inyectar estilos personalizados para el chat minimalista tipo Uber
if (typeof document !== 'undefined') {
  const styleId = 'chat-custom-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .message-list {
        background: transparent !important;
      }
      .rce-mbox {
        border-radius: 18px !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        margin-bottom: 8px !important;
        padding: 10px 14px !important;
        max-width: 85% !important;
      }
      @media (max-width: 640px) {
        .rce-mbox {
          padding: 6px 10px !important;
          margin-bottom: 4px !important;
          max-width: 80% !important;
          border-radius: 16px !important;
        }
      }
      .rce-mbox-right {
        background: #6366F1 !important;
        color: white !important;
      }
      .rce-mbox-left {
        background: white !important;
        color: #1F2937 !important;
      }
      .rce-mbox-text {
        font-size: 14px !important;
        line-height: 1.4 !important;
        margin: 0 !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      @media (max-width: 640px) {
        .rce-mbox-text {
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
      }
      .rce-mbox-time {
        font-size: 11px !important;
        opacity: 0.7 !important;
        margin-top: 4px !important;
      }
      @media (max-width: 640px) {
        .rce-mbox-time {
          font-size: 10px !important;
          margin-top: 3px !important;
        }
      }
      .rce-mbox-photo {
        border-radius: 12px !important;
        max-width: 250px !important;
        margin-top: 4px !important;
        cursor: pointer !important;
        transition: transform 0.2s !important;
      }
      @media (max-width: 640px) {
        .rce-mbox-photo {
          max-width: 200px !important;
          border-radius: 10px !important;
        }
      }
      .rce-mbox-photo:hover {
        transform: scale(1.02) !important;
      }
      .rce-container-mbox {
        margin-bottom: 4px !important;
      }
      @media (max-width: 640px) {
        .rce-container-mbox {
          margin-bottom: 3px !important;
        }
      }
      .rce-container-mbox-list {
        padding-bottom: 20px !important;
        padding-left: 8px !important;
        padding-right: 8px !important;
      }
      @media (max-width: 640px) {
        .rce-container-mbox-list {
          padding-bottom: 12px !important;
          padding-left: 2px !important;
          padding-right: 2px !important;
        }
      }
      /* Mejorar scrollbar */
      .rce-container-mbox-list::-webkit-scrollbar {
        width: 6px;
      }
      @media (max-width: 640px) {
        .rce-container-mbox-list::-webkit-scrollbar {
          width: 4px;
        }
      }
      .rce-container-mbox-list::-webkit-scrollbar-track {
        background: transparent;
      }
      .rce-container-mbox-list::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.2);
        border-radius: 3px;
      }
      .rce-container-mbox-list::-webkit-scrollbar-thumb:hover {
        background: rgba(0,0,0,0.3);
      }
      /* Avatar en móvil */
      @media (max-width: 640px) {
        .rce-mbox-avatar {
          width: 28px !important;
          height: 28px !important;
        }
      }
      /* Título del mensaje en móvil */
      @media (max-width: 640px) {
        .rce-mbox-title {
          font-size: 12px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

const ConversationsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  
  // Detectar si viene de una página de emergencia
  const emergencyRequestId = location.state?.emergencyRequestId || location.state?.fromEmergency;
  const emergencyStatusFromState = location.state?.emergencyStatus;
  
  // Estado para el estado de la emergencia (puede venir del state o del appointment)
  const [emergencyStatus, setEmergencyStatus] = useState(emergencyStatusFromState);
  
  // Detectar si estamos en móvil
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  
  // Determinar si el chat está deshabilitado (solo lectura)
  // El chat está deshabilitado si la emergencia está completada o cancelada
  const isChatDisabled = emergencyStatus === 'completed' || 
                         emergencyStatus === 'cancelled' ||
                         (selectedConversation?.appointmentId?.isEmergency && 
                          (selectedConversation.appointmentId.status === 'completed' || 
                           selectedConversation.appointmentId.status === 'cancelled' ||
                           selectedConversation.appointmentId.tracking?.status === 'completed' ||
                           selectedConversation.appointmentId.tracking?.status === 'cancelled'));
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  const userData = useMemo(() => {
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error('Error parsing user from localStorage', error);
      return null;
    }
  }, [storedUser]);
  const role = userData?.role || 'User';
  const isVet = role === 'Vet';

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );
  const socketRef = useRef(null);
  const prevConversationIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);

  const normalizeId = useCallback((value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value.toString) return value.toString();
    return `${value}`;
  }, []);

  // Función para hacer scroll al final del chat
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    // También intentar con el contenedor de MessageList
    if (messageListRef.current) {
      const container = messageListRef.current.querySelector('.rce-container-mbox-list');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!token) {
      setLoadingList(false);
      return;
    }

    try {
      const endpoint = isVet
        ? `${API_BASE}/api/conversations/vet`
        : `${API_BASE}/api/conversations/user`;
      const res = await axios.get(endpoint, {
        headers: authHeaders || {}
      });

      const list = res.data.conversations || [];
      // Filtrar posibles duplicados por appointmentId + vetId + userId
      const seen = new Set();
      const unique = [];
      list.forEach((conv) => {
        const key = `${normalizeId(conv.userId?._id || conv.userId)}-${normalizeId(
          conv.vetId?._id || conv.vetId
        )}-${normalizeId(conv.appointmentId?._id || conv.appointmentId || 'none')}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(conv);
        }
      });

      setConversations(unique);
    } catch (error) {
      console.error('Error al obtener conversaciones:', error);
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [API_BASE, authHeaders, isVet, normalizeId, token]);

  const markConversationAsRead = useCallback(async (id) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId || !token) return;
    try {
      await axios.put(
        `${API_BASE}/api/conversations/${normalizedId}/read`,
        {},
        { headers: authHeaders || {} }
      );
      setConversations((prev) =>
        prev.map((conv) => {
          if (normalizeId(conv._id) !== normalizedId) return conv;
          const updated = { ...conv };
          if (isVet) {
            updated.vetUnreadCount = 0;
          } else {
            updated.userUnreadCount = 0;
          }
          const userUnread = updated.userUnreadCount || 0;
          const vetUnread = updated.vetUnreadCount || 0;
          updated.unreadCount = userUnread + vetUnread;
          return updated;
        })
      );
      if (normalizeId(conversationId) === normalizedId) {
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (isVet) {
            updated.vetUnreadCount = 0;
          } else {
            updated.userUnreadCount = 0;
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Error al marcar conversación como leída:', error);
    }
  }, [API_BASE, authHeaders, conversationId, isVet, normalizeId, token]);

  const handleConversationUpdated = useCallback(
    (payload) => {
      if (!payload?.conversationId) return;
      const payloadId = normalizeId(payload.conversationId);
      const { lastMessage, lastMessageAt, userUnreadCount, vetUnreadCount } = payload;

      setConversations((prev) => {
        let found = false;
        const updated = prev.map((conv) => {
          if (normalizeId(conv._id) !== payloadId) return conv;
          found = true;
          const updatedConv = {
            ...conv,
            lastMessage: lastMessage ?? conv.lastMessage,
            lastMessageAt: lastMessageAt ?? conv.lastMessageAt,
            userUnreadCount:
              typeof userUnreadCount === 'number' ? userUnreadCount : conv.userUnreadCount ?? 0,
            vetUnreadCount:
              typeof vetUnreadCount === 'number' ? vetUnreadCount : conv.vetUnreadCount ?? 0
          };
          updatedConv.unreadCount =
            (updatedConv.userUnreadCount || 0) + (updatedConv.vetUnreadCount || 0);
          return updatedConv;
        });
        if (!found) {
          fetchConversations();
          return prev;
        }
        return updated;
      });

      if (payloadId === normalizeId(conversationId)) {
        setSelectedConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lastMessage: lastMessage ?? prev.lastMessage,
            lastMessageAt: lastMessageAt ?? prev.lastMessageAt,
            userUnreadCount:
              typeof userUnreadCount === 'number' ? userUnreadCount : prev.userUnreadCount ?? 0,
            vetUnreadCount:
              typeof vetUnreadCount === 'number' ? vetUnreadCount : prev.vetUnreadCount ?? 0
          };
        });
      }
    },
    [conversationId, fetchConversations, normalizeId]
  );

const handleIncomingSocketMessage = useCallback((payload) => {
  if (!payload?.conversationId) {
    console.log('Payload sin conversationId:', payload);
    return;
  }
    const { conversationId: incomingId, message: incomingMessage, summary } = payload;

    const activeConversationId = conversationId ? conversationId.toString() : null;
    const incomingConversationId = incomingId ? incomingId.toString() : null;

    console.log(`Comparando conversaciones - Activa: ${activeConversationId}, Entrante: ${incomingConversationId}`);

    if (incomingMessage) {
      const senderType = incomingMessage.senderType;
      const isOwnMessage = senderType === (isVet ? 'Vet' : 'User');
      
      // Normalizar el mensaje entrante
      const normalizedIncomingMessage = {
        _id: normalizeId(incomingMessage._id),
        senderId: normalizeId(incomingMessage.senderId),
        senderType: incomingMessage.senderType,
        content: incomingMessage.content || '',
        image: incomingMessage.image || null,
        messageType: incomingMessage.messageType || 'text',
        read: incomingMessage.read || false,
        createdAt: incomingMessage.createdAt ? new Date(incomingMessage.createdAt) : new Date()
      };
      
      // Solo procesar si es un mensaje del otro usuario o si es de la conversación activa
      const isActiveConversation = incomingConversationId === activeConversationId;
      
      if (isActiveConversation) {
        // Agregar o actualizar el mensaje en la conversación activa
        setMessages((prev) => {
          const incomingMessageId = normalizeId(normalizedIncomingMessage._id);
          const existingIndex = prev.findIndex((msg) => {
            const msgId = normalizeId(msg._id);
            return msgId === incomingMessageId;
          });
          
          if (existingIndex !== -1) {
            // Si ya existe, no hacer nada (evitar duplicados y re-renders innecesarios)
            return prev;
          }
          
          // Agregar nuevo mensaje
          return [...prev, normalizedIncomingMessage];
        });

        // Marcar como leído si es un mensaje del otro usuario
        if (!isOwnMessage) {
          markConversationAsRead(incomingId);
        }
        
        // Scroll automático cuando llega un nuevo mensaje
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        setSelectedConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lastMessage: incomingMessage.content ?? prev.lastMessage,
            lastMessageAt: incomingMessage.createdAt ?? prev.lastMessageAt
          };
        });
      }

      // Actualizar la lista de conversaciones siempre
      setConversations((prev) => {
        const conversation = prev.find(
          (conv) => normalizeId(conv._id) === incomingConversationId
        );
        
        if (!conversation) {
          // Si no existe la conversación en la lista, recargar
          fetchConversations();
          return prev;
        }
        
        // Actualizar con summary si está disponible
        if (summary) {
          const { userUnreadCount, vetUnreadCount, lastMessage, lastMessageAt } = summary;
          
          return prev.map((conv) => {
            if (normalizeId(conv._id) !== incomingConversationId) return conv;
            const updated = {
              ...conv,
              lastMessage:
                lastMessage ??
                incomingMessage?.content ??
                conv.lastMessage,
              lastMessageAt:
                lastMessageAt ??
                incomingMessage?.createdAt ??
                conv.lastMessageAt,
              userUnreadCount:
                typeof userUnreadCount === 'number'
                  ? userUnreadCount
                  : conv.userUnreadCount ?? 0,
              vetUnreadCount:
                typeof vetUnreadCount === 'number'
                  ? vetUnreadCount
                  : conv.vetUnreadCount ?? 0
            };
            updated.unreadCount =
              (updated.userUnreadCount || 0) + (updated.vetUnreadCount || 0);
            return updated;
          });
        }
        
        // Si no hay summary, actualizar con el mensaje recibido
        return prev.map((conv) => {
          if (normalizeId(conv._id) !== incomingConversationId) return conv;
          const updated = {
            ...conv,
            lastMessage: incomingMessage.content ?? conv.lastMessage,
            lastMessageAt: incomingMessage.createdAt ?? conv.lastMessageAt
          };
          
          // Incrementar contador de no leídos si es mensaje del otro usuario
          if (!isOwnMessage) {
            if (isVet) {
              updated.vetUnreadCount = (updated.vetUnreadCount || 0) + 1;
            } else {
              updated.userUnreadCount = (updated.userUnreadCount || 0) + 1;
            }
            updated.unreadCount =
              (updated.userUnreadCount || 0) + (updated.vetUnreadCount || 0);
          }
          
          return updated;
        });
      });

      // Mostrar notificación si es un mensaje del otro usuario
      if (!isOwnMessage) {
        const isNotificationPermitted = isNotificationAvailable();
        const isPageVisible = document.visibilityState === 'visible';
        const isViewingThisConversation = isActiveConversation && isPageVisible;
        
        // Mostrar notificación si:
        // 1. No está viendo esta conversación específica (incluso si la página está visible)
        // 2. O la página está oculta/en otra pestaña
        const shouldNotify = !isViewingThisConversation;
        
        console.log('Evaluando notificación:', {
          isOwnMessage,
          isNotificationPermitted,
          isPageVisible,
          isViewingThisConversation,
          shouldNotify,
          activeConversationId,
          incomingConversationId
        });
        
        if (shouldNotify && isNotificationPermitted) {
          // Obtener información del remitente desde el summary o estado actual
          let senderName = isVet ? 'Cliente' : 'Veterinario';
          let senderAvatar = null;
          
          // Intentar obtener del summary primero (viene del backend)
          if (summary && summary.senderName) {
            senderName = summary.senderName;
            senderAvatar = summary.senderAvatar || null;
          } else {
            // Buscar en el estado actual de conversaciones
            const conversation = conversations.find(
              (conv) => normalizeId(conv._id) === incomingConversationId
            ) || (selectedConversation && normalizeId(selectedConversation._id) === incomingConversationId ? selectedConversation : null);
            
            if (conversation) {
              senderName = isVet
                ? conversation?.userId?.name || 'Cliente'
                : conversation?.vetId?.name || 'Veterinario';
              
              senderAvatar = isVet
                ? conversation?.userId?.profileImage
                : conversation?.vetId?.profileImage;
            }
          }
          
          const messageContent = incomingMessage.content || (incomingMessage.image ? 'Imagen' : 'Nuevo mensaje');
          
          // Mostrar notificación
          console.log('Mostrando notificación de mensaje:', { senderName, messageContent });
          const notification = showNewMessageNotification({
            senderName,
            messageContent,
            conversationId: incomingConversationId,
            isVet,
            senderAvatar
          });
          
          if (notification) {
            console.log('Notificación mostrada exitosamente');
            // Reproducir sonido de notificación
            playNotificationSound();
          } else {
            console.warn('No se pudo mostrar la notificación');
          }
        } else if (shouldNotify && !isNotificationPermitted) {
          console.log('Notificación no mostrada: permiso no concedido');
        }
      }
    }
}, [conversationId, conversations, selectedConversation, isVet, markConversationAsRead, scrollToBottom, normalizeId, fetchConversations]);

  const fetchConversationDetail = useCallback(async (id) => {
    if (!id || !token) return;
    setLoadingConversation(true);
    try {
      const res = await axios.get(`${API_BASE}/api/conversations/${id}`, {
        headers: authHeaders || {}
      });
      const conversation = res.data.conversation;
      setSelectedConversation(conversation);
      setMessages(conversation?.messages || []);

      // Si es una emergencia, obtener el estado desde el appointment
      if (conversation?.appointmentId?.isEmergency) {
        const appointment = conversation.appointmentId;
        // Priorizar tracking.status, luego status del appointment
        const trackingStatus = appointment.tracking?.status;
        const appointmentStatus = appointment.status;
        
        // Si el appointment está completado o cancelado, usar ese estado
        if (appointmentStatus === 'completed' || trackingStatus === 'completed') {
          setEmergencyStatus('completed');
        } else if (appointmentStatus === 'cancelled' || trackingStatus === 'cancelled') {
          setEmergencyStatus('cancelled');
        } else if (trackingStatus) {
          setEmergencyStatus(trackingStatus);
        } else if (appointmentStatus) {
          setEmergencyStatus(appointmentStatus);
        }
      } else if (!emergencyStatusFromState) {
        // Si no es emergencia o no hay estado en el state, limpiar
        setEmergencyStatus(null);
      }

      await markConversationAsRead(id);
      
      // Scroll automático al cargar la conversación
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    } catch (error) {
      console.error('Error al obtener la conversación:', error);
    } finally {
      setLoadingConversation(false);
    }
  }, [API_BASE, authHeaders, markConversationAsRead, token, scrollToBottom, emergencyStatusFromState]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (conversationId) {
      fetchConversationDetail(conversationId);
    } else {
      setSelectedConversation(null);
      setMessages([]);
    }
  }, [conversationId, fetchConversationDetail]);

  // Scroll automático cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages.length, scrollToBottom]);

  // Socket para chat
  const emergencySocketRef = useRef(null);

  useEffect(() => {
    if (!token || !userData?.id) return;

    const socket = io(`${API_BASE}/chat`, {
      auth: { token }
    });

    socketRef.current = socket;

    const handleConnect = () => {
      if (isVet) {
        socket.emit('join:vet', userData.id);
      } else {
        socket.emit('join:user', userData.id);
      }

      const activeConversation = prevConversationIdRef.current || conversationId;
      if (activeConversation) {
        socket.emit('join:conversation', activeConversation);
        prevConversationIdRef.current = activeConversation;
      }
    };

    socket.on('connect', handleConnect);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('conversation:new-message', (payload) => {
      console.log('Mensaje recibido via socket:', payload);
      handleIncomingSocketMessage(payload);
    });

    return () => {
      if (prevConversationIdRef.current) {
        socket.emit('leave:conversation', prevConversationIdRef.current);
        prevConversationIdRef.current = null;
      }
      socket.off('connect', handleConnect);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('conversation:new-message', handleIncomingSocketMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    API_BASE,
    handleConversationUpdated,
    handleIncomingSocketMessage,
    isVet,
    token,
    userData?.id
  ]);

  // Socket para emergencias (solo si es una emergencia)
  useEffect(() => {
    // Solo conectar si es una emergencia y hay un requestId
    if (!emergencyRequestId || !token || !selectedConversation?.appointmentId?.isEmergency) {
      return;
    }

    const emergencySocket = io(`${API_BASE}/emergency`, {
      transports: ['websocket'],
      auth: { token }
    });

    emergencySocketRef.current = emergencySocket;

    const handleConnect = () => {
      console.log('Conectado al socket de emergencias para actualizar estado del chat');
      if (emergencyRequestId) {
        emergencySocket.emit('join:emergency', emergencyRequestId);
      }
    };

    const handleEmergencyCompleted = (data) => {
      console.log('Urgencia completada, deshabilitando chat:', data);
      if (data.appointmentId === selectedConversation.appointmentId?._id || 
          data.emergencyId === emergencyRequestId) {
        setEmergencyStatus('completed');
        // Recargar la conversación para obtener el estado actualizado
        if (conversationId) {
          fetchConversationDetail(conversationId);
        }
      }
    };

    const handleEmergencyCancelled = (data) => {
      console.log('Urgencia cancelada, deshabilitando chat:', data);
      if (data.appointmentId === selectedConversation.appointmentId?._id || 
          data.emergencyId === emergencyRequestId) {
        setEmergencyStatus('cancelled');
        // Recargar la conversación para obtener el estado actualizado
        if (conversationId) {
          fetchConversationDetail(conversationId);
        }
      }
    };

    const handleStatusUpdated = (data) => {
      if (data.status === 'completed') {
        setEmergencyStatus('completed');
      } else if (data.status === 'cancelled') {
        setEmergencyStatus('cancelled');
      }
    };

    emergencySocket.on('connect', handleConnect);
    emergencySocket.on('emergency:completed', handleEmergencyCompleted);
    emergencySocket.on('emergency:cancelled', handleEmergencyCancelled);
    emergencySocket.on('status:updated', handleStatusUpdated);

    return () => {
      emergencySocket.off('connect', handleConnect);
      emergencySocket.off('emergency:completed', handleEmergencyCompleted);
      emergencySocket.off('emergency:cancelled', handleEmergencyCancelled);
      emergencySocket.off('status:updated', handleStatusUpdated);
      emergencySocket.disconnect();
      emergencySocketRef.current = null;
    };
  }, [emergencyRequestId, token, selectedConversation, conversationId, API_BASE, fetchConversationDetail]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const previousId = prevConversationIdRef.current;
    if (previousId && previousId !== conversationId) {
      socket.emit('leave:conversation', previousId);
    }

    if (conversationId) {
      socket.emit('join:conversation', conversationId);
    }

    prevConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Estado para controlar si se muestra el banner de solicitud de notificaciones
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Verificar estado de notificaciones al cargar el componente y cuando vuelve a la página
  useEffect(() => {
    const checkNotifications = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = Notification.permission;
        setNotificationPermission(permission);
        // Mostrar banner si el permiso es 'default' (no se ha solicitado aún)
        setShowNotificationBanner(permission === 'default');
      }
    };
    
    checkNotifications();
    
    // Verificar también cuando el usuario vuelve a la página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNotifications();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handler para solicitar permiso de notificaciones
  const handleRequestNotificationPermission = async () => {
    try {
      const granted = await requestNotificationPermissionIfNeeded();
      if (granted) {
        setShowNotificationBanner(false);
        setNotificationPermission('granted');
      } else {
        setNotificationPermission(Notification.permission);
        if (Notification.permission === 'denied') {
          setShowNotificationBanner(false);
          // Opcional: mostrar un mensaje informando que el usuario denegó el permiso
          console.log('Permiso de notificaciones denegado por el usuario');
        }
      }
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error);
    }
  };

  const handleSchedule = () => {
    if (isVet) {
      navigate('/vet/appointments');
    } else {
      navigate('/agendar-cita');
    }
  };

  const handleSelectConversation = (id) => {
    if (isVet) {
      navigate(id ? `/vet/conversations/${id}` : `/vet/conversations`);
    } else {
      navigate(id ? `/conversations/${id}` : `/conversations`);
    }
  };

  const normalizeAvatar = useCallback((value, fallbackName = 'Usuario') => {
    if (!value || value.includes('default-avatar.png')) {
      const name = encodeURIComponent(fallbackName || 'Usuario');
      return `https://ui-avatars.com/api/?background=6366F1&color=FFFFFF&name=${name}`;
    }
    return value;
  }, []);

  const getDisplayData = (conversation) => {
    if (isVet) {
      return {
        name: conversation.userId?.name || 'Cliente',
        avatar: normalizeAvatar(
          conversation.userId?.profileImage,
          conversation.userId?.name || 'Cliente'
        ),
        subtitle: conversation.userId?.email || 'Usuario sin email'
      };
    }

    return {
      name: conversation.vetId?.name || 'Veterinario',
      avatar: normalizeAvatar(
        conversation.vetId?.profileImage,
        conversation.vetId?.name || 'Veterinario'
      ),
      subtitle: conversation.vetId?.specialization || 'Veterinario'
    };
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no puede ser mayor a 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSendMessage = async (event) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    // No permitir enviar mensajes si el chat está deshabilitado
    if (isChatDisabled) {
      return;
    }
    if ((!message.trim() && !selectedImage) || !conversationId) return;
    if (!token) {
      alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      return;
    }

    try {
      setSending(true);
      
      // Crear FormData para enviar texto e imagen
      const formData = new FormData();
      if (message.trim()) {
        formData.append('content', message);
      }
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      const res = await axios.post(
        `${API_BASE}/api/conversations/${conversationId}/message`,
        formData,
        { 
          headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      const sentMessage = res.data.message;
      
      // Asegurar que el mensaje esté en formato plano
      const normalizedMessage = {
        _id: normalizeId(sentMessage._id),
        senderId: normalizeId(sentMessage.senderId),
        senderType: sentMessage.senderType,
        content: sentMessage.content || '',
        image: sentMessage.image || null,
        messageType: sentMessage.messageType || 'text',
        read: sentMessage.read || false,
        createdAt: sentMessage.createdAt ? new Date(sentMessage.createdAt) : new Date()
      };
      
      // Agregar el mensaje optimistamente (se actualizará cuando llegue por socket)
      setMessages((prev) => {
        const sentMessageId = normalizeId(normalizedMessage._id);
        const existingIndex = prev.findIndex((msg) => {
          const msgId = normalizeId(msg._id);
          return msgId === sentMessageId;
        });
        
        if (existingIndex !== -1) {
          // Si ya existe (llegó por socket primero), no hacer nada
          return prev;
        }
        
        // Agregar nuevo mensaje
        return [...prev, normalizedMessage];
      });
      setSelectedConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lastMessage: normalizedMessage.content ?? prev.lastMessage,
          lastMessageAt: normalizedMessage.createdAt ?? prev.lastMessageAt
        };
      });
      setConversations((prev) =>
        prev.map((conv) => {
          if (normalizeId(conv._id) !== normalizeId(conversationId)) return conv;
          return {
            ...conv,
            lastMessage: normalizedMessage.content ?? conv.lastMessage,
            lastMessageAt: normalizedMessage.createdAt ?? conv.lastMessageAt
          };
        })
      );
      
      // Limpiar el input y la imagen después de enviar exitosamente
      setMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      
      // Scroll automático al final después de enviar
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      alert('No se pudo enviar el mensaje. Intenta nuevamente.');
      // No limpiar el mensaje si hubo un error, para que el usuario pueda intentar de nuevo
    } finally {
      setSending(false);
    }
  };

  const renderEmptyState = () => (
    <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
      <div className="w-32 h-32 md:w-40 md:h-40 mb-6 flex items-center justify-center">
        <svg className="w-full h-full text-tutor-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p className="text-base md:text-lg text-tutor-text-primary mb-4 font-semibold">
        {isVet
          ? 'Aún no tienes conversaciones con clientes activos.'
          : 'Para iniciar una conversación, agenda primero una consulta o urgencia.'}
      </p>
      <p className="text-sm md:text-base text-tutor-text-secondary mb-6">
        {isVet
          ? 'Cuando un cliente envíe un mensaje, podrás gestionarlo desde este panel.'
          : 'Luego, podrás comunicarte con el profesional asignado desde aquí.'}
      </p>
      <button
        onClick={handleSchedule}
        className="px-6 md:px-8 py-3 md:py-4 bg-tutor-btn-primary text-white rounded-lg md:rounded-xl font-semibold hover:bg-tutor-btn-primary-dark active:bg-tutor-btn-primary-dark transition-all active:scale-95 text-sm md:text-base shadow-md hover:shadow-lg"
      >
        {isVet ? 'Ver mis citas' : 'Ver profesionales'}
      </button>
    </div>
  );

  const renderConversationList = () => {
    if (conversations.length === 0) return renderEmptyState();

    const pendingCount = conversations.reduce((total, conv) => {
      const unread = isVet
        ? conv.vetUnreadCount ?? 0
        : conv.userUnreadCount ?? 0;
      return unread > 0 ? total + 1 : total;
    }, 0);

    return (
      <div className="space-y-2 md:space-y-3 p-3 md:p-4">
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs md:text-sm rounded-lg px-3 py-2 mb-2">
            {pendingCount === 1
              ? 'Tienes 1 conversación con mensajes pendientes de responder.'
              : `Tienes ${pendingCount} conversaciones con mensajes pendientes de responder.`}
          </div>
        )}
        {conversations.map((conversation) => {
          const display = getDisplayData(conversation);
          const isActive = conversation._id === conversationId;
          const unreadCount = isVet
            ? conversation.vetUnreadCount ?? 0
            : conversation.userUnreadCount ?? 0;

          return (
            <div
              key={conversation._id}
              className={`rounded-xl p-3 md:p-4 transition-all cursor-pointer border-2 ${
                isActive 
                  ? 'border-tutor-primary bg-tutor-primary/5 shadow-sm' 
                  : 'border-transparent bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm'
              }`}
              onClick={() => handleSelectConversation(conversation._id)}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ring-2 ring-offset-2 ring-transparent">
                  <img
                    src={display.avatar}
                    alt={display.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-tutor-primary text-white text-base md:text-lg font-bold">${display.name.charAt(0)}</div>`;
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-sm md:text-base font-semibold truncate ${
                      isActive ? 'text-tutor-primary' : 'text-tutor-text-primary'
                    }`}>
                      {display.name}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="bg-tutor-btn-primary text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs md:text-sm truncate mb-1 ${
                    isActive ? 'text-tutor-text-primary' : 'text-tutor-text-secondary'
                  }`}>
                    {conversation.lastMessage || 'Sin mensajes'}
                  </p>
                  <p className="text-xs text-tutor-text-secondary truncate">
                    {display.subtitle}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderConversationDetail = () => {
    if (!conversationId) {
      return (
        <div className="hidden md:flex items-center justify-center h-full text-tutor-text-secondary bg-tutor-bg-primary">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-tutor-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-base text-tutor-text-primary font-medium">
              Selecciona una conversación para comenzar a chatear.
            </p>
          </div>
        </div>
      );
    }

    if (loadingConversation || !selectedConversation) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Cargando conversación...</p>
          </div>
        </div>
      );
    }

    const display = getDisplayData(selectedConversation);
    
    // Obtener avatar del usuario actual
    const currentUserAvatar = isVet 
      ? (userData?.profileImage ? normalizeAvatar(userData.profileImage, userData.name) : normalizeAvatar(null, userData?.name || 'Vet'))
      : (userData?.profileImage ? normalizeAvatar(userData.profileImage, userData.name) : normalizeAvatar(null, userData?.name || 'Usuario'));
    
    return (
      <div className={`flex flex-col ${isMobile ? 'h-screen' : 'h-full'} bg-white overflow-hidden`}>
        {/* Header mejorado - más compacto en móvil */}
        <header className={`${isMobile ? 'px-3 py-2.5' : 'px-4 md:px-6 py-3 md:py-4'} border-b ${isMobile ? 'border-gray-200' : 'border-tutor-bg-secondary'} bg-white flex items-center justify-between sticky top-0 z-10 ${isMobile ? '' : 'shadow-sm'} flex-shrink-0`}>
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Botón de regreso - siempre visible en móvil, solo si viene de emergencia en desktop */}
            {(emergencyRequestId || isMobile) && (
              <button
                onClick={() => {
                  if (emergencyRequestId && !isMobile) {
                    // En desktop, si viene de emergencia, regresar a la página de tracking
                    navigate(`/emergency/${emergencyRequestId}/tracking`);
                  } else {
                    // En móvil o sin emergencia, volver a la lista de conversaciones
                    handleSelectConversation(null);
                  }
                }}
                className="p-2 hover:bg-tutor-bg-secondary rounded-full transition flex-shrink-0"
                aria-label="Volver"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-tutor-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className={`${isMobile ? 'w-9 h-9' : 'w-10 h-10 md:w-12 md:h-12'} rounded-full overflow-hidden bg-tutor-bg-secondary flex-shrink-0 ${isMobile ? '' : 'ring-2 ring-tutor-bg-secondary ring-offset-2'}`}>
              <img
                src={display.avatar}
                alt={display.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-tutor-primary text-white font-semibold ${isMobile ? 'text-xs' : 'text-sm md:text-base'}">${display.name.charAt(0)}</div>`;
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={`${isMobile ? 'text-sm' : 'text-base md:text-lg'} font-semibold text-tutor-text-primary truncate`}>{display.name}</h2>
              {!isMobile && <p className="text-xs md:text-sm text-tutor-text-secondary truncate">{display.subtitle}</p>}
            </div>
          </div>
        </header>

        {/* Área de mensajes mejorada - más compacto en móvil */}
        <div className={`flex-1 overflow-y-auto bg-tutor-bg-primary ${isMobile ? 'px-2 py-2' : 'px-3 md:px-6 py-4 md:py-6'} min-h-0`}>
          {(() => {
            // Filtrar mensajes que tengan contenido o imagen
            const filteredMessages = messages.filter((msg) => 
              (msg?.content && msg.content.toString().trim() !== '') || 
              (msg?.image && msg.image.toString().trim() !== '')
            );
            
            if (filteredMessages.length === 0) {
              return (
                <div className="flex items-center justify-center h-full px-4">
                  <p className="text-sm md:text-base text-tutor-text-secondary text-center">
                    Aún no hay mensajes en esta conversación. Envía el primero para comenzar.
                  </p>
                </div>
              );
            }

            // Convertir mensajes al formato de react-chat-elements
            const messageListData = filteredMessages.map((msg, index) => {
              const isOwn = (msg.senderType === 'Vet' && isVet) || (msg.senderType === 'User' && !isVet);
              const msgId = normalizeId(msg._id) || `msg-${index}`;
              const msgDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
              
              // Determinar el tipo de mensaje
              const hasImage = msg.image && msg.image.toString().trim() !== '';
              const hasText = msg.content && msg.content.toString().trim() !== '';
              const messageType = hasImage ? (hasText ? 'photo' : 'photo') : 'text';
              
              // Determinar el estado del mensaje
              let status = 'read';
              if (isOwn) {
                status = 'read';
              } else {
                status = msg.read ? 'read' : 'received';
              }
              
              return {
                id: msgId,
                position: isOwn ? 'right' : 'left',
                type: messageType,
                text: msg.content || '',
                data: hasImage ? {
                  uri: msg.image,
                  status: {
                    click: false,
                    loading: 0
                  },
                  width: 250,
                  height: 250
                } : undefined,
                date: msgDate,
                dateString: msgDate.toLocaleTimeString('es-CL', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                title: isOwn ? 'Tú' : display.name,
                titleColor: isOwn ? '#6366F1' : '#6B7280',
                avatar: isOwn ? currentUserAvatar : display.avatar,
                status: status,
                notch: true,
                retracted: false,
                focus: false,
                removeButton: false,
                replyButton: false,
                forwarded: false,
                system: false,
                // Mejoras de UX
                copied: false,
                onOpen: hasImage ? () => {
                  // Abrir imagen en nueva pestaña al hacer clic
                  window.open(msg.image, '_blank');
                } : undefined
              };
            });

            return (
              <div ref={messageListRef} className="h-full">
                <MessageList
                  className="message-list"
                  lockable={true}
                  toBottomHeight={'100%'}
                  dataSource={messageListData}
                  onScroll={(e) => {
                    // Detectar si el usuario está cerca del final para auto-scroll
                    const container = e.target;
                    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                    if (isNearBottom) {
                      // Usuario está cerca del final, mantener scroll al final
                      setTimeout(() => scrollToBottom(), 50);
                    }
                  }}
                />
                <div ref={messagesEndRef} />
              </div>
            );
          })()}
        </div>

        {/* Input area mejorada - más compacto en móvil */}
        <div className={`border-t ${isMobile ? 'border-gray-200' : 'border-tutor-bg-secondary'} bg-white ${isMobile ? 'px-3 py-2' : 'px-4 md:px-6 py-3 md:py-4'} safe-area-inset-bottom ${isMobile ? '' : 'shadow-lg'} flex-shrink-0`}>
          {/* Preview de imagen seleccionada */}
          {imagePreview && (
            <div className="mb-2 md:mb-3 relative inline-block">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-[150px] md:max-w-[200px] max-h-[150px] md:max-h-[200px] rounded-lg object-cover"
                />
                <button
                  onClick={removeSelectedImage}
                  className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-red-500 text-white rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center hover:bg-red-600 transition active:scale-95"
                  type="button"
                  aria-label="Eliminar imagen"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Mensaje informativo si el chat está deshabilitado */}
          {isChatDisabled && (
            <div className="px-3 md:px-4 py-2 bg-amber-50 border-t border-amber-200">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Esta solicitud ha finalizado. El chat es de solo lectura.</span>
              </div>
            </div>
          )}
          
          <div className={`flex items-end gap-2 md:gap-3 ${isChatDisabled ? 'opacity-60' : ''}`}>
            {/* Botón para seleccionar imagen - más compacto en móvil */}
            <label className={`flex-shrink-0 ${isMobile ? 'p-1.5' : 'p-2 md:p-2.5'} rounded-full transition active:scale-95 ${
              isChatDisabled 
                ? 'cursor-not-allowed opacity-50' 
                : `${isMobile ? 'hover:bg-gray-200' : 'hover:bg-tutor-bg-secondary'} cursor-pointer`
            }`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={isChatDisabled}
                className="hidden"
              />
              <svg className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5 md:w-6 md:h-6'} ${isMobile ? 'text-gray-500' : 'text-tutor-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>
            
            {/* Input de texto con auto-resize - más compacto en móvil */}
            <div className={`flex-1 ${isMobile ? 'bg-gray-100 rounded-3xl px-3 py-2 min-h-[40px]' : 'bg-tutor-bg-secondary rounded-2xl px-4 md:px-5 py-2.5 md:py-3 min-h-[48px] md:min-h-[52px]'} max-h-32 flex items-center border-2 border-transparent ${isMobile ? 'focus-within:border-gray-300' : 'focus-within:border-tutor-primary/30'} transition-colors`}>
              <textarea
                ref={(textarea) => {
                  if (textarea && !isChatDisabled) {
                    // Auto-resize del textarea
                    textarea.style.height = 'auto';
                    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
                  }
                }}
                placeholder={isChatDisabled ? 'El chat está cerrado' : 'Escribe un mensaje...'}
                value={message || ''}
                onChange={(e) => {
                  if (isChatDisabled) return;
                  setMessage(e.target.value);
                  // Auto-resize
                  const textarea = e.target;
                  textarea.style.height = 'auto';
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
                }}
                onKeyDown={(e) => {
                  if (isChatDisabled) return;
                  // Enter para enviar, Shift+Enter para nueva línea
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if ((message.trim() || selectedImage) && !sending) {
                      handleSendMessage(e);
                    }
                  }
                }}
                disabled={isChatDisabled}
                className={`flex-1 bg-transparent border-none outline-none resize-none ${isMobile ? 'text-sm' : 'text-sm md:text-base'} text-tutor-text-primary placeholder-tutor-text-secondary overflow-y-auto disabled:cursor-not-allowed disabled:opacity-50`}
                rows={1}
                style={{ 
                  minHeight: '24px',
                  maxHeight: '128px',
                  lineHeight: '1.5'
                }}
              />
            </div>
            
            {/* Botón de enviar - más compacto en móvil */}
            <button
              onClick={handleSendMessage}
              disabled={isChatDisabled || sending || (!message.trim() && !selectedImage)}
              className={`flex-shrink-0 ${isMobile ? 'w-9 h-9' : 'w-11 h-11 md:w-12 md:h-12'} rounded-full flex items-center justify-center transition-all ${isMobile ? '' : 'shadow-md'} ${
                isChatDisabled || sending || (!message.trim() && !selectedImage)
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-tutor-btn-primary hover:bg-tutor-btn-primary-dark active:scale-95'
              } ${!isMobile && (isChatDisabled || sending || (!message.trim() && !selectedImage)) ? '' : 'shadow-lg'}`}
              title={isChatDisabled ? 'Chat cerrado' : 'Enviar mensaje'}
              aria-label={isChatDisabled ? 'Chat cerrado' : 'Enviar mensaje'}
            >
              {sending ? (
                <span className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5 md:w-6 md:h-6'} border-2 border-white border-t-transparent rounded-full animate-spin`}></span>
              ) : (
                <svg className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5 md:w-6 md:h-6'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loadingList) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  return (
      <div className={`min-h-screen bg-tutor-bg-primary ${isMobile && conversationId ? 'pb-0' : 'pb-24 md:pb-10'}`}>
      <div className={`max-w-7xl mx-auto ${isMobile && conversationId ? 'p-0' : 'p-4 md:p-6'}`}>
        {/* Título - oculto en móvil cuando hay una conversación seleccionada */}
        {(!isMobile || !conversationId) && (
          <h1 className="text-2xl md:text-3xl font-bold text-tutor-text-primary mb-4 md:mb-6 px-4 md:px-0 pt-4 md:pt-0">
            {isVet ? 'Conversaciones con clientes' : 'Mis conversaciones'}
          </h1>
        )}

        {/* Banner de solicitud de notificaciones - oculto en móvil cuando hay conversación seleccionada */}
        {showNotificationBanner && notificationPermission === 'default' && (!isMobile || !conversationId) && (
          <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between gap-4 mx-4 md:mx-0">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-violet-900 mb-1">
                  Activa las notificaciones
                </h3>
                <p className="text-sm text-violet-700">
                  Recibe notificaciones cuando recibas nuevos mensajes en el chat, incluso cuando no estés en la página.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowNotificationBanner(false)}
                className="text-violet-600 hover:text-violet-800 text-sm font-medium px-2 py-1"
                aria-label="Cerrar"
              >
                Ahora no
              </button>
              <button
                onClick={handleRequestNotificationPermission}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Activar
              </button>
            </div>
          </div>
        )}

        <div className={`flex flex-col md:grid md:grid-cols-[360px,1fr] gap-4 md:gap-6 ${isMobile && conversationId ? 'min-h-screen h-screen' : 'min-h-[420px] h-[calc(100vh-220px)]'} md:h-[calc(100vh-240px)] md:items-stretch bg-white ${isMobile && conversationId ? 'rounded-none shadow-none' : 'rounded-xl shadow-sm'} overflow-hidden`}>
          {/* Lista de conversaciones - oculta en móvil si hay una conversación seleccionada */}
          <aside className={`h-full overflow-y-auto md:border-r md:border-gray-200 bg-tutor-bg-primary md:bg-white ${isMobile && conversationId ? 'hidden' : 'flex flex-col'}`}>
            {renderConversationList()}
          </aside>
          {/* Vista de chat - oculta en móvil si no hay conversación seleccionada */}
          <section className={`${isMobile ? 'fixed inset-0 z-50 bg-white' : 'min-h-[400px] flex-1 h-full'} overflow-hidden md:overflow-hidden ${isMobile && !conversationId ? 'hidden' : 'flex flex-col'}`}>
            {renderConversationDetail()}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;

