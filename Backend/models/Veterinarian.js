import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // For password hashing

const verificationStatusEnum = ['pending', 'verified', 'rejected'];

const VetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "Vet" },
  isApproved: { type: Boolean, default: false },

  nationalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  nationalIdDocument: {
    type: String,
    default: null
  },

  faceVerificationImage: {
    type: String,
    default: null
  },

  // Nuevas imágenes de verificación de identidad (cédula frontal y reverso)
  frontIdImage: {
    type: String,
    default: null
  },

  backIdImage: {
    type: String,
    default: null
  },

  verificationStatus: {
    type: String,
    enum: verificationStatusEnum,
    default: 'pending'
  },

  verificationMetadata: {
    checkedAt: { type: Date },
    checkedBy: { type: String },
    notes: { type: String }
  },

  profileImage: {
    type: String,
    default: "https://ui-avatars.com/api/?name=Vet&background=0EA5E9&color=FFFFFF"
  },

  specialization: { type: String },
  experience: { type: Number },
  qualifications: { type: String },
  region: { type: String },
  comuna: { type: String },

  // Servicios ofrecidos para el futuro mapa tipo Uber
  // NOTA: 'consultas' solo está disponible para clínicas (vetType === 'clinic')
  services: {
    type: [String],
    enum: ['consultas', 'video-consultas', 'a-domicilio'],
    default: []
  },

  // Flags operativos
  supportsEmergency: { type: Boolean, default: false },
  availableNow: { type: Boolean, default: false },
  teleconsultationsEnabled: { type: Boolean, default: false }, // Habilitar/deshabilitar teleconsultas
  
  // Estado actual del veterinario
  currentStatus: {
    type: String,
    enum: ['available', 'busy', 'on-way', 'offline'],
    default: 'offline'
  },
  
  // Emergencia activa actual (si está ocupado)
  activeEmergency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  
  // Calificaciones y reseñas
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    total: { type: Number, default: 0 },
    showAverage: { type: Boolean, default: false }, // Solo mostrar promedio si hay 5+ calificaciones
    breakdown: {
      punctuality: { type: Number, default: 0 },
      professionalism: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      care: { type: Number, default: 0 }
    }
  },

  // Confiabilidad y cancelaciones
  reliability: {
    totalLateCancellations: { type: Number, default: 0 },
    totalNoShows: { type: Number, default: 0 },
    totalOnTimeCancellations: { type: Number, default: 0 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 }, // Score de 0-100
    // Estadísticas de urgencias
    totalEmergencyRejections: { type: Number, default: 0 }, // Rechazos antes de aceptar (sin penalización)
    totalEmergencyIncidents: { type: Number, default: 0 }, // Incidentes después de aceptar (con penalización)
    totalEmergencyFailures: { type: Number, default: 0 } // Fallas totales (no llegó, no recibió, etc.)
  },
  
  // Ubicación actual en tiempo real (para tracking cuando está en camino)
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined
    },
    lastUpdate: { type: Date }
  },
  
  // Tipo de veterinario: 'clinic' (clínica) o 'independent' (veterinario independiente)
  vetType: {
    type: String,
    enum: ['clinic', 'independent'],
    default: 'independent'
  },
  
  // Rol en la plataforma: 'VET_INDEPENDIENTE' o 'CLINICA'
  platformRole: {
    type: String,
    enum: ['VET_INDEPENDIENTE', 'CLINICA'],
    default: 'VET_INDEPENDIENTE'
  },
  
  // ========== CAMPOS PARA VETERINARIO INDEPENDIENTE ==========
  // Nombre profesional a mostrar
  professionalName: { type: String },
  // RUT profesional (normalmente igual a nationalId)
  professionalRut: { type: String },
  // Teléfono de contacto visible para tutores
  contactPhone: { type: String },
  // Email de contacto para tutores
  contactEmail: { type: String },
  // Modalidades de atención (domicilio, teleconsulta)
  serviceModalities: {
    type: [String],
    enum: ['domicilio', 'teleconsulta'],
    default: []
  },
  // Comunas de cobertura para visitas a domicilio
  coverageCommunes: { type: [String], default: [] },
  // Radio de cobertura en km
  coverageRadius: { type: Number },
  // Especialidades
  specialties: { type: [String], default: [] },
  // Descripción del perfil
  profileDescription: { type: String },
  
  // ========== CAMPOS PARA CLÍNICA VETERINARIA ==========
  // RUT de la clínica
  clinicRut: { type: String },
  // Razón social
  legalName: { type: String },
  // Nombre de fantasía
  tradeName: { type: String },
  // Teléfono fijo de la clínica
  clinicPhone: { type: String },
  // Teléfono móvil de la clínica
  clinicMobile: { type: String },
  // Email de la clínica
  clinicEmail: { type: String },
  // Sitio web
  website: { type: String },
  // Redes sociales
  socialMedia: {
    instagram: { type: String },
    facebook: { type: String },
    other: { type: String }
  },
  // Dirección del establecimiento
  clinicAddress: {
    street: { type: String },
    number: { type: String },
    commune: { type: String },
    region: { type: String },
    reference: { type: String },
    // Coordenadas se guardan en location.coordinates
  },
  // Responsable técnico
  technicalResponsible: {
    name: { type: String },
    rut: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  // Rol del usuario que se registra
  userRole: {
    type: String,
    enum: ['representante_legal', 'administrador_autorizado'],
    default: null
  },
  // Servicios presenciales
  inPersonServices: {
    type: [String],
    enum: ['consulta', 'vacunas', 'cirugia', 'hospitalizacion', 'imagenologia', 'laboratorio', 'otros'],
    default: []
  },
  // ¿Ofrece urgencias presenciales?
  supportsInPersonEmergency: { type: Boolean, default: false },
  // Modalidades adicionales (domicilio, teleconsulta)
  additionalModalities: {
    type: [String],
    enum: ['domicilio', 'teleconsulta'],
    default: []
  },
  
  // ========== DOCUMENTOS ==========
  // Documentos para veterinario independiente
  siiActivityStartDocument: { type: String }, // Inicio de actividades SII
  // Documentos para clínica
  municipalLicenseDocument: { type: String }, // Patente municipal
  technicalResponsibleTitleDocument: { type: String }, // Título del responsable técnico
  representationDocument: { type: String }, // Documento de representación (opcional)
  seremiAuthorization: { type: String }, // Autorización SEREMI (rayos X) (opcional)
  sagAuthorization: { type: String }, // Autorización SAG (farmacia) (opcional)
  clinicPhotos: [{ type: String }], // Fotos de la clínica (opcional)
  
  // ========== DECLARACIONES ==========
  declarations: {
    acceptedTerms: { type: Boolean, default: false },
    acceptedPrivacy: { type: Boolean, default: false },
    informationIsTruthful: { type: Boolean, default: false },
    hasAuthorization: { type: Boolean, default: false } // Solo para clínicas
  },
  
  // Precio base personalizado (opcional, si no se especifica usa el del sistema)
  basePrice: {
    type: Number,
    default: null // null = usar precio por defecto según tipo
  },

  // Ubicación geográfica (GeoJSON Point) para mapa y búsquedas cercanas
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined
    }
  },

  // Certificate field (e.g. URL or file path)
  certificate: {
    type: String,
    default: null,
  },

  verificationLogs: [
    {
      status: { type: String, enum: verificationStatusEnum },
      timestamp: { type: Date, default: Date.now },
      detail: { type: String }
    }
  ],
  
  // Campos para restablecimiento de contraseña
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // Horarios de atención (0=Domingo ... 6=Sábado)
  openingHours: [
    {
      day: { type: Number, min: 0, max: 6, required: true },
      open: { type: String },   // "HH:mm"
      close: { type: String },  // "HH:mm"
      open24h: { type: Boolean, default: false },
    }
  ],
  // Si está siempre 24/7
  alwaysOpen24h: { type: Boolean, default: false },
  
  // Información bancaria para pagos
  bankAccount: {
    accountNumber: { type: String, default: null },
    accountType: { 
      type: String, 
      enum: ['checking', 'savings'], 
      default: null 
    },
    bankName: { type: String, default: null },
    accountHolderName: { type: String, default: null },
    rut: { type: String, default: null }, // RUT del titular de la cuenta
    // Fecha de última actualización
    updatedAt: { type: Date }
  }
});

// Índice geoespacial
VetSchema.index({ location: '2dsphere' });


// Hash password before saving
VetSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const Vet = mongoose.model("Vet", VetSchema, "veterinarians");

export default Vet;
