import Vet from "../models/Veterinarian.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { JWT_SECRET } from "../config.js";
import fs from "fs";

const canonicalizeRut = (rut = "") => {
  const cleaned = rut.toString().toUpperCase().replace(/[^0-9K]/g, "");
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return `${body}-${dv}`;
};

const validateChileanRUT = (rutWithDv = "") => {
  const cleaned = rutWithDv.replace(/[^0-9K]/g, "");
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  let dvExpected = "";
  if (expected === 11) dvExpected = "0";
  else if (expected === 10) dvExpected = "K";
  else dvExpected = expected.toString();

  return dvExpected === dv;
};

const buildFileUrl = (req, file) =>
  file ? `${req.protocol}://${req.get("host")}/uploads/${file.filename}` : null;

const appendVerificationLog = (vetDoc, status, detail) => {
  vetDoc.verificationLogs = vetDoc.verificationLogs || [];
  vetDoc.verificationLogs.push({
    status,
    detail
  });
};

const automateVerification = (vetDoc) => {
  const validations = {
    rutValid: validateChileanRUT(vetDoc.nationalId || ""),
    hasCertificate: Boolean(vetDoc.certificate),
    hasIdentityDoc: Boolean(vetDoc.nationalIdDocument),
    hasFaceImage: Boolean(vetDoc.faceVerificationImage)
  };

  const didPass =
    validations.rutValid &&
    validations.hasCertificate &&
    validations.hasIdentityDoc &&
    validations.hasFaceImage;

  if (didPass) {
    vetDoc.verificationStatus = "verified";
    vetDoc.isApproved = true;
    vetDoc.verificationMetadata = {
      checkedAt: new Date(),
      checkedBy: "Automated Vet Validation",
      notes: "Validación automática exitosa."
    };
    appendVerificationLog(vetDoc, "verified", "Validación automática completada correctamente.");
  } else {
    vetDoc.verificationStatus = "rejected";
    vetDoc.isApproved = false;
    vetDoc.verificationMetadata = {
      checkedAt: new Date(),
      checkedBy: "Automated Vet Validation",
      notes: `Validación rechazada. Resultados: ${JSON.stringify(validations)}`
    };
    appendVerificationLog(
      vetDoc,
      "rejected",
      `No se cumplieron todos los requisitos de validación automática: ${JSON.stringify(validations)}`
    );
  }
};

const removeTempFileIfNeeded = (file) => {
  if (file?.path) {
    fs.unlink(file.path, () => {});
  }
};

// API to Register Veterinarian
export const registerVet = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      password,
      specialization,
      experience,
      qualifications,
      region,
      comuna,
      services,
      lat,
      lng,
      supportsEmergency,
      availableNow,
      vetType,
      basePrice,
      nationalId
    } = req.body;

    const files = req.files || {};
    const profileImageFile = files.profileImage?.[0];
    const certificateFile = files.certificate?.[0];
    const nationalIdDocumentFile = files.nationalIdDocument?.[0];
    const faceImageFile = files.faceImage?.[0];
    const frontIdImageFile = files.frontIdImage?.[0];
    const backIdImageFile = files.backIdImage?.[0];

    if (!name || !email || !password || !phoneNumber || !nationalId) {
      removeTempFileIfNeeded(profileImageFile);
      removeTempFileIfNeeded(certificateFile);
      removeTempFileIfNeeded(nationalIdDocumentFile);
      removeTempFileIfNeeded(faceImageFile);
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios para el registro."
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email inválido." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 8 caracteres." });
    }

    const normalizedNationalId = canonicalizeRut(nationalId);
    if (!validateChileanRUT(normalizedNationalId)) {
      return res.status(400).json({
        success: false,
        message: "El RUT ingresado no es válido."
      });
    }

    const existingByEmail = await Vet.findOne({ email });
    if (existingByEmail) {
      return res.status(400).json({ success: false, message: "Ya existe un veterinario registrado con este correo." });
    }

    const existingByRut = await Vet.findOne({ nationalId: normalizedNationalId });
    if (existingByRut) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un veterinario registrado con este RUT."
      });
    }

    // Validar que se hayan subido los documentos necesarios
    // Verificación de identidad temporalmente deshabilitada (bypass)
    // Aceptar tanto el método antiguo (faceImage) como el nuevo (frontIdImage + backIdImage + faceImage)
    const hasOldMethod = faceImageFile;
    const hasNewMethod = frontIdImageFile && backIdImageFile && faceImageFile;
    
    // Solo validar certificado y documento de identidad (verificación de identidad opcional)
    if (!certificateFile || !nationalIdDocumentFile) {
      removeTempFileIfNeeded(profileImageFile);
      removeTempFileIfNeeded(certificateFile);
      removeTempFileIfNeeded(nationalIdDocumentFile);
      removeTempFileIfNeeded(faceImageFile);
      removeTempFileIfNeeded(frontIdImageFile);
      removeTempFileIfNeeded(backIdImageFile);
      return res.status(400).json({
        success: false,
        message: "Debes subir certificado y documento de identidad."
      });
    }

    const profileImage = profileImageFile
      ? buildFileUrl(req, profileImageFile)
      : "https://ui-avatars.com/api/?name=Vet&background=0EA5E9&color=FFFFFF";
    const certificate = buildFileUrl(req, certificateFile);
    const nationalIdDocument = buildFileUrl(req, nationalIdDocumentFile);
    // Verificación de identidad temporalmente deshabilitada (bypass)
    const faceVerificationImage = faceImageFile ? buildFileUrl(req, faceImageFile) : null;
    // Nuevas imágenes de verificación de identidad (opcionales)
    const frontIdImage = frontIdImageFile ? buildFileUrl(req, frontIdImageFile) : null;
    const backIdImage = backIdImageFile ? buildFileUrl(req, backIdImageFile) : null;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Parsear servicios y validar según tipo
    let normalizedServices = [];
    if (services) {
      let parsedServices = [];
      if (Array.isArray(services)) {
        parsedServices = services;
      } else if (typeof services === "string") {
        try {
          parsedServices = JSON.parse(services);
        } catch {
          parsedServices = services.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      const allowed = ["consultas", "video-consultas", "a-domicilio"];
      normalizedServices = parsedServices.filter((s) => allowed.includes(s));
    }
    
    // Validar que solo clínicas puedan ofrecer consultas presenciales
    const isClinic = vetType === 'clinic';
    if (!isClinic && normalizedServices.includes('consultas')) {
      return res.status(400).json({
        success: false,
        message: "Solo las clínicas veterinarias pueden ofrecer consultas presenciales."
      });
    }

    // Parsear campos JSON del body
    let declarationsData = {};
    try {
      if (req.body.declarations) {
        declarationsData = typeof req.body.declarations === 'string' 
          ? JSON.parse(req.body.declarations) 
          : req.body.declarations;
      }
    } catch (e) {
      console.error("Error parsing declarations:", e);
    }

    // Procesar archivos adicionales
    // usar 'files' ya declarado previamente en este handler
    const siiActivityStartFile = files.siiActivityStartDocument?.[0];
    const municipalLicenseFile = files.municipalLicenseDocument?.[0];
    const technicalResponsibleTitleFile = files.technicalResponsibleTitleDocument?.[0];
    const representationFile = files.representationDocument?.[0];
    const seremiFile = files.seremiAuthorization?.[0];
    const sagFile = files.sagAuthorization?.[0];
    const clinicPhotoFiles = Object.keys(files)
      .filter(key => key.startsWith('clinicPhoto_'))
      .map(key => files[key][0])
      .filter(Boolean);

    // Construir objeto base
    const vetData = {
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      profileImage,
      specialization,
      experience,
      qualifications,
      region,
      comuna,
      services: normalizedServices,
      location: lat && lng ? { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] } : undefined,
      certificate,
      supportsEmergency: String(supportsEmergency) === "true" || supportsEmergency === true,
      availableNow: String(availableNow) === "true" || availableNow === true,
      vetType: vetType || "independent",
      platformRole: isClinic ? "CLINICA" : "VET_INDEPENDIENTE",
      basePrice: basePrice || null,
      nationalId: normalizedNationalId,
      nationalIdDocument,
      faceVerificationImage,
      frontIdImage,
      backIdImage,
      declarations: declarationsData
    };

    // Agregar campos específicos según tipo
    if (isClinic) {
      // Parsear datos de clínica
      let clinicAddressData = {};
      let technicalResponsibleData = {};
      let socialMediaData = {};
      
      try {
        if (req.body.clinicAddress) {
          clinicAddressData = typeof req.body.clinicAddress === 'string' 
            ? JSON.parse(req.body.clinicAddress) 
            : req.body.clinicAddress;
        }
        if (req.body.technicalResponsible) {
          technicalResponsibleData = typeof req.body.technicalResponsible === 'string' 
            ? JSON.parse(req.body.technicalResponsible) 
            : req.body.technicalResponsible;
        }
        if (req.body.socialMedia) {
          socialMediaData = typeof req.body.socialMedia === 'string' 
            ? JSON.parse(req.body.socialMedia) 
            : req.body.socialMedia;
        }
      } catch (e) {
        console.error("Error parsing clinic data:", e);
      }

      let inPersonServicesParsed = [];
      let additionalModalitiesParsed = [];
      let openingHoursParsed = [];
      
      try {
        if (req.body.inPersonServices) {
          inPersonServicesParsed = typeof req.body.inPersonServices === 'string' 
            ? JSON.parse(req.body.inPersonServices) 
            : req.body.inPersonServices;
        }
        if (req.body.additionalModalities) {
          additionalModalitiesParsed = typeof req.body.additionalModalities === 'string' 
            ? JSON.parse(req.body.additionalModalities) 
            : req.body.additionalModalities;
        }
        if (req.body.openingHours) {
          openingHoursParsed = typeof req.body.openingHours === 'string' 
            ? JSON.parse(req.body.openingHours) 
            : req.body.openingHours;
        }
      } catch (e) {
        console.error("Error parsing clinic services:", e);
      }

      vetData.clinicRut = req.body.clinicRut;
      vetData.legalName = req.body.legalName;
      vetData.tradeName = req.body.tradeName;
      vetData.clinicPhone = req.body.clinicPhone;
      vetData.clinicMobile = req.body.clinicMobile;
      vetData.clinicEmail = req.body.clinicEmail;
      vetData.website = req.body.website;
      vetData.socialMedia = socialMediaData;
      vetData.clinicAddress = clinicAddressData;
      vetData.technicalResponsible = technicalResponsibleData;
      vetData.userRole = req.body.userRole;
      vetData.inPersonServices = inPersonServicesParsed;
      vetData.supportsInPersonEmergency = String(req.body.supportsInPersonEmergency) === "true";
      vetData.additionalModalities = additionalModalitiesParsed;
      vetData.openingHours = openingHoursParsed;
      
      // Documentos de clínica
      if (municipalLicenseFile) {
        vetData.municipalLicenseDocument = buildFileUrl(req, municipalLicenseFile);
      }
      if (technicalResponsibleTitleFile) {
        vetData.technicalResponsibleTitleDocument = buildFileUrl(req, technicalResponsibleTitleFile);
      }
      if (representationFile) {
        vetData.representationDocument = buildFileUrl(req, representationFile);
      }
      if (seremiFile) {
        vetData.seremiAuthorization = buildFileUrl(req, seremiFile);
      }
      if (sagFile) {
        vetData.sagAuthorization = buildFileUrl(req, sagFile);
      }
      if (clinicPhotoFiles.length > 0) {
        vetData.clinicPhotos = clinicPhotoFiles.map(file => buildFileUrl(req, file));
      }
    } else {
      // Campos para veterinario independiente
      let serviceModalitiesParsed = [];
      let coverageCommunesParsed = [];
      let specialtiesParsed = [];
      
      try {
        if (req.body.serviceModalities) {
          serviceModalitiesParsed = typeof req.body.serviceModalities === 'string' 
            ? JSON.parse(req.body.serviceModalities) 
            : req.body.serviceModalities;
        }
        if (req.body.coverageCommunes) {
          coverageCommunesParsed = typeof req.body.coverageCommunes === 'string' 
            ? JSON.parse(req.body.coverageCommunes) 
            : req.body.coverageCommunes;
        }
        if (req.body.specialties) {
          specialtiesParsed = typeof req.body.specialties === 'string' 
            ? JSON.parse(req.body.specialties) 
            : req.body.specialties;
        }
      } catch (e) {
        console.error("Error parsing independent vet data:", e);
      }

      vetData.professionalName = req.body.professionalName;
      
      // Para veterinario independiente, professionalRut DEBE ser igual a nationalId
      const incomingProfessionalRut = req.body.professionalRut ? canonicalizeRut(req.body.professionalRut) : null;
      if (incomingProfessionalRut && incomingProfessionalRut !== normalizedNationalId) {
        return res.status(400).json({
          success: false,
          message: "Para veterinarios independientes, el RUT profesional debe ser igual a tu RUT personal."
        });
      }
      vetData.professionalRut = normalizedNationalId; // Forzar que sea igual al nationalId
      
      // Para veterinario independiente, teléfono y email de contacto son los mismos de la cuenta
      vetData.contactPhone = req.body.contactPhone || req.body.phoneNumber;
      vetData.contactEmail = req.body.contactEmail || req.body.email;
      vetData.serviceModalities = serviceModalitiesParsed;
      vetData.coverageCommunes = coverageCommunesParsed;
      vetData.coverageRadius = req.body.coverageRadius ? parseFloat(req.body.coverageRadius) : null;
      vetData.specialties = specialtiesParsed;
      vetData.profileDescription = req.body.profileDescription;
      
      // Veterinarios independientes NO pueden ofrecer urgencias presenciales (solo clínicas)
      vetData.supportsInPersonEmergency = false;
      
      // Documentos de independiente
      if (siiActivityStartFile) {
        vetData.siiActivityStartDocument = buildFileUrl(req, siiActivityStartFile);
      }
    }

    const newVet = new Vet(vetData);

    automateVerification(newVet);

    const savedVet = await newVet.save();

    const token = jwt.sign(
      { id: savedVet._id, role: savedVet.role },
      JWT_SECRET,
      { expiresIn: "3d" }
    );

    res.status(201).json({
      success: true,
      message:
        savedVet.verificationStatus === "verified"
          ? "¡Registro exitoso! Validación automática completada."
          : "Registro recibido, tu validación requiere revisión manual.",
      token,
      verificationStatus: savedVet.verificationStatus
    });
  } catch (error) {
    console.error("Server Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Verificación de selfie en tiempo real (recibe frames + score desde el cliente)
export const verifySelfieEvidence = async (req, res) => {
  try {
    // score enviado por el cliente (liveness básico)
    const clientScore = parseFloat(req.body?.score || '0');

    // archivos capturados (hasta 3 frames)
    const files = req.files || {};
    const frames = (files.frames || []).slice(0, 3);

    if (!frames.length) {
      return res.status(400).json({ success: false, message: 'No se recibieron frames de selfie.' });
    }

    // Umbral mínimo (ajustable). Con IA real, esto se reemplaza por embeddings.
    const MIN_SCORE = 3; // diferencia promedio mínima entre frames (proxy de movimiento)
    const passed = clientScore >= MIN_SCORE;

    // Construir URLs accesibles para auditoría (opcional)
    const evidenceUrls = frames.map((f) => buildFileUrl(req, f));

    return res.status(200).json({
      success: true,
      passed,
      score: clientScore,
      evidence: evidenceUrls,
      message: passed
        ? 'Verificación de presencia básica aprobada.'
        : 'No se detectó movimiento suficiente. Intenta nuevamente.',
    });
  } catch (error) {
    console.error('Error verifying selfie evidence:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


// Get all veterinarians
export const getVets = async (req, res) => {
    try {
        const vets = await Vet.find().select("-password"); // Exclude password
        res.status(200).json(vets);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching veterinarians", error: error.message });
    }
};

// Get veterinarian by ID
export const getVetById = async (req, res) => {
    try {
        const vet = await Vet.findById(req.params.id).select("-password");
        if (!vet) {
            return res.status(404).json({ success: false, message: "Veterinarian not found" });
        }
        res.status(200).json(vet);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching veterinarian", error: error.message });
    }
};

// @desc    Get all vets
// @route   GET /api/vets/allvets
// @access  Private/Admin
export const getAllVets = async (req, res) => {
  try {
    console.log("📥 Request to GET /api/vets/role/vet received");
    console.log("Authenticated Admin:", req.user); // Assuming you're using protect middleware

    // Obtener todos los veterinarios con información completa para el admin
    const vets = await Vet.find().select('-password'); // Excluir password por seguridad
    console.log("Total vets found:", vets.length);

    vets.forEach((vet, i) => {
      console.log(`🔹 Vet ${i + 1}:`, {
        id: vet._id,
        name: vet.name,
        email: vet.email,
        phone: vet.phoneNumber,
        approved: vet.isApproved,
        verificationStatus: vet.verificationStatus,
        vetType: vet.vetType
      });
    });

    res.status(200).json({ vets });
  } catch (error) {
    console.error('Error fetching vets:', error.message);
    res.status(500).json({ message: 'Server error fetching vets' });
  }
};


// @desc    Approve a vet
// @route   PUT /api/vets/:id/approve
// @access  Private/Admin
export const approveVet = async (req, res) => {
  try {
    const vet = await Vet.findById(req.params.id);
    if (!vet) {
      return res.status(404).json({ message: 'Vet not found' });
    }

    vet.isApproved = true;
    await vet.save();

    res.status(200).json({ vet });
  } catch (error) {
    console.error('Error approving vet:', error);
    res.status(500).json({ message: 'Failed to approve vet' });
  }
};

// @desc    Delete a vet
// @route   DELETE /api/vets/:id
// @access  Private/Admin
export const deleteVet = async (req, res) => {
  try {
    const vet = await Vet.findByIdAndDelete(req.params.id);
    if (!vet) {
      return res.status(404).json({ message: 'Vet not found' });
    }

    res.status(200).json({ message: 'Vet removed successfully' });
  } catch (error) {
    console.error('Error deleting vet:', error);
    res.status(500).json({ message: 'Failed to delete vet' });
  }
};

import Appointment from '../models/Appointment.js'; // adjust path as needed

// @desc    Get total appointments for a vet
// @route   GET /api/vets/:id/appointments/count
// @access  Private/Admin (or adjust based on your auth)
export const getAppointmentCountByVet = async (req, res) => {
  try {
    const vetId = req.params.id;
    console.log(`📥 Received request to get appointment count for vet ID: ${vetId}`);

    const totalAppointments = await Appointment.countDocuments({ vetId: vetId });
    console.log(`Total appointments found for vet ${vetId}: ${totalAppointments}`);

    res.status(200).json({ totalAppointments });
  } catch (error) {
    console.error('Error fetching appointment count:', error);
    res.status(500).json({ message: 'Server error fetching appointment count' });
  }
};

//vet name using the id of the vet
export const getVetNameById = async (req, res) => {
  try {
    let { vetId } = req.params;

    // Handle if vetId comes as an object accidentally
    if (typeof vetId === 'object' && vetId.$oid) {
      vetId = vetId.$oid;
    }



    if (!vetId || vetId.length !== 24) {
      return res.status(400).json({ message: 'Invalid vet ID' });
    }

    const vet = await Vet.findById(vetId).select('name');
    if (!vet) return res.status(404).json({ message: 'Vet not found' });

    res.json({ name: vet.name });
  } catch (err) {
    console.error('Error fetching vet name:', err);
    res.status(500).json({ message: 'Server error fetching vet name' });
  }
};



export const getVetPersonalInfo = async (req, res) => {
  try {
    const vet = await Vet.findById(req.params.id).select('-password');
    if (!vet) {
      return res.status(404).json({ message: "Vet not found" });
    }
    res.status(200).json(vet);
  } catch (error) {
    console.error("Error fetching vet personal info:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateVetProfile = async (req, res) => {
  try {
    const vetId = req.params.id;
    const existingVet = await Vet.findById(vetId);

    if (!existingVet) {
      return res.status(404).json({ message: "Vet not found" });
    }

    const requestedVetType = req.body.vetType || existingVet.vetType || 'independent';

    const updateData = {
      name: req.body.name,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      specialization: req.body.specialization,
      experience: req.body.experience,
      qualifications: req.body.qualifications,
      region: req.body.region,
      comuna: req.body.comuna,
      vetType: requestedVetType
    };

    // Flags operativos
    if (typeof req.body.supportsEmergency !== 'undefined') {
      updateData.supportsEmergency =
        String(req.body.supportsEmergency) === 'true' || req.body.supportsEmergency === true;
    }
    if (typeof req.body.availableNow !== 'undefined') {
      updateData.availableNow =
        String(req.body.availableNow) === 'true' || req.body.availableNow === true;
    }
    if (typeof req.body.teleconsultationsEnabled !== 'undefined') {
      updateData.teleconsultationsEnabled =
        String(req.body.teleconsultationsEnabled) === 'true' || req.body.teleconsultationsEnabled === true;
    }
    if (typeof req.body.currentStatus !== 'undefined') {
      updateData.currentStatus = req.body.currentStatus;
    }

    const latProvided = typeof req.body.lat !== 'undefined' && req.body.lat !== '';
    const lngProvided = typeof req.body.lng !== 'undefined' && req.body.lng !== '';

    if (latProvided && lngProvided) {
      const parsedLat = parseFloat(req.body.lat);
      const parsedLng = parseFloat(req.body.lng);

      if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
        return res.status(400).json({ message: 'Latitud y longitud deben ser valores numéricos válidos.' });
      }

      updateData.location = {
        type: 'Point',
        coordinates: [parsedLng, parsedLat]
      };
    }

    const finalLat = latProvided
      ? parseFloat(req.body.lat)
      : existingVet.location?.coordinates?.[1];
    const finalLng = lngProvided
      ? parseFloat(req.body.lng)
      : existingVet.location?.coordinates?.[0];

    // Solo validar ubicación si se está actualizando el perfil completo
    // No validar si solo se está actualizando availableNow o currentStatus
    const isOnlyStatusUpdate = Object.keys(req.body).every(key => 
      ['availableNow', 'currentStatus', 'lat', 'lng'].includes(key)
    );
    
    if (
      !isOnlyStatusUpdate &&
      requestedVetType === 'independent' &&
      (finalLat === undefined ||
        finalLat === null ||
        Number.isNaN(finalLat) ||
        finalLng === undefined ||
        finalLng === null ||
        Number.isNaN(finalLng))
    ) {
      return res.status(400).json({
        message: 'Los veterinarios independientes deben registrar su ubicación (latitud y longitud).'
      });
    }
    
    // Si solo se está actualizando el estado y no hay ubicación, usar la existente
    if (isOnlyStatusUpdate && !latProvided && !lngProvided) {
      // No actualizar location si solo se está cambiando el estado
      delete updateData.location;
    }

    if (req.body.services) {
      let incoming = req.body.services;
      if (typeof incoming === 'string') {
        try {
          // intentar parsear JSON, si falla tratar como CSV
          if (incoming.trim().startsWith('[')) {
            incoming = JSON.parse(incoming);
          } else {
            incoming = incoming.split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch {
          incoming = incoming.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(incoming)) {
        const allowed = ['consultas', 'video-consultas', 'a-domicilio'];
        updateData.services = incoming.filter(s => allowed.includes(s));
      }
    }

    // Handle clinic address for clinics
    if (requestedVetType === 'clinic' && req.body.clinicAddress) {
      try {
        const clinicAddressData = typeof req.body.clinicAddress === 'string' 
          ? JSON.parse(req.body.clinicAddress) 
          : req.body.clinicAddress;
        updateData.clinicAddress = clinicAddressData;
      } catch (e) {
        console.error("Error parsing clinicAddress in update:", e);
      }
    }

    // Handle opening hours if provided
    if (req.body.openingHours) {
      try {
        const openingHoursData = typeof req.body.openingHours === 'string' 
          ? JSON.parse(req.body.openingHours) 
          : req.body.openingHours;
        if (Array.isArray(openingHoursData)) {
          updateData.openingHours = openingHoursData;
        }
      } catch (e) {
        console.error("Error parsing openingHours in update:", e);
      }
    }

    // Sincronizar teleconsultationsEnabled con services
    // Si teleconsultationsEnabled es true, asegurar que 'video-consultas' esté en services
    if (updateData.teleconsultationsEnabled === true) {
      const currentServices = updateData.services || existingVet.services || [];
      if (!currentServices.includes('video-consultas')) {
        updateData.services = [...currentServices, 'video-consultas'];
      }
    }
    // Si teleconsultationsEnabled es false, remover 'video-consultas' de services
    if (updateData.teleconsultationsEnabled === false) {
      const currentServices = updateData.services || existingVet.services || [];
      updateData.services = currentServices.filter(s => s !== 'video-consultas');
    }

    // Handle profile image upload
    if (req.file) {
      updateData.profileImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    } else if (req.body.profileImage && req.body.profileImage.startsWith('data:image')) {
      // Handle base64 image
      updateData.profileImage = req.body.profileImage;
    }

    console.log('Actualizando perfil de veterinario:', {
      vetId,
      teleconsultationsEnabled: updateData.teleconsultationsEnabled,
      updateDataKeys: Object.keys(updateData)
    });

    const updatedVet = await Vet.findByIdAndUpdate(vetId, updateData, { new: true });

    if (!updatedVet) {
      return res.status(404).json({ message: "Vet not found" });
    }
    
    console.log('Veterinario actualizado:', {
      teleconsultationsEnabled: updatedVet.teleconsultationsEnabled,
      services: updatedVet.services
    });

    // Si el veterinario acaba de activar su disponibilidad (cambió de false a true), verificar urgencias pendientes
    const wasAvailable = existingVet.availableNow;
    const isNowAvailable = updateData.availableNow === true;
    
    if (!wasAvailable && isNowAvailable && updatedVet.supportsEmergency && updatedVet.isApproved && updatedVet.location?.coordinates) {
      console.log(`🔄 Vet ${vetId} cambió de offline a disponible. Verificando urgencias pendientes...`);
      const io = req.app.get('io');
      if (io) {
        const emergencyNamespace = io.of('/emergency');
        // Llamar directamente a la función para verificar urgencias pendientes
        if (emergencyNamespace.checkPendingEmergenciesForVet) {
          emergencyNamespace.checkPendingEmergenciesForVet(vetId.toString(), updatedVet).catch(error => {
            console.error('Error checking pending emergencies when vet became available:', error);
          });
        }
      }
    }
    
    // También verificar si cambió de 'offline' a 'available' en currentStatus
    const wasOffline = existingVet.currentStatus === 'offline';
    const isNowAvailableStatus = updateData.currentStatus === 'available' || 
                                 (updateData.currentStatus === undefined && updatedVet.currentStatus === 'available');
    
    if (wasOffline && isNowAvailableStatus && updatedVet.availableNow && updatedVet.supportsEmergency && updatedVet.isApproved && updatedVet.location?.coordinates) {
      console.log(`🔄 Vet ${vetId} cambió de offline a available. Verificando urgencias pendientes...`);
      const io = req.app.get('io');
      if (io) {
        const emergencyNamespace = io.of('/emergency');
        if (emergencyNamespace.checkPendingEmergenciesForVet) {
          emergencyNamespace.checkPendingEmergenciesForVet(vetId.toString(), updatedVet).catch(error => {
            console.error('Error checking pending emergencies when vet status changed:', error);
          });
        }
      }
    }

    res.json(updatedVet);
  } catch (error) {
    console.error('Error updating vet profile:', error);
    res.status(500).json({ message: 'Server error while updating vet profile' });
  }
};



// PUT /api/vets/:id/certificate
export const uploadCertificate = async (req, res) => {
  const vetId = req.params.id;
  const { certificate } = req.body;

  if (!certificate) {
    return res.status(400).json({ message: "Certificate is required." });
  }

  try {
    const vet = await Vet.findByIdAndUpdate(
      vetId,
      { certificate },
      { new: true }
    );

    if (!vet) return res.status(404).json({ message: "Vet not found." });

    res.json({ message: "Certificate uploaded successfully", vet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Filtrar veterinarios por servicios / región / comuna
// @route   GET /api/vets/filter?services=consultas,video-consultas&region=Metropolitana&comuna=Santiago&match=any
// @access  Public
export const filterVets = async (req, res) => {
  try {
  const { services, region, comuna, match = 'any', approved, lat, lng, radiusKm, openNow, open24h, supportsEmergency, availableNow, teleconsultationsEnabled } = req.query;
  const query = {};

    if (region) query.region = region;
    if (comuna) query.comuna = comuna;
    if (approved === 'true') query.isApproved = true;
    if (approved === 'false') query.isApproved = false;

    if (supportsEmergency === 'true') query.supportsEmergency = true;
    if (supportsEmergency === 'false') query.supportsEmergency = false;
    if (availableNow === 'true') query.availableNow = true;
    if (availableNow === 'false') query.availableNow = false;
    if (teleconsultationsEnabled === 'true') query.teleconsultationsEnabled = true;
    if (teleconsultationsEnabled === 'false') query.teleconsultationsEnabled = false;

    if (services) {
      let list = services.split(',').map(s => s.trim()).filter(Boolean);
      const allowed = ['consultas', 'video-consultas', 'a-domicilio'];
      list = list.filter(s => allowed.includes(s));
      if (list.length) {
        // match=all => todos los servicios; match=any (default) => cualquiera
        if (match === 'all') {
          query.services = { $all: list };
        } else {
          query.services = { $in: list };
        }
      }
    }

    let geoStage = [];
    let vets;
    
    if (lat && lng && radiusKm) {
      const center = [parseFloat(lng), parseFloat(lat)];
      const meters = parseFloat(radiusKm) * 1000;
      
      // Buscar veterinarios con coordenadas usando geoNear
      geoStage = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: center },
            distanceField: 'distancia',
            maxDistance: meters,
            spherical: true,
            query: {
              ...query,
              location: { $exists: true, $ne: null }
            }
          }
        },
        { $project: { password: 0 } }
      ];
      
      const vetsWithLocation = await Vet.aggregate(geoStage);
      
      // También buscar clínicas sin coordenadas que coincidan con los filtros
      // Solo incluir si hay filtros de región/comuna o si se busca específicamente por servicios de clínica
      const queryWithoutLocation = {
        ...query,
        vetType: 'clinic',
        $or: [
          { location: { $exists: false } },
          { location: null }
        ]
      };
      
      // Solo buscar clínicas sin coordenadas si hay filtros de región/comuna o si se busca el servicio 'consultas'
      const shouldIncludeClinicsWithoutLocation = 
        region || 
        comuna || 
        (services && services.includes('consultas'));
      
      let clinicsWithoutLocation = [];
      if (shouldIncludeClinicsWithoutLocation) {
        clinicsWithoutLocation = await Vet.find(queryWithoutLocation).select('-password');
      }
      
      // Combinar resultados
      vets = [...vetsWithLocation, ...clinicsWithoutLocation];
      
      // Eliminar duplicados por _id
      const uniqueVets = new Map();
      vets.forEach(vet => {
        const id = vet._id?.toString() || vet._id;
        if (!uniqueVets.has(id)) {
          uniqueVets.set(id, vet);
        }
      });
      vets = Array.from(uniqueVets.values());
    } else {
      vets = await Vet.find(query).select('-password');
    }

    // Post-filter by opening hours if requested
    const wantOpen24 = open24h === 'true';
    const wantOpenNow = openNow === 'true';

    if (wantOpen24 || wantOpenNow) {
      const now = new Date();
      const day = now.getDay();
      const minutes = now.getHours() * 60 + now.getMinutes();

      const isOpenNow = (v) => {
        if (v.alwaysOpen24h) return true;
        const hours = v.openingHours || [];
        const todays = hours.filter(h => h && typeof h.day === 'number' && h.day === day);
        for (const h of todays) {
          if (h.open24h) return true;
          if (h.open && h.close) {
            const [oh, om] = h.open.split(':').map(Number);
            const [ch, cm] = h.close.split(':').map(Number);
            const o = oh * 60 + om;
            const c = ch * 60 + cm;
            if (o <= minutes && minutes <= c) return true;
          }
        }
        return false;
      };

      const is24 = (v) => v.alwaysOpen24h || (Array.isArray(v.openingHours) && v.openingHours.some(h => h && h.open24h));

      vets = vets.filter(v => {
        if (wantOpen24 && !is24(v)) return false;
        if (wantOpenNow && !isOpenNow(v)) return false;
        return true;
      });
    }

    res.json({ total: vets.length, vets });
  } catch (err) {
    console.error('Error filtering vets:', err);
    res.status(500).json({ message: 'Error del servidor al filtrar veterinarios' });
  }
};

// @desc    Admin actualiza cualquier campo del veterinario
// @route   PUT /api/vets/admin/:id
// @access  Admin only
export const adminUpdateVet = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const adminName = req.user?.name || 'Admin';

    // Verificar que el usuario es admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden modificar perfiles de veterinarios' });
    }

    const vet = await Vet.findById(id);
    if (!vet) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    // Obtener todos los campos del body excepto los que no deben modificarse directamente
    const updateData = { ...req.body };

    // Campos que requieren procesamiento especial
    if (updateData.password) {
      // Si se proporciona una nueva contraseña, hashearla
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Procesar clinicAddress si viene como string JSON
    if (updateData.clinicAddress && typeof updateData.clinicAddress === 'string') {
      try {
        updateData.clinicAddress = JSON.parse(updateData.clinicAddress);
      } catch (e) {
        console.error('Error parsing clinicAddress:', e);
      }
    }

    // Procesar openingHours si viene como string JSON
    if (updateData.openingHours && typeof updateData.openingHours === 'string') {
      try {
        updateData.openingHours = JSON.parse(updateData.openingHours);
      } catch (e) {
        console.error('Error parsing openingHours:', e);
      }
    }

    // Procesar location si se proporcionan lat y lng
    if (updateData.lat !== undefined && updateData.lng !== undefined) {
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(updateData.lng), parseFloat(updateData.lat)]
      };
      delete updateData.lat;
      delete updateData.lng;
    }

    // Procesar services si viene como string
    if (updateData.services && typeof updateData.services === 'string') {
      try {
        if (updateData.services.trim().startsWith('[')) {
          updateData.services = JSON.parse(updateData.services);
        } else {
          updateData.services = updateData.services.split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch (e) {
        updateData.services = updateData.services.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Validar RUT si se está actualizando
    if (updateData.nationalId) {
      const normalizedRut = canonicalizeRut(updateData.nationalId);
      if (!validateChileanRUT(normalizedRut)) {
        return res.status(400).json({ message: 'RUT inválido' });
      }
      updateData.nationalId = normalizedRut;
    }

    // Validar email si se está actualizando
    if (updateData.email && !validator.isEmail(updateData.email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    // Actualizar verificationMetadata si se cambia verificationStatus
    if (updateData.verificationStatus && updateData.verificationStatus !== vet.verificationStatus) {
      updateData.verificationMetadata = {
        checkedAt: new Date(),
        checkedBy: adminName,
        notes: updateData.verificationNotes || `Estado de verificación cambiado por ${adminName}`
      };
      appendVerificationLog(vet, updateData.verificationStatus, `Cambio de estado por admin: ${adminName}`);
    }

    // Remover campos que no deben actualizarse directamente
    delete updateData._id;
    delete updateData.verificationNotes; // Campo auxiliar, no se guarda en el modelo

    // Actualizar el veterinario
    const updatedVet = await Vet.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedVet) {
      return res.status(404).json({ message: 'Error al actualizar el veterinario' });
    }

    console.log(`Admin ${adminName} (${adminId}) actualizó el perfil del veterinario ${id}`);

    res.json({
      success: true,
      message: 'Perfil de veterinario actualizado exitosamente',
      vet: updatedVet
    });
  } catch (error) {
    console.error('Error en adminUpdateVet:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar el perfil', error: error.message });
  }
};

// @desc    Admin resetea la contraseña del veterinario
// @route   PUT /api/vets/admin/:id/reset-password
// @access  Admin only
export const adminResetVetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user?.id;
    const adminName = req.user?.name || 'Admin';

    // Verificar que el usuario es admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden resetear contraseñas' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const vet = await Vet.findById(id);
    if (!vet) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    vet.password = hashedPassword;
    await vet.save();

    console.log(`Admin ${adminName} (${adminId}) reseteó la contraseña del veterinario ${id}`);

    res.json({
      success: true,
      message: 'Contraseña reseteada exitosamente'
    });
  } catch (error) {
    console.error('Error en adminResetVetPassword:', error);
    res.status(500).json({ message: 'Error del servidor al resetear la contraseña', error: error.message });
  }
};

// @desc    Admin cambia el estado de verificación del veterinario
// @route   PUT /api/vets/admin/:id/verification-status
// @access  Admin only
export const adminUpdateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, notes } = req.body;
    const adminId = req.user?.id;
    const adminName = req.user?.name || 'Admin';

    // Verificar que el usuario es admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden cambiar el estado de verificación' });
    }

    if (!['pending', 'verified', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({ message: 'Estado de verificación inválido' });
    }

    const vet = await Vet.findById(id);
    if (!vet) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    // Actualizar estado de verificación
    vet.verificationStatus = verificationStatus;
    vet.verificationMetadata = {
      checkedAt: new Date(),
      checkedBy: adminName,
      notes: notes || `Estado de verificación cambiado por ${adminName}`
    };

    // Si se verifica, aprobar automáticamente
    if (verificationStatus === 'verified') {
      vet.isApproved = true;
    } else if (verificationStatus === 'rejected') {
      vet.isApproved = false;
    }

    appendVerificationLog(vet, verificationStatus, notes || `Cambio de estado por admin: ${adminName}`);

    await vet.save();

    console.log(`Admin ${adminName} (${adminId}) cambió el estado de verificación del veterinario ${id} a ${verificationStatus}`);

    res.json({
      success: true,
      message: 'Estado de verificación actualizado exitosamente',
      vet: vet
    });
  } catch (error) {
    console.error('Error en adminUpdateVerificationStatus:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar el estado de verificación', error: error.message });
  }
};

