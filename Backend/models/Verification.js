import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Puede ser null si es verificación previa al registro
  },
  rut: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: [
      'PENDING_DOCUMENT_FRONT',
      'PENDING_DOCUMENT_BACK',
      'PENDING_LIVENESS',
      'VERIFIED',
      'REJECTED_DOC',
      'REJECTED_LIVENESS',
      'REJECTED_FACE_MISMATCH',
      'PENDING_REVIEW'
    ],
    default: 'PENDING_DOCUMENT_FRONT'
  },
  docData: {
    frontImageUrl: String,
    backImageUrl: String,
    selfieUrl: String,
    // Datos extraídos del OCR - Frente
    fullName: String,
    firstNames: String,
    lastNames: String,
    rut: String,
    issueDate: Date,
    expiryDate: Date,
    docNumber: String,
    nationality: String,
    birthDate: Date,
    sex: String,
    // Datos extraídos del OCR - Reverso
    maritalStatus: String,
    address: String,
    commune: String,
    region: String,
    folio: String,
    serie: String,
    profession: String,
    visa: String, // Para extranjeros
    isExtranjero: Boolean,
    hasMRZ: Boolean,
    mrz: String, // Machine Readable Zone
    hasQRCode: Boolean
  },
  embeddings: {
    idCardFront: [Number], // Vector de embedding facial de la cédula
    selfie: [Number] // Vector de embedding facial del selfie
  },
  scores: {
    liveness: {
      type: Number,
      min: 0,
      max: 1
    },
    faceMatch: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

verificationSchema.index({ userId: 1 });
verificationSchema.index({ rut: 1 });
verificationSchema.index({ status: 1 });
verificationSchema.index({ createdAt: -1 });

const Verification = mongoose.model('Verification', verificationSchema);

export default Verification;

