import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vet',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: false // Opcional, puede haber conversaciones sin cita
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: false
  },
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'messages.senderType'
    },
    senderType: {
      type: String,
      enum: ['User', 'Vet'],
      required: true
    },
    content: {
      type: String,
      required: false
    },
    image: {
      type: String,
      required: false
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'text_image'],
      default: 'text'
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  userUnreadCount: {
    type: Number,
    default: 0
  },
  vetUnreadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índice para búsquedas rápidas
conversationSchema.index({ userId: 1, vetId: 1 });
conversationSchema.index({ appointmentId: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema, 'conversations');
export default Conversation;

