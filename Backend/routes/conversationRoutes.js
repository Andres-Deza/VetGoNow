import express from 'express';
import multer from 'multer';
import {
  getUserConversations,
  getVetConversations,
  getConversationById,
  getOrCreateConversation,
  sendMessage,
  markAsRead
} from '../controllers/conversationController.js';
import { authenticate } from '../middleware/authmiddleware.js';

const conversationRouter = express.Router();

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `message-${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// Obtener todas las conversaciones del usuario autenticado
conversationRouter.get('/user', authenticate, getUserConversations);

// Obtener todas las conversaciones del veterinario autenticado
conversationRouter.get('/vet', authenticate, getVetConversations);

// Obtener una conversación específica
conversationRouter.get('/:conversationId', authenticate, getConversationById);

// Crear o obtener una conversación existente
conversationRouter.post('/create', authenticate, getOrCreateConversation);

// Enviar un mensaje (con soporte para imágenes)
conversationRouter.post('/:conversationId/message', authenticate, upload.single('image'), sendMessage);

// Marcar mensajes como leídos
conversationRouter.put('/:conversationId/read', authenticate, markAsRead);

export default conversationRouter;

