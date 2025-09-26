import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import VetSidebar from "../components/VetSidebar";

const OngoingAppointment = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [prescription, setPrescription] = useState({
    symptoms: "",
    medication: "",
    dosage: "",
    instructions: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`/api/appointments/${appointmentId}`);
        setAppointment(res.data.appointment);
      } catch (err) {
        console.error("❌ Error al obtener la cita:", err.response?.data || err.message);
        alert("No se pudieron cargar los detalles de la cita.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrescription((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFinishAppointment = async () => {
    const { medication, dosage, instructions, symptoms } = prescription;
  
    if (!medication || !dosage || !instructions || !symptoms) {
      alert("Por favor completa todos los campos de la receta.");
      return;
    }
  
    try {
      setSubmitting(true);
  
      // Step 1: Update appointment status
      console.log("📤 Updating appointment status...");
      const statusPayload = {
        appointmentId,
        status: "completed",
      };
      console.log("🔁 Status Payload:", statusPayload);
  
      const statusRes = await axios.put(`/api/appointments/${appointmentId}/status`, statusPayload);
      console.log("✅ Status update response:", statusRes.data);
  
      // Step 2: Prepare full prescription data
      const prescriptionPayload = {
        symptoms,
        medication,
        dosage,
        instructions,
        petId: appointment.petId?._id,
        userId: appointment.userId?._id,
        vetId: appointment.vetId?._id,
        appointmentDate: appointment.appointmentDate,
        scheduledTime: appointment.scheduledTime,
      };
  
      console.log("📦 Full Prescription Payload:", prescriptionPayload);
  
      // Step 3: Submit prescription
      const prescriptionRes = await axios.put(
        `/api/appointments/${appointmentId}/prescription`,
        prescriptionPayload
      );
      console.log("✅ Prescription update response:", prescriptionRes.data);
  
      alert("✅ Appointment completed successfully.");
      navigate("/vet-dashboard");
    } catch (err) {
      console.error("❌ Error finishing appointment:", err.response?.data || err.message);
      alert("Failed to complete appointment. Check logs for details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <VetSidebar />

      <div className="flex-1 container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Cita en Curso</h1>

        {loading ? (
          <p className="text-gray-500">Cargando detalles de la cita...</p>
        ) : appointment ? (
          <div className="space-y-6" style={{ maxWidth: "60%" }}>
            <div className="bg-white p-4 rounded shadow-md flex items-center">
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">Detalles de la Cita</h2>
                <p><strong>Nombre de la Mascota:</strong> {appointment.petId?.name || "N/A"}</p>
                <p><strong>Fecha:</strong> {new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                <p><strong>Hora:</strong> {appointment.scheduledTime}</p>
              </div>
              <div className="ml-4">
                <img
                  src={appointment.petId?.image || "/default-pet.jpg"}
                  alt={appointment.petId?.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow-md">
              <h2 className="text-lg font-semibold mb-4">Receta</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Síntomas</label>
                  <textarea
                    name="symptoms"
                    value={prescription.symptoms}
                    onChange={handleChange}
                    rows={5}
                    className="w-full border p-2 rounded resize-none text-sm bg-gray-50 leading-6 font-mono"
                    placeholder="ej. Vómitos, diarrea"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, transparent, transparent 21px, rgba(0,0,0,0.08) 22px)",
                      backgroundSize: "100% 22px",
                      overflow: "hidden"
                    }}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Medicamento</label>
                  <textarea
                    name="medication"
                    value={prescription.medication}
                    onChange={handleChange}
                    rows={5}
                    className="w-full border p-2 rounded resize-none text-sm bg-gray-50 leading-6 font-mono"
                    placeholder="ej. Amoxicilina"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, transparent, transparent 21px, rgba(0,0,0,0.08) 22px)",
                      backgroundSize: "100% 22px",
                      overflow: "hidden"
                    }}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Dosis</label>
                  <textarea
                    name="dosage"
                    value={prescription.dosage}
                    onChange={handleChange}
                    rows={5}
                    className="w-full border p-2 rounded resize-none text-sm bg-gray-50 leading-6 font-mono"
                    placeholder="ej. 250mg dos veces al día"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, transparent, transparent 21px, rgba(0,0,0,0.1) 22px)",
                      backgroundSize: "100% 22px",
                      overflow: "hidden"
                    }}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Instrucciones</label>
                  <textarea
                    name="instructions"
                    value={prescription.instructions}
                    onChange={handleChange}
                    rows={5}
                    className="w-full border p-2 rounded resize-none text-sm bg-gray-50 leading-6 font-mono"
                    placeholder="ej. Tomar después de las comidas durante 5 días"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, transparent, transparent 21px, rgba(0,0,0,0.08) 22px)",
                      backgroundSize: "100% 22px",
                      overflow: "hidden"
                    }}
                  />
                </div>
              </form>
            </div>

            <div className="text-right">
              <button
                onClick={handleFinishAppointment}
                className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={submitting}
              >
                {submitting ? "Finalizando..." : "Finalizar Cita"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-red-500">Cita no encontrada.</p>
        )}
      </div>
    </div>
  );
};

export default OngoingAppointment;
