import express from "express";
import cors from "cors";
import { registerAdmin, loginAdmin, getAdminProfile, getVetReliabilityStats, getDashboardStats, getEmergencyTimeStats } from "../controllers/adminController.js";
import { getRevenueStats } from "../controllers/revenueController.js";
import { protect, authorize } from "../middleware/authmiddleware.js";

const AdminRouter = express.Router();

// Manejar preflight (OPTIONS) para CORS
AdminRouter.options('*', cors());

AdminRouter.post("/register", registerAdmin);
AdminRouter.post("/login", loginAdmin);
AdminRouter.get('/profile', protect, authorize(['admin']), getAdminProfile);
AdminRouter.get('/vets/reliability-stats', protect, authorize(['admin']), getVetReliabilityStats);
AdminRouter.get('/dashboard/stats', protect, authorize(['admin']), getDashboardStats);
AdminRouter.get('/emergencies/time-stats', protect, authorize(['admin']), getEmergencyTimeStats);
AdminRouter.get('/revenue/stats', protect, authorize(['admin']), getRevenueStats);

export default AdminRouter;