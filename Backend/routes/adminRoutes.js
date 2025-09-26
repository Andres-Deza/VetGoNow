import express from "express";
import { registerAdmin, loginAdmin } from "../controllers/adminController.js";
import { getAdminProfile } from "../controllers/adminController.js";
import { protect } from "../middleware/authmiddleware.js";

const AdminRouter = express.Router();

AdminRouter.post("/register", registerAdmin);
AdminRouter.post("/login", loginAdmin);
AdminRouter.get('/profile', protect, getAdminProfile);

export default AdminRouter;