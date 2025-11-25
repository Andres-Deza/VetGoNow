import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

const setupConversationSocket = (io) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.use((socket, next) => {
    try {
      const { token } = socket.handshake.auth || {};
      if (!token) {
        return next(new Error('Token requerido'));
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.data.user = {
        id: decoded.id || decoded._id,
        role: decoded.role
      };
      return next();
    } catch (error) {
      return next(new Error('Autenticación de socket inválida'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    const user = socket.data?.user;

    if (user?.id) {
      // Normalizar el ID a string para consistencia
      const userId = user.id.toString();
      const roomKey = user.role === 'Vet' ? `vet:${userId}` : `user:${userId}`;
      socket.join(roomKey);
      console.log(`Socket conectado y unido a sala: ${roomKey} (usuario: ${userId}, rol: ${user.role})`);
    }

    socket.on('join:user', (userId) => {
      if (userId) {
        const normalizedId = userId.toString();
        socket.join(`user:${normalizedId}`);
        console.log(`Socket unido manualmente a sala user:${normalizedId}`);
      }
    });

    socket.on('join:vet', (vetId) => {
      if (vetId) {
        const normalizedId = vetId.toString();
        socket.join(`vet:${normalizedId}`);
        console.log(`Socket unido manualmente a sala vet:${normalizedId}`);
      }
    });

    socket.on('join:conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('leave:conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });
  });

  return chatNamespace;
};

export default setupConversationSocket;

