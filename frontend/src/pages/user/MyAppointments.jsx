import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const MyAppointments = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loadingEmergency, setLoadingEmergency] = useState(true);

  const fetchAdditionalDetails = async (appointments, token) => {
    if (!appointments || appointments.length === 0) {
      setAppointments([]);
      return;
    }
    
    // Optimización: usar Promise.allSettled para no fallar si una petición falla
    const updatedAppointments = await Promise.allSettled(
      appointments.map(async (appointment) => {
        try {
          // Validar que vetId y petId existan antes de hacer las peticiones
          const vetId = appointment.vetId?._id || appointment.vetId;
          const petId = appointment.petId?._id || appointment.petId;

          const promises = [];
          
          // Solo obtener detalles del vet si existe
          if (vetId) {
            promises.push(
              axios.get(`${API_BASE}/api/vets/${vetId}`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then(res => ({ type: 'vet', data: res.data }))
            );
          } else {
            promises.push(Promise.resolve({ type: 'vet', data: null }));
          }

          // Solo obtener detalles de la mascota si existe
          if (petId) {
            promises.push(
              axios.get(`${API_BASE}/api/appointments/pets/${petId}`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then(res => ({ type: 'pet', data: res.data }))
            );
          } else {
            promises.push(Promise.resolve({ type: 'pet', data: null }));
          }

          const results = await Promise.all(promises);
          const vetRes = results.find(r => r.type === 'vet');
          const petRes = results.find(r => r.type === 'pet');
  
          // Función helper para formatear la dirección de la clínica
          const getClinicAddress = (vet) => {
            if (!vet || !vet.clinicAddress) return null;
            
            const addr = vet.clinicAddress;
            const parts = [];
            
            // Construir dirección completa
            if (addr.street) parts.push(addr.street);
            if (addr.number) parts.push(addr.number);
            
            if (parts.length > 0) {
              const streetAddress = parts.join(' ');
              const locationParts = [];
              
              if (addr.commune) locationParts.push(addr.commune);
              if (addr.region) locationParts.push(addr.region);
              
              if (locationParts.length > 0) {
                return `${streetAddress}, ${locationParts.join(', ')}`;
              }
              return streetAddress;
            }
            
            // Si solo hay comuna y región en clinicAddress, usarlos
            if (addr.commune || addr.region) {
              const locationParts = [];
              if (addr.commune) locationParts.push(addr.commune);
              if (addr.region) locationParts.push(addr.region);
              return locationParts.join(', ');
            }
            
            return null;
          };

          return {
            ...appointment,
            vetName: vetRes?.data?.name || (vetId ? "Veterinario desconocido" : "Por asignar"),
            petName: petRes?.data?.name || "Mascota desconocida",
            petImage: petRes?.data?.image || null,
            vetData: vetRes?.data || null,
            clinicAddress: vetRes?.data ? getClinicAddress(vetRes.data) : null,
          };
        } catch (err) {
          console.error(`❌ Error al obtener detalles del veterinario (${appointment.vetId}) o mascota (${appointment.petId}):`, err.message);
          return {
            ...appointment,
            vetName: appointment.vetId ? "Veterinario desconocido" : "Por asignar",
            petName: "Mascota desconocida",
          };
        }
      })
    );
  
    // Extraer valores de Promise.allSettled
    const results = updatedAppointments.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Si falló, retornar un objeto con valores por defecto
        return {
          vetName: "Veterinario desconocido",
          petName: "Mascota desconocida",
          ...result.reason,
        };
      }
    });
  
    setAppointments(results);
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
      .then(async (res) => {
        const fetchedAppointments = res.data.appointments || res.data;
        // Esperar a que se procesen todos los detalles antes de marcar como cargado
        await fetchAdditionalDetails(fetchedAppointments, token);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al obtener las citas:", err);
        setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    const fetchActiveEmergency = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadingEmergency(false);
        return;
      }

      try {
        const { data } = await axios.get(`${API_BASE}/api/emergency/user-active`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Filtrar emergencias completadas en el frontend también
        const activeEmergencies = Array.isArray(data?.emergencies) 
          ? data.emergencies.filter(e => e.status !== 'completed' && e.tracking?.status !== 'completed')
          : [];
        
        if (activeEmergencies.length > 0) {
          setActiveEmergency(activeEmergencies[0]);
        } else if (data?.emergency && data.emergency.status !== 'completed' && data.emergency.tracking?.status !== 'completed') {
          setActiveEmergency(data.emergency);
        } else {
          setActiveEmergency(null);
        }
      } catch (fetchError) {
        console.error("Error obteniendo urgencias activas:", fetchError);
        setActiveEmergency(null);
      } finally {
        setLoadingEmergency(false);
      }
    };

    fetchActiveEmergency();
  }, []);

  // Conectar al socket para escuchar eventos de cancelación
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!token || !storedUser) return;

    const socket = io(`${API_BASE}/emergency`, {
      transports: ["websocket"],
      auth: { token }
    });

    socket.on("connect", () => {
      console.log("Conectado al socket de emergencias en MyAppointments");
      socket.emit("join:user", storedUser.id);
    });

    // Escuchar cuando se cancela la emergencia
    socket.on("emergency:cancelled", (data) => {
      console.log("Emergencia cancelada:", data);
      setActiveEmergency((prev) => {
        if (prev && (
          prev.id === data.emergencyId ||
          prev._id === data.emergencyId ||
          prev.requestId === data.emergencyId
        )) {
          return null;
        }
        return prev;
      });
    });

    socket.on("emergency:no-vets", (data) => {
      console.log("No hay veterinarios disponibles:", data);
      setActiveEmergency((prev) => {
        if (prev && (
          prev.id === data.emergencyId ||
          prev._id === data.emergencyId ||
          prev.requestId === data.emergencyId
        )) {
          return null;
        }
        return prev;
      });
    });

    socket.on("emergency:completed", (data) => {
      console.log("Urgencia completada:", data);
      setActiveEmergency((prev) => {
        if (prev && (
          prev.id === data.appointmentId ||
          prev._id === data.appointmentId ||
          prev.requestId === data.appointmentId
        )) {
          return null;
        }
        return prev;
      });
      // Refrescar la lista de citas para incluir la emergencia completada
      const token = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (token && storedUser) {
        axios
          .get(`${API_BASE}/api/appointments/users/${storedUser.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const fetchedAppointments = res.data.appointments || res.data;
            fetchAdditionalDetails(fetchedAppointments, token);
          })
          .catch((err) => {
            console.error("Error al refrescar citas:", err);
          });
      }
    });

    socket.on("status:updated", (data) => {
      if (data.status === "completed") {
        console.log("Estado actualizado a completado:", data);
        setActiveEmergency(null);
        // Refrescar la lista de citas para incluir la emergencia completada
        const token = localStorage.getItem("token");
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (token && storedUser) {
          axios
            .get(`${API_BASE}/api/appointments/users/${storedUser.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
              const fetchedAppointments = res.data.appointments || res.data;
              fetchAdditionalDetails(fetchedAppointments, token);
            })
            .catch((err) => {
              console.error("Error al refrescar citas:", err);
            });
        }
      }
    });

    return () => {
      socket.off("emergency:cancelled");
      socket.off("emergency:no-vets");
      socket.off("emergency:completed");
      socket.off("status:updated");
      socket.disconnect();
    };
  }, [API_BASE]);

  // Refrescar la emergencia activa periódicamente para asegurar sincronización
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const { data } = await axios.get(`${API_BASE}/api/emergency/user-active`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Filtrar emergencias completadas en el frontend también
        const activeEmergencies = Array.isArray(data?.emergencies) 
          ? data.emergencies.filter(e => e.status !== 'completed' && e.tracking?.status !== 'completed')
          : [];
        
        if (activeEmergencies.length > 0) {
          setActiveEmergency(activeEmergencies[0]);
        } else if (data?.emergency && data.emergency.status !== 'completed' && data.emergency.tracking?.status !== 'completed') {
          setActiveEmergency(data.emergency);
        } else {
          setActiveEmergency(null);
        }
      } catch (error) {
        // Silenciar errores de polling
        console.error("Error refrescando urgencias activas:", error);
      }
    }, 10000); // Refrescar cada 10 segundos

    return () => clearInterval(intervalId);
  }, [API_BASE]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 max-w-md w-full mx-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Spinner animado */}
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            {/* Texto de carga */}
            <div className="text-center space-y-2">
              <p className="text-lg md:text-xl font-semibold text-gray-800">Cargando tus citas</p>
              <p className="text-sm md:text-base text-gray-500">Por favor espera un momento...</p>
            </div>
            {/* Skeleton cards como preview */}
            <div className="w-full space-y-3 mt-6">
              <div className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
              <div className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="min-h-screen bg-gray-100"><p className="p-4 md:p-6 text-red-500 text-sm md:text-base">{error}</p></div>;
  }

  // Verificar si hay citas
  const hasAppointments = appointments.length > 0;
  const formatCurrency = (value) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(value ?? 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header con título y botón */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-800">Tus citas</h1>
          <button
            onClick={() => navigate('/agendar-cita')}
            className="px-4 md:px-6 py-2 md:py-3 bg-violet-600 text-white rounded-lg md:rounded-xl font-medium hover:bg-violet-700 active:bg-violet-800 transition-all active:scale-95 text-sm md:text-base"
          >
            Agendar cita
          </button>
        </div>

        {!loadingEmergency && activeEmergency && (
          <div className="mb-6 bg-violet-600 text-white rounded-2xl p-5 md:p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-violet-100">
                  Urgencia en curso
                </p>
                <h2 className="text-xl md:text-2xl font-semibold mt-1">
                  {activeEmergency.pet?.name || "Mascota"}
                </h2>
                <p className="text-sm text-violet-100 mt-2">
                  Retoma el seguimiento o chatea con el veterinario mientras la atención está activa.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={() =>
                    navigate(
                      `/emergency/${
                        activeEmergency.requestId ||
                        activeEmergency.id ||
                        activeEmergency._id
                      }/tracking`
                    )
                  }
                  className="px-4 py-2 bg-white text-violet-700 font-semibold rounded-xl shadow hover:bg-violet-50 transition"
                >
                  Ver seguimiento
                </button>
                {activeEmergency.conversationId && (
                  <button
                    onClick={() =>
                      navigate(
                        `/conversations/${activeEmergency.conversationId}`
                      )
                    }
                    className="px-4 py-2 bg-white/10 border border-white/40 text-white font-semibold rounded-xl hover:bg-white/20 transition"
                  >
                    Abrir chat
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm">
              <div>
                <p className="text-violet-100 uppercase tracking-wide text-xs">
                  Estado
                </p>
                <p className="font-medium">
                  {activeEmergency.status === "on-way"
                    ? "Veterinario en camino"
                    : activeEmergency.status === "arrived"
                    ? "El veterinario ha llegado"
                    : activeEmergency.status === "in-service"
                    ? "Atención en progreso"
                    : "Coordinando veterinario"}
                </p>
              </div>
              <div>
                <p className="text-violet-100 uppercase tracking-wide text-xs">
                  Costo estimado
                </p>
                <p className="font-medium">
                  {formatCurrency(activeEmergency.pricing?.total)}
                </p>
              </div>
              <div>
                <p className="text-violet-100 uppercase tracking-wide text-xs">
                  Veterinario asignado
                </p>
                <p className="font-medium">
                  {activeEmergency.vet?.name || "Por confirmar"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estado vacío cuando no hay citas */}
        {!hasAppointments ? (
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-48 h-48 md:w-64 md:h-64 mb-6 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cuerpo del perro */}
                <ellipse cx="100" cy="130" rx="50" ry="40" fill="#8B4513" />
                {/* Cabeza */}
                <circle cx="100" cy="80" r="40" fill="#8B4513" />
                {/* Mancha blanca en el pecho */}
                <ellipse cx="100" cy="120" rx="25" ry="30" fill="#F5F5DC" />
                {/* Mancha blanca en la cabeza */}
                <ellipse cx="100" cy="85" rx="20" ry="25" fill="#F5F5DC" />
                {/* Oreja izquierda */}
                <path d="M70 60 Q60 50 65 70 Q70 75 75 70" fill="#8B4513" />
                {/* Oreja derecha */}
                <path d="M130 60 Q140 50 135 70 Q130 75 125 70" fill="#8B4513" />
                {/* Ojo izquierdo */}
                <circle cx="90" cy="75" r="4" fill="#000" />
                {/* Ojo derecho */}
                <circle cx="110" cy="75" r="4" fill="#000" />
                {/* Nariz */}
                <ellipse cx="100" cy="88" rx="3" ry="2" fill="#000" />
                {/* Boca */}
                <path d="M100 88 Q95 95 90 92" stroke="#000" strokeWidth="2" fill="none" />
                <path d="M100 88 Q105 95 110 92" stroke="#000" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <p className="text-base md:text-lg text-gray-900 font-medium">Aún no tienes citas programadas.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row flex-1 gap-4 md:gap-6">
            <div className="flex-1 space-y-4 md:space-y-6">

          {/* Pending Appointments */}
          <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-lg shadow">
            <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-700 mb-2 md:mb-3">Solicitudes Pendientes</h2>
            {appointments.filter((a) => a.status === "pending").length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {appointments
                  .filter((a) => a.status === "pending")
                  .map((a) => (
                    <div
                      key={a._id}
                      className="bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-lg shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                        <img
                          src={a.petImage || "default_pet_image.jpg"}
                          alt="Pet"
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base truncate">Vet: Dr. {a.vetName || a.vetId}</p>
                          <p className="text-xs md:text-sm text-gray-600 truncate">Pet: {a.petName || a.petId}</p>
                          <p className="text-xs md:text-sm text-gray-600">Fecha: {new Date(a.appointmentDate).toLocaleDateString()}</p>
                          <p className="text-xs md:text-sm text-gray-600">Hora: {a.scheduledTime}</p>
                          <p className="text-xs md:text-sm text-gray-600">
                            <strong>Tipo:</strong>{" "}
                            {a.appointmentType === "online consultation" ? "Consulta en Línea" : "Cita Presencial"}
                          </p>
                          {/* Mostrar dirección de la clínica si es cita presencial y el vet es una clínica */}
                          {a.appointmentType !== "online consultation" && a.clinicAddress && (
                            <p className="text-xs md:text-sm text-gray-600 mt-1 flex items-start gap-1">
                              <svg className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate">{a.clinicAddress}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-3 md:px-4 py-2 text-xs md:text-sm rounded-full bg-yellow-300 text-yellow-800 whitespace-nowrap flex-shrink-0">
                        Pendiente
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm md:text-base">No hay citas pendientes actualmente.</p>
            )}
          </div>

          {/* Scheduled Appointments */}
          <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-lg shadow">
            <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-700 mb-2 md:mb-3">Citas Próximas</h2>
            {appointments.filter((a) => a.status === "scheduled").length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {appointments
                  .filter((a) => a.status === "scheduled")
                  .map((a) => (
                    <div
                      key={a._id}
                      className="bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-lg shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4"
                    >
                      <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                        <img
                          src={a.petImage || "default_pet_image.jpg"}
                          alt="Pet"
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base truncate">Vet: Dr. {a.vetName || a.vetId}</p>
                          <p className="text-xs md:text-sm text-gray-600 truncate">Pet: {a.petName || a.petId}</p>
                          <p className="text-xs md:text-sm text-gray-600">Fecha: {new Date(a.appointmentDate).toLocaleDateString()}</p>
                          <p className="text-xs md:text-sm text-gray-600">Hora: {a.scheduledTime}</p>
                          <p className="text-xs md:text-sm text-gray-600">
                            <strong>Tipo:</strong>{" "}
                            {a.appointmentType === "online consultation" ? "Consulta en Línea" : "Cita Presencial"}
                          </p>
                          {/* Mostrar dirección de la clínica si es cita presencial y el vet es una clínica */}
                          {a.appointmentType !== "online consultation" && a.clinicAddress && (
                            <p className="text-xs md:text-sm text-gray-600 mt-1 flex items-start gap-1">
                              <svg className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate">{a.clinicAddress}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="px-3 md:px-4 py-2 text-xs md:text-sm rounded-full bg-blue-300 text-blue-800 whitespace-nowrap">
                          Programada
                        </span>
                        {/* Botón para unirse a videollamada si es consulta en línea */}
                        {a.appointmentType === "online consultation" && (
                          <button
                            onClick={() => navigate(`/client/video-call/${a._id}`)}
                            className="px-3 md:px-4 py-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Unirse a videollamada
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm md:text-base">No hay citas programadas actualmente.</p>
            )}
          </div>
        </div>

        {/* Right Section: Recent Completed */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-lg shadow-md">
            <h2 className="text-base md:text-lg lg:text-xl font-semibold text-gray-800 mb-2 md:mb-3">Completadas Recientemente</h2>
            <div className="space-y-3 md:space-y-4">
              {appointments.filter((a) => a.status === "completed").length === 0 ? (
                <p className="text-xs md:text-sm text-gray-600">No hay citas completadas.</p>
              ) : (
                <>
                  {appointments
                    .filter((a) => a.status === "completed")
                    .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
                    .slice(0, 3)
                    .map((a) => (
                      <div
                        key={a._id}
                        onClick={() => {
                          if (a.isEmergency) {
                            navigate(`/emergency/${a._id}/tracking`);
                          } else {
                            navigate(`/prescription/${a._id}`);
                          }
                        }}
                        className="bg-gray-50 p-3 rounded-xl md:rounded-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                      >
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={a.petImage || "default_pet_image.jpg"}
                              alt="Pet"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">{a.petName || a.petId}</p>
                            <p className="text-xs text-gray-500 truncate">{a.vetName || "Unknown Vet"}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(a.appointmentDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              <strong>Tipo:</strong>{" "}
                              {a.isEmergency ? "Urgencia" : (a.appointmentType === "online consultation" ? "Consulta en Línea" : "Cita Presencial")}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full">
                              Completada
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* See All History Button */}
                  <div className="mt-3 md:mt-4 text-right">
                    <button
                      onClick={() => navigate('/client/history')}
                      className="text-blue-600 hover:underline text-xs md:text-sm font-medium active:scale-95 transition-transform"
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
        )}
      </div>
    </div>
  );
};

export default MyAppointments;
