import express from 'express';
import multer from 'multer';
import { 
  registerVet, getVets, getVetById, getVetNameById, getVetPersonalInfo,
  getAllVets, approveVet, deleteVet, getAppointmentCountByVet,
  updateVetProfile, filterVets
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

vetRouter.post("/", upload.single("certificate"), registerVet);
vetRouter.get("/", getVets);  // Fetch all vets
vetRouter.get("/:id", getVetById);  // Fetch a single vet by ID
vetRouter.get('/role/vet', protect, getAllVets);
vetRouter.put('/role/vet/:id/approve', protect, approveVet);
vetRouter.delete('/role/vet/:id', protect, deleteVet);
vetRouter.get('/:id/appointments/count', protect, getAppointmentCountByVet);
vetRouter.get("/personalinfo/:id", getVetPersonalInfo); 
vetRouter.get('/filter', filterVets);

// Getting vets name
vetRouter.get('/findvetsname/all/:vetId', getVetNameById);

// **New update route for profile**
vetRouter.put("/update/:id", upload.single("profileImage"), updateVetProfile);

vetRouter.put("/:id/certificate", uploadCertificate);


export default vetRouter;
