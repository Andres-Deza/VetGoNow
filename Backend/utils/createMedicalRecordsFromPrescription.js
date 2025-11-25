import Vaccine from '../models/Vaccine.js';
import Deworming from '../models/Deworming.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Reminder from '../models/Reminder.js';
import { calculateNextDewormingDate } from '../services/preventiveCareRules.js';
import { generateFriendlyReminderText } from '../services/geminiService.js';

/**
 * Crea registros de vacunas, desparasitaciones y registros médicos
 * a partir de una prescripción que contiene esta información
 */
export const createMedicalRecordsFromPrescription = async (prescription, appointment, pet) => {
  const recordsCreated = {
    vaccines: [],
    dewormings: [],
    medicalRecord: null
  };

  try {
    // 1. Crear registros de vacunas si se aplicaron
    if (prescription.vaccinesApplied && prescription.vaccinesApplied.length > 0) {
      for (const vaccineData of prescription.vaccinesApplied) {
        // Calcular fecha de vencimiento (generalmente 1 año después)
        const expirationDate = new Date(prescription.appointmentDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);

        const vaccine = new Vaccine({
          petId: prescription.petId,
          userId: prescription.userId,
          name: vaccineData.name,
          type: vaccineData.type,
          applicationDate: prescription.appointmentDate,
          expirationDate: expirationDate,
          nextDoseDate: vaccineData.nextDoseDate ? new Date(vaccineData.nextDoseDate) : null,
          vetId: prescription.vetId,
          vetName: appointment.vetId?.name || null,
          batchNumber: vaccineData.batchNumber || null,
          manufacturer: vaccineData.manufacturer || null,
          appointmentId: prescription.appointmentId,
          isUpToDate: true,
          isExpired: false
        });

        await vaccine.save();
        recordsCreated.vaccines.push(vaccine);

        // Crear recordatorio si hay próxima dosis
        if (vaccineData.nextDoseDate) {
          const nextDoseDateObj = new Date(vaccineData.nextDoseDate);
          const reminderDate = new Date(nextDoseDateObj);
          reminderDate.setDate(reminderDate.getDate() - 7); // 7 días antes

          const reminderText = await generateFriendlyReminderText('vaccine', pet.name, {
            title: `Vacuna: ${vaccineData.name}`,
            date: nextDoseDateObj
          });

          const reminder = new Reminder({
            userId: prescription.userId,
            petId: prescription.petId,
            type: 'vaccine',
            title: `Recordatorio: ${vaccineData.name}`,
            description: reminderText,
            dueDate: nextDoseDateObj,
            reminderDate: reminderDate,
            relatedVaccineId: vaccine._id,
            status: 'pending'
          });

          await reminder.save();
        }
      }
    }

    // 2. Crear registros de desparasitaciones si se aplicaron
    if (prescription.dewormingsApplied && prescription.dewormingsApplied.length > 0) {
      for (const dewormingData of prescription.dewormingsApplied) {
        const nextApplicationDate = calculateNextDewormingDate(
          pet.species,
          prescription.appointmentDate,
          dewormingData.type
        );

        const deworming = new Deworming({
          petId: prescription.petId,
          userId: prescription.userId,
          name: dewormingData.name,
          type: dewormingData.type,
          applicationDate: prescription.appointmentDate,
          nextApplicationDate: nextApplicationDate,
          productName: dewormingData.productName || null,
          activeIngredient: dewormingData.activeIngredient || null,
          dosage: dewormingData.dosage || null,
          vetId: prescription.vetId,
          vetName: appointment.vetId?.name || null,
          appointmentId: prescription.appointmentId,
          isUpToDate: true
        });

        await deworming.save();
        recordsCreated.dewormings.push(deworming);

        // Crear recordatorio para la próxima desparasitación
        const reminderDate = new Date(nextApplicationDate);
        reminderDate.setDate(reminderDate.getDate() - 7); // 7 días antes

        const reminderText = await generateFriendlyReminderText('deworming', pet.name, {
          title: `Desparasitación: ${dewormingData.name}`,
          date: nextApplicationDate
        });

        const reminder = new Reminder({
          userId: prescription.userId,
          petId: prescription.petId,
          type: 'deworming',
          title: `Recordatorio: Desparasitación`,
          description: reminderText,
          dueDate: new Date(nextApplicationDate),
          reminderDate: reminderDate,
          relatedDewormingId: deworming._id,
          status: 'pending',
          isRecurring: true,
          recurrenceInterval: 90
        });

        await reminder.save();
      }
    }

    // 3. Crear registro médico desde la prescripción
    const diagnosis = [];
    if (prescription.prescription?.symptoms) {
      // Extraer posibles diagnósticos de los síntomas (básico, se puede mejorar con IA)
      diagnosis.push('Consulta médica');
    }

    const medicalRecord = new MedicalRecord({
      petId: prescription.petId,
      userId: prescription.userId,
      recordType: 'consultation',
      title: `Consulta - ${prescription.appointmentDate.toLocaleDateString('es-CL')}`,
      description: prescription.prescription?.symptoms || 'Consulta médica',
      date: prescription.appointmentDate,
      diagnosis: diagnosis,
      symptoms: prescription.prescription?.symptoms ? [prescription.prescription.symptoms] : [],
      treatment: prescription.prescription?.instructions || '',
      medications: prescription.prescription?.medication ? [{
        name: prescription.prescription.medication,
        dosage: prescription.prescription.dosage || '',
        duration: ''
      }] : [],
      vetId: prescription.vetId,
      vetName: appointment.vetId?.name || null,
      appointmentId: prescription.appointmentId,
      prescriptionId: prescription._id,
      weightAtTime: prescription.weightAtConsultation || null
    });

    await medicalRecord.save();
    recordsCreated.medicalRecord = medicalRecord;

    // 4. Actualizar peso de la mascota si se registró
    if (prescription.weightAtConsultation) {
      const Pet = (await import('../models/Pet.js')).default;
      await Pet.findByIdAndUpdate(prescription.petId, {
        weight: prescription.weightAtConsultation
      });
    }

    return recordsCreated;
  } catch (error) {
    console.error('Error al crear registros médicos desde prescripción:', error);
    throw error;
  }
};

