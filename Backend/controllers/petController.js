import Pet from "../models/Pet.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";


// Add a new pet
export const addPet = async (req, res) => {
  try {
    // Extract token from request headers
    const token = req.headers.authorization?.split(' ')[1]; // Get the token from the Authorization header
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Access user data from the decoded token
    const userId = decoded.id;

    // console.log("user", userId); // Debugging log

    // Extract data from request body
    const { name, image, breed, gender, color, description } = req.body;

    // Validate the necessary fields
    if (!name || !breed || !gender || !color) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Name, breed, gender, and color are required.",
      });
    }

    // Create the new pet object
    const newPet = new Pet({
      userId,
      name,
      image,
      breed,
      gender,
      color,
      description,
    });

    // Save the pet to the database
    await newPet.save();

    // Return a success response
    res.status(201).json({
      success: true,
      message: "Pet added successfully",
      pet: newPet,
    });
  } catch (error) {
    console.error("Error adding pet:", error); // Log the entire error object for debugging

    // Handle different types of errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error: " + error.message,
      });
    }

    // Handle other potential errors (e.g., database issues)
    res.status(500).json({
      success: false,
      message: "Failed to add pet, please try again later.",
      error: error, // Log the full error object to the response for debugging
    });
  }
};


// Get all pets of a user
export const getUserPets = async (req, res) => {
  try {
    const { userId } = req.params;
    const pets = await Pet.find({ userId });

    res.status(200).json(pets);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch pets", error: error.message });
  }
};

// Delete a pet
export const deletePet = async (req, res) => {
  try {
    const { petId } = req.params;
    await Pet.findByIdAndDelete(petId);

    res.status(200).json({ success: true, message: "Pet deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete pet", error: error.message });
  }
};


import mongoose from 'mongoose';

export const getPetsByUserId = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    // Populate userId with user's name and image
    const pets = await Pet.find({ userId }).populate("userId", "name image");

    res.status(200).json({ success: true, pets });
  } catch (error) {
    console.error("❌ Error fetching pets:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deletePetsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    await Pet.deleteMany({ userId });
    res.status(200).json({ success: true, message: 'Pets deleted' });
  } catch (error) {
    console.error('Error deleting pets:', error);
    res.status(500).json({ success: false, message: 'Failed to delete pets' });
  }
};
// Getting the name of a pet from the ID
export const getPetNameById = async (req, res) => {
  const { id } = req.params;
  console.log('Received petId:', id); // Fixed incorrect variable name

  try {
    const pet = await Pet.findById(id).select('name');
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    res.json({ pet: { name: pet.name } });
  } catch (error) {
    console.error('Error fetching pet name:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
