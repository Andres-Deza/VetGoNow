import mongoose from 'mongoose';

const webpayTransactionSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  buyOrder: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'Success', 'Failed', 'Refunded'], required: true },
  amount: { type: Number, required: true },
  url: { type: String },
  responseCode: { type: String },
  authorizationCode: { type: String },
  rawResponse: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const WebpayTransaction = mongoose.model('WebpayTransaction', webpayTransactionSchema, 'webpay_transactions');
export default WebpayTransaction;
