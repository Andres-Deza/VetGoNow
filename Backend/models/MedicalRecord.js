import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Tipo de registro
  recordType: {
    type: String,
    enum: ['consultation', 'surgery', 'treatment', 'diagnosis', 'other'],
    required: true
  },
  
  // Información del registro
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  
  // Diagnóstico/Patologías
  diagnosis: [{ type: String }], // Array de diagnósticos/patologías
  symptoms: [{ type: String }], // Síntomas observados
  
  // Tratamiento
  treatment: { type: String },
  medications: [{ 
    name: String,
    dosage: String,
    duration: String
  }],
  
  // Información del veterinario
  vetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Veterinarian' },
  vetName: { type: String },
  
  // Si está asociado a una cita o receta
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescribe' },
  
  // Archivos adjuntos (imágenes, documentos)
  attachments: [{ type: String }], // URLs de archivos
  
  // Peso del animal en esta fecha (útil para seguimiento)
  weightAtTime: { type: Number },
  
}, { timestamps: true });

// Índices
medicalRecordSchema.index({ petId: 1, date: -1 });
medicalRecordSchema.index({ userId: 1 });
medicalRecordSchema.index({ diagnosis: 1 }); // Para búsqueda por patología

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema, 'medical_records');
export default MedicalRecord;

