// prescription.js (or appointment.js if you prefer)
import mongoose from 'mongoose';

const prescribeSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true }, // ADD THIS
  petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vetId: { type: mongoose.Schema.Types.ObjectId, ref: "Vet", required: true },
  appointmentDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },

  prescription: {
    symptoms: { type: String, default: '' },
    medication: { type: String, default: '' },
    dosage: { type: String, default: '' },
    instructions: { type: String, default: '' },
  }
}, {
  timestamps: true,
});

// Export the model
const Prescribe = mongoose.model("Prescribe", prescribeSchema,"prescriptions");
export default Prescribe;
