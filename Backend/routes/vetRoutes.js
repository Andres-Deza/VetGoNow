import express from 'express';
import multer from 'multer';
import { 
  registerVet, getVets, getVetById, getVetNameById, getVetPersonalInfo,
  getAllVets, approveVet, deleteVet, getAppointmentCountByVet,
  updateVetProfile, filterVets, verifySelfieEvidence,
  adminUpdateVet, adminResetVetPassword, adminUpdateVerificationStatus
} from '../controllers/vetController.js';
import { protect } from '../middleware/authmiddleware.js';
import { uploadCertificate } from '../controllers/vetController.js';

const vetRouter = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

vetRouter.post(
  "/",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
    { name: "nationalIdDocument", maxCount: 1 },
    { name: "faceImage", maxCount: 1 },
    { name: "frontIdImage", maxCount: 1 },
    { name: "backIdImage", maxCount: 1 },
    // Documentos para veterinario independiente
    { name: "siiActivityStartDocument", maxCount: 1 },
    // Documentos para clínica
    { name: "municipalLicenseDocument", maxCount: 1 },
    { name: "technicalResponsibleTitleDocument", maxCount: 1 },
    { name: "representationDocument", maxCount: 1 },
    { name: "seremiAuthorization", maxCount: 1 },
    { name: "sagAuthorization", maxCount: 1 },
    // Fotos de clínica (múltiples)
    { name: "clinicPhoto_0", maxCount: 1 },
    { name: "clinicPhoto_1", maxCount: 1 },
    { name: "clinicPhoto_2", maxCount: 1 },
    { name: "clinicPhoto_3", maxCount: 1 },
    { name: "clinicPhoto_4", maxCount: 1 }
  ]),
  registerVet
);
vetRouter.get("/", getVets);  // Fetch all vets
// IMPORTANT: specific routes must come BEFORE parameterized routes like "/:id"
vetRouter.get('/filter', filterVets);
vetRouter.get('/role/vet', protect, getAllVets);
vetRouter.put('/role/vet/:id/approve', protect, approveVet);
vetRouter.delete('/role/vet/:id', protect, deleteVet);
vetRouter.get('/:id/appointments/count', protect, getAppointmentCountByVet);
vetRouter.get("/personalinfo/:id", getVetPersonalInfo); 

// Getting vets name
vetRouter.get('/findvetsname/all/:vetId', getVetNameById);

// **New update route for profile**
vetRouter.put("/update/:id", upload.single("profileImage"), updateVetProfile);

vetRouter.put("/:id/certificate", uploadCertificate);

// Verificación de selfie (sin autenticación, fase de registro)
vetRouter.post(
  "/verify-selfie",
  upload.fields([{ name: "frames", maxCount: 3 }]),
  verifySelfieEvidence
);

// Admin routes - must come before /:id to avoid shadowing
vetRouter.put('/admin/:id', protect, adminUpdateVet);
vetRouter.put('/admin/:id/reset-password', protect, adminResetVetPassword);
vetRouter.put('/admin/:id/verification-status', protect, adminUpdateVerificationStatus);

// Keep this last to avoid shadowing specific routes
vetRouter.get("/:id", getVetById);  // Fetch a single vet by ID

export default vetRouter;
