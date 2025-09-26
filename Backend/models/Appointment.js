import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vet', required: true },
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  appointmentDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  isPaid: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'scheduled', 'completed', 'cancelled'], default: 'pending' },
  appointmentType: { type: String, enum: ['clinic visit', 'online consultation'], default: 'clinic visit' }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema, 'appointments');
export default Appointment;
