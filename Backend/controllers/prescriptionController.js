import Prescribe from "../models/Prescription.js";

import Appointment from "../models/Appointment.js";


export const upsertPrescription = async (req, res) => {
  const { appointmentId } = req.params;
  const {
    symptoms,
    medication,
    dosage,
    instructions,
    petId,
    userId,
    vetId,
    appointmentDate,
    scheduledTime,
  } = req.body;

  // console.log("📥 Incoming Prescription Data:", req.body);

  // Validate required fields
  if (!medication || !dosage || !instructions || !symptoms) {
    return res.status(400).json({ message: "All prescription fields are required." });
  }

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }


    let prescription = await Prescribe.findOne({ appointmentId });
    // console.log("🔍 Existing Prescription Fetched:", prescription);


    if (prescription) {
      // 🔁 Update existing prescription
      prescription.prescription.symptoms = symptoms;
      prescription.prescription.medication = medication;
      prescription.prescription.dosage = dosage;
      prescription.prescription.instructions = instructions;
      await prescription.save();
      // console.log("📝 Updated existing prescription:", prescription);
    } else {
      // 🆕 Create new prescription
      prescription = new Prescribe({
        appointmentId,
        petId,
        userId,
        vetId,
        appointmentDate,
        scheduledTime,
        prescription: {
          symptoms,
          medication,
          dosage,
          instructions,
        },
      });

      await prescription.save();
      // console.log("✅ Created new prescription:", prescription);
    }

    res.status(200).json({ message: "Prescription saved successfully", prescription });
  } catch (error) {
    console.error("❌ Error saving prescription:", error);
    res.status(500).json({ message: "Server error while saving prescription." });
  }
};


// controllers/prescriptionController.js
export const getPrescriptionByAppointmentId = async (req, res) => {
    const { appointmentId } = req.params;
  
    // console.log("📥 Incoming request to fetch prescription for Appointment ID:", appointmentId);
  
    try {
      const prescription = await Prescribe.findOne({ appointmentId })
        .populate("petId")
        .populate("userId")
        .populate("vetId");
  
      if (!prescription) {
        // console.log("❌ No prescription found for appointment:", appointmentId);
        return res.status(404).json({ message: "Prescription not found" });
      }
  
      // console.log("✅ Prescription with populated data found:", prescription);
  
      res.status(200).json({ prescription });
    } catch (error) {
      console.error("🚨 Error fetching prescription:", error);
      res.status(500).json({ message: "Server error" });
    }
  };