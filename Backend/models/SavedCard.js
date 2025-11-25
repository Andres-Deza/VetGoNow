import mongoose from 'mongoose';

const savedCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Proveedor de pago: solo 'mercadopago'
  provider: {
    type: String,
    enum: ['mercadopago'],
    required: true,
    default: 'mercadopago'
  },
  // ID del cliente en el proveedor (Stripe Customer ID o MercadoPago Customer ID)
  customerId: {
    type: String,
    required: true,
    index: true
  },
  // ID del método de pago en el proveedor
  paymentMethodId: {
    type: String,
    required: true
  },
  // Información de la tarjeta (últimos 4 dígitos, marca, etc.)
  cardInfo: {
    last4: {
      type: String,
      required: true
    },
    brand: {
      type: String, // visa, mastercard, amex, etc.
      required: true
    },
    expMonth: {
      type: Number,
      required: false
    },
    expYear: {
      type: Number,
      required: false
    },
    funding: {
      type: String, // credit, debit, prepaid
      default: 'credit'
    }
  },
  // Nombre del titular de la tarjeta (opcional)
  cardholderName: {
    type: String,
    default: ''
  },
  // Si es la tarjeta predeterminada
  isDefault: {
    type: Boolean,
    default: false
  },
  // Estado de la tarjeta
  isActive: {
    type: Boolean,
    default: true
  },
  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice para búsquedas rápidas
savedCardSchema.index({ userId: 1, isActive: 1 });
savedCardSchema.index({ userId: 1, isDefault: 1 });
savedCardSchema.index({ userId: 1, provider: 1 });
// Índice único para tarjetas del mismo usuario (evita duplicados por usuario)
// Nota: El índice único se maneja a nivel de aplicación al verificar tarjetas activas
savedCardSchema.index({ userId: 1, paymentMethodId: 1, provider: 1 });


// Método para obtener el nombre de la tarjeta
savedCardSchema.virtual('displayName').get(function() {
  const brand = this.cardInfo.brand.charAt(0).toUpperCase() + this.cardInfo.brand.slice(1);
  return `${brand} •••• ${this.cardInfo.last4}`;
});

const SavedCard = mongoose.model('SavedCard', savedCardSchema, 'saved_cards');
export default SavedCard;

