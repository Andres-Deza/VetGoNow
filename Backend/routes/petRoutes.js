import express from "express";
import { addPet, getUserPets, deletePet, updatePet } from "../controllers/petController.js";
import { protect } from "../middleware/authmiddleware.js"; // Ensure user is authenticated
import { getPetsByUserId } from "../controllers/petController.js";
import { deletePetsByUserId, getPetNameById, getPetById } from "../controllers/petController.js";

const petRouter = express.Router();

// Add a new pet
petRouter.post("/", protect, addPet);


// Get all pets of a specific user
petRouter.get("/user/:userId", getUserPets);

petRouter.get("/userpet/:userId",protect, getPetsByUserId)

//getting the name of pet from the id
petRouter.get('/findpetsname/all/:id', getPetNameById);

// Delete a pet
petRouter.delete("/:petId", protect, deletePet);
petRouter.delete('/user/:userId', protect, deletePetsByUserId);

// Get a pet by ID (debe estar después de las rutas específicas)
petRouter.get('/:id', protect, getPetById);

// Update a pet
petRouter.put('/:id', protect, updatePet);

export default petRouter;
