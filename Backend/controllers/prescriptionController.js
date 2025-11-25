import Prescribe from "../models/Prescription.js";
import Appointment from "../models/Appointment.js";
import Pet from "../models/Pet.js";
import { createMedicalRecordsFromPrescription } from "../utils/createMedicalRecordsFromPrescription.js";


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
    vaccinesApplied,
    dewormingsApplied,
    weightAtConsultation,
  } = req.body;

  // console.log("Incoming Prescription Data:", req.body);

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
      // console.log("Existing Prescription Fetched:", prescription);


    // Obtener la mascota para usar en la creación de registros
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ message: "Pet not found." });
    }

    if (prescription) {
      // Update existing prescription
      prescription.prescription.symptoms = symptoms;
      prescription.prescription.medication = medication;
      prescription.prescription.dosage = dosage;
      prescription.prescription.instructions = instructions;
      
      // Actualizar vacunas y desparasitaciones solo si se proporcionaron
      if (vaccinesApplied !== undefined) {
        prescription.vaccinesApplied = vaccinesApplied;
      }
      if (dewormingsApplied !== undefined) {
        prescription.dewormingsApplied = dewormingsApplied;
      }
      if (weightAtConsultation !== undefined) {
        prescription.weightAtConsultation = weightAtConsultation;
      }
      
      await prescription.save();
    } else {
      // Create new prescription
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
        vaccinesApplied: vaccinesApplied || [],
        dewormingsApplied: dewormingsApplied || [],
        weightAtConsultation: weightAtConsultation || null,
      });

      await prescription.save();

      // Crear registros médicos (vacunas, desparasitaciones, registro médico) si se aplicaron
      if ((vaccinesApplied && vaccinesApplied.length > 0) || 
          (dewormingsApplied && dewormingsApplied.length > 0)) {
        try {
          await createMedicalRecordsFromPrescription(prescription, appointment, pet);
          console.log('Registros médicos creados exitosamente desde la prescripción');
        } catch (error) {
          console.error('Error al crear registros médicos (no crítico):', error);
          // No fallar la creación de la prescripción si hay error en los registros médicos
        }
      } else {
        // Siempre crear un registro médico básico aunque no haya vacunas/desparasitaciones
        try {
          await createMedicalRecordsFromPrescription(prescription, appointment, pet);
        } catch (error) {
          console.error('Error al crear registro médico básico (no crítico):', error);
        }
      }
    }

    res.status(200).json({ message: "Prescription saved successfully", prescription });
  } catch (error) {
    console.error("Error saving prescription:", error);
    res.status(500).json({ message: "Server error while saving prescription." });
  }
};


// controllers/prescriptionController.js
export const getPrescriptionByAppointmentId = async (req, res) => {
    const { appointmentId } = req.params;
  
    // console.log("Incoming request to fetch prescription for Appointment ID:", appointmentId);
  
    try {
      const prescription = await Prescribe.findOne({ appointmentId })
        .populate("petId")
        .populate("userId")
        .populate("vetId");
  
      if (!prescription) {
        // No es un error si no hay receta, simplemente devolvemos null
        return res.status(200).json({ prescription: null, message: "No prescription found for this appointment" });
      }
  
      // console.log("Prescription with populated data found:", prescription);
  
      res.status(200).json({ prescription });
    } catch (error) {
      console.error("Error fetching prescription:", error);
      res.status(500).json({ message: "Server error" });
    }
  };