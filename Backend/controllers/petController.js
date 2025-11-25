import Pet from "../models/Pet.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";


// Add a new pet
export const addPet = async (req, res) => {
  try {
    console.log("addPet called - Request body:", JSON.stringify(req.body, null, 2)); // Debug
    
    // Extract token from request headers
    const token = req.headers.authorization?.split(' ')[1]; // Get the token from the Authorization header
    
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      console.log("JWT verification failed:", jwtError.message);
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Access user data from the decoded token
    const userId = decoded.id;
    console.log("Token verified - User ID:", userId);

    // Extract data from request body
    const { 
      name, 
      image, 
      species, 
      breed, 
      gender, 
      color, 
      description,
      birthDate,
      ageYears,
      ageMonths,
      weight
    } = req.body;
    
    console.log("Extracted data:", { name, species, breed, gender, hasImage: !!image, hasColor: !!color });

    // Validate the necessary fields
    if (!name || !species || !breed || !gender) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Name, species, breed, and gender are required.",
      });
    }

    // Validar que la especie sea válida
    const validSpecies = ["Perro", "Gato", "Ave", "Reptil", "Conejo", "Hamster", "Otro"];
    if (!validSpecies.includes(species)) {
      return res.status(400).json({
        success: false,
        message: "Invalid species. Must be one of: " + validSpecies.join(", "),
      });
    }

    // Validar género
    const validGenders = ["Macho", "Hembra"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender. Must be 'Macho' or 'Hembra'.",
      });
    }

    // Normalizar campos opcionales: convertir strings vacíos a undefined
    const normalizedWeight = (weight === '' || weight === null || weight === undefined) ? undefined : weight;
    const normalizedBirthDate = (birthDate === '' || birthDate === null || birthDate === undefined) ? undefined : birthDate;
    const normalizedAgeYears = (ageYears === '' || ageYears === null || ageYears === undefined) ? undefined : ageYears;
    const normalizedAgeMonths = (ageMonths === '' || ageMonths === null || ageMonths === undefined) ? undefined : ageMonths;
    const normalizedImage = (image === '' || image === null || image === undefined || (typeof image === 'string' && image.trim() === '')) ? undefined : image;
    const normalizedColor = (color === '' || color === null || color === undefined || (typeof color === 'string' && color.trim() === '')) ? undefined : color;
    const normalizedDescription = (description === '' || description === null || description === undefined || (typeof description === 'string' && description.trim() === '')) ? undefined : description;

    // Validar peso si se proporciona
    if (normalizedWeight !== undefined) {
      const weightNum = parseFloat(normalizedWeight);
      if (isNaN(weightNum) || weightNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Weight must be a positive number.",
        });
      }
    }

    // Validar edad si se proporciona
    if (normalizedAgeYears !== undefined) {
      const ageYearsNum = parseFloat(normalizedAgeYears);
      if (isNaN(ageYearsNum) || ageYearsNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Age (years) must be a positive number.",
        });
      }
    }

    // Validar fecha de nacimiento si se proporciona
    let parsedBirthDate = undefined;
    if (normalizedBirthDate !== undefined) {
      parsedBirthDate = new Date(normalizedBirthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid birth date format.",
        });
      }
    }

    // Create the new pet object
    const newPet = new Pet({
      userId,
      name,
      image: normalizedImage,
      species,
      breed,
      gender,
      color: normalizedColor,
      description: normalizedDescription,
      birthDate: parsedBirthDate,
      ageYears: normalizedAgeYears !== undefined ? parseFloat(normalizedAgeYears) : undefined,
      ageMonths: normalizedAgeMonths !== undefined ? parseInt(normalizedAgeMonths) : undefined,
      weight: normalizedWeight !== undefined ? parseFloat(normalizedWeight) : undefined,
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
    console.error("Error stack:", error.stack); // Log stack trace

    // Handle different types of errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error: " + error.message,
      });
    }

    // Handle JWT errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again.",
      });
    }

    // Handle other potential errors (e.g., database issues)
    res.status(500).json({
      success: false,
      message: "Failed to add pet, please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined, // Only show error in development
    });
  }
};


// Get all pets of a user (excluding deleted)
export const getUserPets = async (req, res) => {
  try {
    const { userId } = req.params;
    const pets = await Pet.find({ userId, isDeleted: { $ne: true } });

    res.status(200).json(pets);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch pets", error: error.message });
  }
};

// Delete a pet (soft delete)
export const deletePet = async (req, res) => {
  try {
    const { petId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const userId = decoded.id;

    // Find the pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }

    // Verify that the pet belongs to the authenticated user
    if (pet.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this pet" });
    }

    // Soft delete: mark as deleted instead of removing from database
    pet.isDeleted = true;
    pet.deletedAt = new Date();
    await pet.save();

    res.status(200).json({ success: true, message: "Pet deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete pet", error: error.message });
  }
};


import mongoose from 'mongoose';

export const getPetsByUserId = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    // Populate userId with user's name and image, exclude deleted pets
    const pets = await Pet.find({ userId, isDeleted: { $ne: true } }).populate("userId", "name image");

    res.status(200).json({ success: true, pets });
  } catch (error) {
    console.error("Error fetching pets:", error);
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
// Getting the name of a pet from the ID (excluding deleted)
export const getPetNameById = async (req, res) => {
  const { id } = req.params;
  console.log('Received petId:', id); // Fixed incorrect variable name

  try {
    const pet = await Pet.findOne({ _id: id, isDeleted: { $ne: true } }).select('name');
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    res.json({ pet: { name: pet.name } });
  } catch (error) {
    console.error('Error fetching pet name:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a pet by ID (excluding deleted)
export const getPetById = async (req, res) => {
  try {
    const { id } = req.params;
    const pet = await Pet.findOne({ _id: id, isDeleted: { $ne: true } });
    
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Mascota no encontrada' });
    }

    // Verificar que la mascota pertenece al usuario autenticado
    const userId = req.user?.id || req.userId;
    if (pet.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    res.status(200).json(pet);
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la mascota' });
  }
};

// Update a pet
export const updatePet = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const userId = decoded.id;

    // Find the pet (excluding deleted)
    const pet = await Pet.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!pet) {
      return res.status(404).json({ success: false, message: 'Mascota no encontrada' });
    }

    // Verify that the pet belongs to the authenticated user
    if (pet.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    // Extract data from request body
    const { 
      name, 
      image, 
      species, 
      breed, 
      gender, 
      color, 
      description,
      birthDate,
      ageYears,
      ageMonths,
      weight
    } = req.body;

    // Validate required fields
    if (!name || !species || !breed || !gender) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. Name, species, breed, and gender are required.",
      });
    }

    // Validar que la especie sea válida
    const validSpecies = ["Perro", "Gato", "Ave", "Reptil", "Conejo", "Hamster", "Otro"];
    if (!validSpecies.includes(species)) {
      return res.status(400).json({
        success: false,
        message: "Invalid species. Must be one of: " + validSpecies.join(", "),
      });
    }

    // Validar género
    const validGenders = ["Macho", "Hembra"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender. Must be 'Macho' or 'Hembra'.",
      });
    }

    // Normalizar campos opcionales
    const normalizedWeight = (weight === '' || weight === null || weight === undefined) ? undefined : weight;
    const normalizedBirthDate = (birthDate === '' || birthDate === null || birthDate === undefined) ? undefined : birthDate;
    const normalizedAgeYears = (ageYears === '' || ageYears === null || ageYears === undefined) ? undefined : ageYears;
    const normalizedAgeMonths = (ageMonths === '' || ageMonths === null || ageMonths === undefined) ? undefined : ageMonths;
    const normalizedImage = (image === '' || image === null || image === undefined || (typeof image === 'string' && image.trim() === '')) ? undefined : image;
    const normalizedColor = (color === '' || color === null || color === undefined || (typeof color === 'string' && color.trim() === '')) ? undefined : color;
    const normalizedDescription = (description === '' || description === null || description === undefined || (typeof description === 'string' && description.trim() === '')) ? undefined : description;

    // Validar peso si se proporciona
    if (normalizedWeight !== undefined) {
      const weightNum = parseFloat(normalizedWeight);
      if (isNaN(weightNum) || weightNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Weight must be a positive number.",
        });
      }
    }

    // Validar edad si se proporciona
    if (normalizedAgeYears !== undefined) {
      const ageYearsNum = parseFloat(normalizedAgeYears);
      if (isNaN(ageYearsNum) || ageYearsNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Age (years) must be a positive number.",
        });
      }
    }

    // Validar fecha de nacimiento si se proporciona
    let parsedBirthDate = undefined;
    if (normalizedBirthDate !== undefined) {
      parsedBirthDate = new Date(normalizedBirthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid birth date format.",
        });
      }
    }

    // Update the pet
    pet.name = name;
    pet.species = species;
    pet.breed = breed;
    pet.gender = gender;
    pet.image = normalizedImage;
    pet.color = normalizedColor;
    pet.description = normalizedDescription;
    pet.birthDate = parsedBirthDate;
    pet.ageYears = normalizedAgeYears !== undefined ? parseFloat(normalizedAgeYears) : undefined;
    pet.ageMonths = normalizedAgeMonths !== undefined ? parseInt(normalizedAgeMonths) : undefined;
    pet.weight = normalizedWeight !== undefined ? parseFloat(normalizedWeight) : undefined;

    await pet.save();

    res.status(200).json({
      success: true,
      message: "Mascota actualizada correctamente",
      pet: pet,
    });
  } catch (error) {
    console.error("Error updating pet:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error: " + error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error al actualizar la mascota",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};