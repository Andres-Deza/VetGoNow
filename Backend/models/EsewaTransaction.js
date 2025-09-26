import mongoose from 'mongoose';

const esewaTransactionSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  pid: { type: String, required: true, unique: true }, // Booking/payment UUID
  status: { type: String, enum: ['Success', 'Failure'], required: true },
  amount: { type: Number, required: true },
  raw: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const EsewaTransaction= mongoose.model('EsewaTransaction', esewaTransactionSchema,"payments");
export default EsewaTransaction;
