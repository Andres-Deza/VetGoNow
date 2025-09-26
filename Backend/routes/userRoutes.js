import express from 'express';
import { registerUser, getUsers, approveUser, removeUser,getOwnerNameById } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/authmiddleware.js';
import { getUserDetail } from '../controllers/userController.js';


const userRouter = express.Router();

userRouter.get('/userdetail/:id', getUserDetail);

// Register User Route (public)
userRouter.post("/", registerUser);

// Get Users with Role "user" (admin only)
userRouter.get("/role/user", authenticate, authorize(["admin"]), getUsers);

// Approve User (admin only)
userRouter.put("/:id/approve", authenticate, authorize(["admin"]), approveUser);

// Remove User (admin only)
userRouter.delete("/:id", authenticate, authorize(["admin"]), removeUser);

userRouter.get('/findownersname/all/:id', getOwnerNameById);


export default userRouter;