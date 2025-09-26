import express from "express";
import { addPet, getUserPets, deletePet } from "../controllers/petController.js";
import { protect } from "../middleware/authmiddleware.js"; // Ensure user is authenticated
import { getPetsByUserId } from "../controllers/petController.js";
import { deletePetsByUserId, getPetNameById } from "../controllers/petController.js";

const petRouter = express.Router();

// Add a new pet
petRouter.post("/", protect, addPet);


// Get all pets of a specific user
petRouter.get("/user/:userId", getUserPets);

petRouter.get("/userpet/:userId",protect, getPetsByUserId)

// Delete a pet
petRouter.delete("/:petId", protect, deletePet);
petRouter.delete('/user/:userId', protect, deletePetsByUserId);

//getting the name of pet from the id
petRouter.get('/findpetsname/all/:id', getPetNameById);



export default petRouter;
