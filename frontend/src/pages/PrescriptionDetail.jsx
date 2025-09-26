import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const PrescriptionDetail = () => {
  const { appointmentId } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [pet, setPet] = useState(null);
  const [user, setUser] = useState(null);
  const [vet, setVet] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
    const fetchPrescription = async () => {
      try {
        const res = await axios.get(`/api/appointments/${appointmentId}/prescriptionform`);
        const data = res.data.prescription;

        setPrescription(data.prescription);
        setPet(data.petId);
        setUser(data.userId);
        setVet(data.vetId);
        setAppointment({
          date: data.appointmentDate,
          time: data.scheduledTime,
        });

      } catch (err) {
        console.error("❌ Error al obtener la receta:", err);
        setError("No se pudo cargar la receta.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [appointmentId]);

  const handleDownload = () => {
    const element = pdfRef.current;
    const opt = {
      margin: 0.5,
      filename: `Prescription-${appointmentId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
    };
    window.html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 p-6 bg-gray-100">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Detalles de la receta</h1>

        {loading && <p>Cargando receta...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && prescription && pet && user && vet && (
          <>
            <button
              onClick={handleDownload}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Descargar como PDF
            </button>

            <div ref={pdfRef} className="bg-white p-8 rounded-lg shadow-md text-[12px] font-sans w-full max-w-4xl mx-auto space-y-4">
              {/* Encabezado */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Receta oficial de VetGestion</h2>
                <p className="text-xs text-gray-500">Generado el: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <h3 className="font-semibold text-xs">Vet Information</h3>
                  <p className="text-xs">Name: Dr. {vet.name}</p>
                  <p className="text-xs">Email: {vet.email}</p>
                  <p className="text-xs">Specialization: {vet.specialization || "N/A"}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-xs">User Information</h3>
                  <p className="text-xs">Name: {user.name}</p>
                  <p className="text-xs">Email: {user.email}</p>
                  <p className="text-xs">Phone: {user.phone || "N/A"}</p>
                </div>
              </div>

              {/* Pet & Appointment */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <h3 className="font-semibold text-xs">Pet Information</h3>
                  <p className="text-xs">Name: {pet.name}</p>
                  <p className="text-xs">Breed: {pet.breed}</p>
                  <p className="text-xs">Gender: {pet.gender}</p>
                  <p className="text-xs">Color: {pet.color}</p>
                  <p className="text-xs">Date of Birth: {new Date(pet.dob).toLocaleDateString()}</p>
                </div>

                <div className="flex justify-center items-center">
                  <img src={pet.image} alt={pet.name} className="h-24 w-24 rounded-full object-cover border" />
                </div>
              </div>

              {/* Prescription Section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Prescription Details</h3>

                {/* Appointment Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs"><strong>Appointment Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs"><strong>Scheduled Time:</strong> {appointment.time}</p>
                  </div>
                </div>

{/* Prescription Fields with 5-Line Boxes */}
<div className="grid grid-cols-1 gap-2">
  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Symptoms:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.symptoms || "N/A"}
    </div>
  </div>

  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Medication:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.medication || "N/A"}
    </div>
  </div>

  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Dosage:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.dosage || "N/A"}
    </div>
  </div>

  <div className="border p-1 rounded-lg shadow-sm">
    <p className="text-xs font-semibold mb-1">Instructions:</p>
    <div className="w-full bg-gray-100 p-1 rounded-lg h-32 text-xs overflow-y-auto whitespace-pre-wrap text-left align-top">
      {prescription.instructions || "N/A"}
    </div>
  </div>
</div>


                {/* Pet Age */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs"><strong>Pet Age:</strong> {pet ? Math.floor((new Date() - new Date(pet.dob)) / (1000 * 60 * 60 * 24 * 365)) : "N/A"} years</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t text-xs text-gray-500 text-center">
                VetGestion &copy; {new Date().getFullYear()} | This is an electronically generated prescription.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrescriptionDetail;
