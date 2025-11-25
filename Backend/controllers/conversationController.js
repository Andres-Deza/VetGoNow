import Conversation from '../models/Conversation.js';
import Appointment from '../models/Appointment.js';

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toString) return value.toString();
  return value;
};

const buildSummaryPayload = (conversation, message = null) => {
  const conversationId = normalizeId(conversation._id);
  const payload = {
    conversationId,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    userUnreadCount: conversation.userUnreadCount || 0,
    vetUnreadCount: conversation.vetUnreadCount || 0
  };
  
  // Agregar información del remitente si hay un mensaje
  if (message) {
    const isFromVet = message.senderType === 'Vet';
    if (isFromVet && conversation.vetId) {
      const vet = conversation.vetId;
      payload.senderName = vet.name || 'Veterinario';
      payload.senderAvatar = vet.profileImage || null;
    } else if (!isFromVet && conversation.userId) {
      const user = conversation.userId;
      payload.senderName = user.name || 'Cliente';
      payload.senderAvatar = user.profileImage || null;
    }
  }
  
  return payload;
};

const emitConversationUpdate = async (req, conversation, { message } = {}) => {
  const io = req.app.get('io');
  if (!io) {
    console.log('Socket.IO no disponible en req.app');
    return;
  }

  const chatNamespace = io.of('/chat');
  // Normalizar IDs asegurándose de que sean strings
  const userRoomId = normalizeId(conversation.userId?._id || conversation.userId)?.toString();
  const vetRoomId = normalizeId(conversation.vetId?._id || conversation.vetId)?.toString();
  const conversationId = normalizeId(conversation._id)?.toString();
  const summary = buildSummaryPayload(conversation, message);

  // Verificar si es una urgencia
  let isEmergency = false;
  if (conversation.appointmentId) {
    const appointment = await Appointment.findById(conversation.appointmentId).select('isEmergency');
    isEmergency = appointment?.isEmergency || false;
  }

  console.log(`Emitiendo actualización de conversación ${conversationId}`);
  console.log(`   - User room: user:${userRoomId}`);
  console.log(`   - Vet room: vet:${vetRoomId}`);
  console.log(`   - Conversation room: conversation:${conversationId}`);
  console.log(`   - Tiene mensaje: ${!!message}`);
  console.log(`   - Es urgencia: ${isEmergency}`);

  if (message) {
    const messagePayload = {
      conversationId,
      message,
      summary,
      isEmergency
    };
    
    // Emitir a la sala de la conversación
    chatNamespace.to(`conversation:${conversationId}`).emit('conversation:new-message', messagePayload);
    console.log(`   Mensaje emitido a conversation:${conversationId}`);
    
    // También emitir a las salas del usuario y del vet para asegurar recepción
    if (userRoomId) {
      chatNamespace.to(`user:${userRoomId}`).emit('conversation:new-message', messagePayload);
      console.log(`   Mensaje emitido a user:${userRoomId}`);
    }
    
    if (vetRoomId) {
      chatNamespace.to(`vet:${vetRoomId}`).emit('conversation:new-message', messagePayload);
      console.log(`   Mensaje emitido a vet:${vetRoomId}`);
    }

    // Si es una urgencia, emitir evento específico para notificaciones push globales
    if (isEmergency) {
      const senderType = message.senderType;
      const isFromVet = senderType === 'Vet';
      
      // Determinar quién recibe la notificación
      const recipientId = isFromVet ? userRoomId : vetRoomId;
      const recipientRoom = isFromVet ? `user:${userRoomId}` : `vet:${vetRoomId}`;
      
      console.log(`   Preparando notificación de urgencia:`);
      console.log(`     - Es urgencia: ${isEmergency}`);
      console.log(`     - Remitente es Vet: ${isFromVet}`);
      console.log(`     - ID del receptor: ${recipientId}`);
      console.log(`     - Sala del receptor: ${recipientRoom}`);
      
      if (recipientId) {
        const emergencyNotificationPayload = {
          conversationId,
          message,
          senderName: summary.senderName || (isFromVet ? 'Veterinario' : 'Cliente'),
          senderAvatar: summary.senderAvatar || null,
          messageContent: message.content || (message.image ? 'Imagen' : 'Nuevo mensaje'),
          isFromVet,
          appointmentId: conversation.appointmentId ? normalizeId(conversation.appointmentId) : null
        };
        
        console.log(`   Payload de notificación de urgencia:`, JSON.stringify(emergencyNotificationPayload, null, 2));
        
        // Verificar cuántos sockets están en la sala
        const room = chatNamespace.adapter.rooms.get(recipientRoom);
        const socketsInRoom = room ? room.size : 0;
        console.log(`   Sockets en sala ${recipientRoom}: ${socketsInRoom}`);
        
        chatNamespace.to(recipientRoom).emit('emergency:new-message', emergencyNotificationPayload);
        console.log(`   Notificación de urgencia emitida a ${recipientRoom} (${socketsInRoom} sockets)`);
      } else {
        console.log(`   ERROR: No hay ID del receptor para la notificación de urgencia`);
      }
    }
  }

  if (userRoomId) {
    chatNamespace.to(`user:${userRoomId}`).emit('conversation:updated', summary);
  }

  if (vetRoomId) {
    chatNamespace.to(`vet:${vetRoomId}`).emit('conversation:updated', summary);
  }
};

const isConversationActive = (conversation) => {
  if (!conversation) return false;
  const appointment = conversation.appointmentId;
  
  // Si no hay appointmentId, mostrar la conversación si tiene mensajes
  // (puede ser una conversación directa sin cita asociada)
  if (!appointment) {
    return conversation.messages && conversation.messages.length > 0;
  }

  // Si es una urgencia, siempre mostrar la conversación (incluso si está completada)
  // para que el usuario y el vet puedan ver el historial de chat
  if (appointment.isEmergency) {
    // Excluir solo urgencias canceladas
    const cancelledStatuses = new Set(['cancelled', 'cancelled_by_vet_on_time', 'cancelled_late_by_vet', 'cancelled_by_tutor']);
    if (appointment.status && cancelledStatuses.has(appointment.status)) {
      return false;
    }
    // Si tiene tracking, verificar también el estado de tracking
    if (appointment.tracking?.status === 'cancelled') {
      return false;
    }
    return true;
  }

  // Para citas normales, usar la lógica original
  const allowedAppointmentStatuses = new Set(['scheduled', 'assigned', 'in_progress', 'accepted']);
  if (appointment.status && allowedAppointmentStatuses.has(appointment.status)) {
    return true;
  }

  const trackingStatus = appointment?.tracking?.status;
  const allowedTrackingStatuses = new Set(['vet-assigned', 'on-way', 'arrived', 'in-service']);
  return trackingStatus ? allowedTrackingStatuses.has(trackingStatus) : false;
};

const dedupeConversations = (conversations, keySelector) => {
  const map = new Map();

  conversations.forEach((conversation) => {
    const key = keySelector(conversation);
    if (!key) return;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, conversation);
      return;
    }

    const existingTimestamp =
      existing.lastMessageAt || existing.updatedAt || existing.createdAt || new Date(0);
    const currentTimestamp =
      conversation.lastMessageAt ||
      conversation.updatedAt ||
      conversation.createdAt ||
      new Date(0);

    if (currentTimestamp > existingTimestamp) {
      map.set(key, conversation);
    }
  });

  return Array.from(map.values());
};

// Obtener todas las conversaciones de un usuario
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const conversations = await Conversation.find({ userId })
      .populate('vetId', 'name email profileImage specialization')
      .populate('petId', 'name image species breed')
      .populate('appointmentId', 'appointmentDate scheduledTime status tracking isEmergency')
      .sort({ lastMessageAt: -1 });

    const activeConversations = conversations.filter(isConversationActive);
    const deduped = dedupeConversations(
      activeConversations,
      (conversation) => normalizeId(conversation.vetId?._id || conversation.vetId)
    );

    return res.status(200).json({ conversations: deduped });
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    return res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
};

// Obtener todas las conversaciones de un veterinario
export const getVetConversations = async (req, res) => {
  try {
    const vetId = req.userId || req.user?.id;

    if (!vetId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const conversations = await Conversation.find({ vetId })
      .populate('userId', 'name email profileImage phoneNumber')
      .populate('petId', 'name image species breed')
      .populate('appointmentId', 'appointmentDate scheduledTime status tracking isEmergency')
      .sort({ lastMessageAt: -1 });

    const activeConversations = conversations.filter(isConversationActive);
    const deduped = dedupeConversations(
      activeConversations,
      (conversation) => normalizeId(conversation.userId?._id || conversation.userId)
    );

    return res.status(200).json({ conversations: deduped });
  } catch (error) {
    console.error('Error al obtener conversaciones de veterinario:', error);
    return res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
};

// Obtener una conversación específica con sus mensajes
export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId || req.user?.id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      $or: [{ userId }, { vetId: userId }]
    })
      .populate('userId', 'name email')
      .populate('vetId', 'name email profileImage specialization')
      .populate('petId', 'name image species breed')
      .populate('appointmentId', 'appointmentDate scheduledTime status tracking isEmergency');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    return res.status(200).json({ conversation });
  } catch (error) {
    console.error('Error al obtener conversación:', error);
    return res.status(500).json({ message: 'Error al obtener conversación' });
  }
};

// Crear o obtener una conversación existente
export const getOrCreateConversation = async (req, res) => {
  try {
    const { vetId, appointmentId, petId } = req.body;
    const userId = req.userId || req.user?.id;

    if (!userId || !vetId) {
      return res.status(400).json({ message: 'userId y vetId son requeridos' });
    }

    // Buscar conversación existente
    let conversation = await Conversation.findOne({
      userId,
      vetId,
      appointmentId: appointmentId || null
    })
      .populate('vetId', 'name email profileImage specialization')
      .populate('petId', 'name image species breed')
      .populate('appointmentId', 'appointmentDate scheduledTime status tracking isEmergency');

    // Si no existe, crear una nueva
    if (!conversation) {
      conversation = new Conversation({
        userId,
        vetId,
        appointmentId: appointmentId || null,
        petId: petId || null,
        messages: []
      });
      await conversation.save();
      
      // Populate después de guardar
      await conversation.populate('vetId', 'name email profileImage specialization');
      if (petId) {
        await conversation.populate('petId', 'name image species breed');
      }
      if (appointmentId) {
        await conversation.populate('appointmentId', 'appointmentDate scheduledTime status tracking isEmergency');
      }
    }

    return res.status(200).json({ conversation });
  } catch (error) {
    console.error('Error al crear/obtener conversación:', error);
    return res.status(500).json({ message: 'Error al crear/obtener conversación' });
  }
};

// Enviar un mensaje
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = (req.userId || req.user?.id)?.toString();
    const senderType = req.user?.role === 'Vet' ? 'Vet' : 'User';

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    // Verificar que el usuario tiene acceso a esta conversación
    if (!userId || (conversation.userId.toString() !== userId && conversation.vetId.toString() !== userId)) {
      return res.status(403).json({ message: 'No tienes acceso a esta conversación' });
    }

    // Si es una emergencia, verificar que no esté completada o cancelada
    if (conversation.appointmentId) {
      const appointment = await Appointment.findById(conversation.appointmentId).select('isEmergency status tracking');
      if (appointment?.isEmergency) {
        const appointmentStatus = appointment.status;
        const trackingStatus = appointment.tracking?.status;
        
        // Verificar si la emergencia está completada o cancelada
        if (appointmentStatus === 'completed' || trackingStatus === 'completed') {
          return res.status(403).json({ 
            message: 'No puedes enviar mensajes en una emergencia completada. El chat es de solo lectura.' 
          });
        }
        
        const cancelledStatuses = ['cancelled', 'cancelled_by_vet_on_time', 'cancelled_late_by_vet', 'cancelled_by_tutor'];
        if (cancelledStatuses.includes(appointmentStatus) || trackingStatus === 'cancelled') {
          return res.status(403).json({ 
            message: 'No puedes enviar mensajes en una emergencia cancelada. El chat es de solo lectura.' 
          });
        }
      }
    }

    // Manejar imagen si existe
    let imageUrl = null;
    if (req.file) {
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Determinar tipo de mensaje
    let messageType = 'text';
    if (imageUrl && content && content.trim()) {
      messageType = 'text_image';
    } else if (imageUrl) {
      messageType = 'image';
    }

    // Validar que haya contenido o imagen
    if ((!content || !content.trim()) && !imageUrl) {
      return res.status(400).json({ message: 'El mensaje debe tener contenido o una imagen' });
    }

    // Agregar mensaje
    const newMessage = {
      senderId: userId,
      senderType,
      content: content ? content.trim() : '',
      image: imageUrl || null,
      messageType,
      read: false,
      createdAt: new Date()
    };

    conversation.messages.push(newMessage);
    conversation.lastMessage = content ? content.trim() : (imageUrl ? 'Imagen' : '');
    conversation.lastMessageAt = new Date();

    if (senderType === 'User') {
      conversation.vetUnreadCount = (conversation.vetUnreadCount || 0) + 1;
    } else {
      conversation.userUnreadCount = (conversation.userUnreadCount || 0) + 1;
    }

    conversation.unreadCount =
      (conversation.userUnreadCount || 0) + (conversation.vetUnreadCount || 0);

    await conversation.save();

    // Populate antes de emitir eventos para que buildSummaryPayload tenga acceso a los datos
    await conversation.populate('vetId', 'name email profileImage specialization');
    await conversation.populate('userId', 'name email profileImage');

    const savedMessage = conversation.messages[conversation.messages.length - 1];
    
    // Convertir el mensaje de Mongoose a objeto plano
    const emittedMessage = {
      _id: normalizeId(savedMessage?._id || savedMessage?._id?.toString()),
      senderId: normalizeId(savedMessage?.senderId || savedMessage?.senderId?.toString()),
      senderType: savedMessage?.senderType,
      content: savedMessage?.content || '',
      image: savedMessage?.image || null,
      messageType: savedMessage?.messageType || 'text',
      read: savedMessage?.read || false,
      createdAt: savedMessage?.createdAt || new Date()
    };

    // Emitir actualización con el mensaje - buildSummaryPayload recibirá el mensaje para incluir info del remitente
    await emitConversationUpdate(req, conversation, {
      message: emittedMessage
    });

    return res.status(200).json({ 
      message: emittedMessage,
      conversation: {
        _id: conversation._id,
        userId: conversation.userId,
        vetId: conversation.vetId,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        userUnreadCount: conversation.userUnreadCount,
        vetUnreadCount: conversation.vetUnreadCount
      }
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return res.status(500).json({ message: 'Error al enviar mensaje' });
  }
};

// Marcar mensajes como leídos
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = (req.userId || req.user?.id)?.toString();
    const role = req.user?.role || 'User';

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    // Marcar mensajes del otro usuario como leídos
    conversation.messages.forEach(msg => {
      if (msg.senderId.toString() !== userId) {
        msg.read = true;
      }
    });

    if (role === 'Vet') {
      conversation.vetUnreadCount = 0;
    } else {
      conversation.userUnreadCount = 0;
    }
    conversation.unreadCount =
      (conversation.userUnreadCount || 0) + (conversation.vetUnreadCount || 0);
    await conversation.save();

    await emitConversationUpdate(req, conversation);

    return res.status(200).json({ message: 'Mensajes marcados como leídos' });
  } catch (error) {
    console.error('Error al marcar como leído:', error);
    return res.status(500).json({ message: 'Error al marcar como leído' });
  }
};

