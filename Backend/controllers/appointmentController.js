import Appointment from '../models/Appointment.js';
import Pet from '../models/Pet.js';

// ✅ Create a new appointment
export const createAppointment = async (req, res) => {
  try {
    const { userId, vetId, petId, appointmentDate, scheduledTime, appointmentType } = req.body;

    // ✅ Error Handling - Check if required fields exist
    if (!userId || !vetId || !petId || !appointmentDate || !scheduledTime || !appointmentType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ✅ Convert date properly
    const parsedDate = new Date(appointmentDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // ✅ Create the appointment with appointmentType
    const newAppointment = new Appointment({
      userId,
      vetId,
      petId,
      appointmentDate: parsedDate,
      scheduledTime,
      appointmentType, // ✅ Added appointmentType
    });

    const savedAppointment = await newAppointment.save();
    console.log("Appointment saved:", savedAppointment);
    console.log("Appointment ID:", savedAppointment._id);  // Print the ID here


    return res.status(201).json({ 
      message: "Appointment created successfully.", 
      appointment: savedAppointment 
    });


  } catch (error) {
    console.error("❌ Error creating appointment:", error);
    return res.status(500).json({ message: "Server error. Could not create appointment." });
  }
};



// ✅ Get all appointments for a user
export const getAppointmentsForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // console.log("Decoded userId from token:", req.userId);
    // console.log("Requested userId from params:", req.params.userId);


    // Ensure the userId in token matches the userId in the request
    if (req.userId !== userId) {
      return res.status(403).json({ message: "You can only access your own appointments." });
    }

    const appointments = await Appointment.find({ userId });

    if (!appointments.length) {
      return res.status(404).json({ message: "No appointments found." });
    }

    return res.status(200).json({ appointments });
  } catch (error) {
    console.error("❌ Error fetching appointments:", error);
    return res.status(500).json({ message: "Server error. Could not fetch appointments." });
  }
};

// ✅ Update appointment status with logging
export const updateAppointmentStatus = async (req, res) => {
  console.log("🔧 Incoming request to update appointment status",req.body,req.params.appointmentId);

  try {
    const { status } = req.body;
    const appointmentId = req.params.appointmentId;

    // console.log("📥 Params - Appointment ID:", appointmentId);
    // console.log("📥 Body - Status:", status);

    // Validate inputs
    if (!appointmentId || !status) {
      console.warn("⚠️ Missing appointmentId or status");
      return res.status(400).json({ message: "Appointment ID and status are required." });
    }

    if (!['pending', 'scheduled', 'completed', 'cancelled'].includes(status)) {
      console.warn("⚠️ Invalid status:", status);
      return res.status(400).json({ message: "Invalid status provided." });
    }

    console.log("🔄 Attempting to update appointment in DB...");
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );

    if (!updatedAppointment) {
      console.warn("❌ No appointment found with ID:", appointmentId);
      return res.status(404).json({ message: "Appointment not found." });
    }

    console.log("✅ Appointment updated:", updatedAppointment);

    return res.status(200).json({
      message: "Appointment status updated successfully.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("❌ Error updating appointment status:", error);
    return res.status(500).json({ message: "Server error. Could not update appointment status." });
  }
};



export const getAppointmentsByVetId = async (req, res) => {
  const { vetId } = req.params;
  try {
    const appointments = await Appointment.find({ vetId }).sort({ appointmentDate: 1 });
    res.status(200).json({ appointments });
  } catch (error) {
    console.error("Error fetching vet appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};

// In your appointmentController.js
export const updatePrescription = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { medication, dosage, instructions } = req.body;

    if (!medication || !dosage || !instructions) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        prescription: { medication, dosage, instructions },
        status: "completed", // Mark the appointment as completed
      },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    return res.status(200).json({
      message: "Prescription updated and appointment completed.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("❌ Error updating prescription:", error);
    return res.status(500).json({ message: "Server error. Could not update prescription." });
  }
};

// Get single appointment by ID
export const getAppointmentById = async (req, res) => {
  console.log("📥 Fetching appointment by ID:", req.params.id);

  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("userId", "fullName email")
      .populate("vetId", "fullName specialization")
      .populate("petId");

    if (!appointment) {
      console.warn("❌ Appointment not found.");
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json({ appointment });
  } catch (error) {
    console.error("💥 Error fetching appointment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).send("Pet not found");
    res.json(pet);
  } catch (err) {
    console.error("Error fetching pet:", err);
    res.status(500).send("Server error");
  }
};

import User from '../models/User.js';
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select('name'); // only return name
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getBookedTimes = async (req, res) => {
  const { vetId, date } = req.params;
  try {
    // Only consider appointments that are paid OR have status 'scheduled'/'completed'
    // This prevents unpaid appointments from blocking time slots indefinitely
    const appointments = await Appointment.find({
      vetId,
      appointmentDate: date,
      $or: [
        { isPaid: true },
        { status: { $in: ['scheduled', 'completed'] } }
      ]
    });

    const bookedTimes = appointments.map((appt) => appt.scheduledTime);
    res.json(bookedTimes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch booked times" });
  }
};


export const getAllAppointments = async (req, res) => {
  try {
    // Optionally, add authorization here (req.user, etc.)

    const appointments = await Appointment.find({})
      .populate('vetId', 'name email phoneNumber')    // select fields you want from Vet
      .populate('userId', 'name email phoneNumber')   // select fields you want from User (owner)
      .populate('petId', 'name species breed');       // select fields from Pet

    res.json({ appointments });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ message: 'Server error fetching appointments' });
  }
};
