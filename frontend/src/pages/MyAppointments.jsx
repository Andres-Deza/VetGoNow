import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar"; // Assuming Sidebar component is correctly imported

const MyAppointments = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdditionalDetails = async (appointments, token) => {
    const updatedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        try {
          const [vetRes, petRes] = await Promise.all([
            axios.get(`/api/vets/${appointment.vetId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`/api/appointments/pets/${appointment.petId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
  

  
          return {
            ...appointment,
            vetName: vetRes.data.name,
            petName: petRes.data.name,
            petImage: petRes.data.image, // optional: if you're showing pet image
          };
        } catch (err) {
          console.error(`❌ Error al obtener detalles del veterinario (${appointment.vetId}) o mascota (${appointment.petId}):`, err.message);
          return {
            ...appointment,
            vetName: "Veterinario desconocido",
            petName: "Mascota desconocida",
          };
        }
      })
    );
  
    setAppointments(updatedAppointments);
  };
  

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!token || !storedUser) {
      alert("Sesión expirada. Por favor inicia sesión nuevamente.");
      navigate("/login");
      return;
    }

    setUser(storedUser);
    const userId = storedUser.id;

    if (!userId) {
      setError("Información de usuario inválida. Por favor inicia sesión nuevamente.");
      return;
    }

    axios
      .get(`/api/appointments/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const fetchedAppointments = res.data.appointments || res.data;
        fetchAdditionalDetails(fetchedAppointments, token);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al obtener las citas:", err);
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return <p className="p-6">Cargando citas...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-500">{error}</p>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-1 p-6 space-x-6">
        <div className="flex-1 space-y-6">
          <h1 className="text-3xl font-semibold text-gray-800">Mis Citas</h1>

          {/* Next Appointment */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Próxima Cita</h2>
            {appointments
              .filter((a) => a.status === "scheduled" && new Date(a.appointmentDate) > new Date())
              .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))[0] ? (
              <div className="bg-gray-50 p-4 rounded-lg shadow flex items-center justify-between">
                {(() => {
                  const nextAppointment = appointments
                    .filter((a) => a.status === "scheduled" && new Date(a.appointmentDate) > new Date())
                    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))[0];
                  return (
                    <>
                      <div className="flex items-center space-x-4">
                        <img
                          src={nextAppointment.petImage || "default_pet_image.jpg"}
                          alt="Pet"
                          className="w-14 h-14 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold">Vet: Dr. {nextAppointment.vetName || nextAppointment.vetId}</p>
                          <p>Pet: {nextAppointment.petName || nextAppointment.petId}</p>
                          <p>Fecha: {new Date(nextAppointment.appointmentDate).toLocaleDateString()}</p>
                          <p>Hora: {nextAppointment.scheduledTime}</p>
                          <p>
                            <strong>Tipo:</strong>{" "}
                            {nextAppointment.appointmentType === "online consultation"
                              ? "Consulta en Línea"
                              : "Cita Presencial"}
                          </p>
                        </div>

                      </div>
                      {nextAppointment.appointmentType === "online consultation" ? (
                        <button
                          onClick={() => navigate(`/client/video-call/:appointmentId`)}
                          className="px-3 py-1 text-sm rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                          Unirse a la Consulta
                        </button>
                      ) : (
                        <span className="px-3 py-1 text-sm rounded-full bg-blue-300 text-blue-800">
                          Programada
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-gray-500">No hay citas próximas programadas.</p>
            )}
          </div>


          {/* Pending Appointments */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Solicitudes Pendientes</h2>
            {appointments.filter((a) => a.status === "pending").length > 0 ? (
              <div className="space-y-4">
                {appointments
                  .filter((a) => a.status === "pending")
                  .map((a) => (
                    <div
                      key={a._id}
                      className="bg-gray-50 p-4 rounded-lg shadow flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={a.petImage || "default_pet_image.jpg"}
                          alt="Pet"
                          className="w-14 h-14 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold">Vet: Dr. {a.vetName || a.vetId}</p>
                          <p>Pet: {a.petName || a.petId}</p>
                          <p>Fecha: {new Date(a.appointmentDate).toLocaleDateString()}</p>
                          <p>Hora: {a.scheduledTime}</p>
                          <p>
                            <strong>Tipo:</strong>{" "}
                            {a.appointmentType === "online consultation" ? "Consulta en Línea" : "Cita Presencial"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-sm rounded-full bg-yellow-300 text-yellow-800">
                        Pendiente
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay citas pendientes actualmente.</p>
            )}
          </div>

          {/* Scheduled Appointments */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Citas Próximas</h2>
            {appointments.filter((a) => a.status === "scheduled").length > 0 ? (
              <div className="space-y-4">
                {appointments
                  .filter((a) => a.status === "scheduled")
                  .map((a) => (
                    <div
                      key={a._id}
                      className="bg-gray-50 p-4 rounded-lg shadow flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={a.petImage || "default_pet_image.jpg"}
                          alt="Pet"
                          className="w-14 h-14 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold">Vet: Dr. {a.vetName || a.vetId}</p>
                          <p>Pet: {a.petName || a.petId}</p>
                          <p>Fecha: {new Date(a.appointmentDate).toLocaleDateString()}</p>
                          <p>Hora: {a.scheduledTime}</p>
                          <p>
                            <strong>Tipo:</strong>{" "}
                            {a.appointmentType === "online consultation" ? "Consulta en Línea" : "Cita Presencial"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-sm rounded-full bg-blue-300 text-blue-800">
                        Programada
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay citas programadas actualmente.</p>
            )}
          </div>
        </div>

        {/* Right Section: Recent Completed */}
        <div className="w-1/3">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Completadas Recientemente</h2>
            <div className="space-y-4">
              {appointments.filter((a) => a.status === "completed").length === 0 ? (
                <p className="text-sm text-gray-600">No hay citas completadas.</p>
              ) : (
                <>
                  {appointments
                    .filter((a) => a.status === "completed")
                    .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
                    .slice(0, 3)
                    .map((a) => (
                      <div
                        key={a._id}
                        onClick={() => navigate(`/prescription/${a._id}`)}
                        className="bg-gray-50 p-3 rounded-md hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden">
                            <img
                              src={a.petImage || "default_pet_image.jpg"}
                              alt="Pet"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{a.petName || a.petId}</p>
                            <p className="text-xs text-gray-500">{a.vetName || "Unknown Vet"}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(a.appointmentDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              <strong>Tipo:</strong>{" "}
                              {a.appointmentType === "online consultation" ? "Consulta en Línea" : "Cita Presencial"}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full">
                              Completada
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* See All History Button */}
                  <div className="mt-4 text-right">
                    <button
                      onClick={() => navigate('/client/history')}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      Ver todo el historial &gt;&gt;&gt;
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAppointments;
