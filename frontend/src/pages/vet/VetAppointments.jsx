import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import CancelAppointmentModal from "../../components/vet/CancelAppointmentModal";
import RejectEmergencyModal from "../../components/vet/RejectEmergencyModal";
import ReportIncidentModal from "../../components/vet/ReportIncidentModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5555";

const REASON_LABELS = {
  trauma: "Golpe / Trauma",
  bleeding: "Sangrado",
  seizures: "Convulsiones",
  choking: "Ahogo",
  vomiting: "Vómitos persistentes",
  poisoning: "Envenenamiento",
  fever: "Fiebre alta",
  urination: "Retención urinaria",
  pain: "Dolor intenso",
  other: "Otro"
};

const formatReason = (reason) =>
  REASON_LABELS[reason] ||
  reason?.replace(/[_-]/g, " ")?.replace(/\b\w/g, (char) => char.toUpperCase());

const VetAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const navigate = useNavigate();

  const vet = JSON.parse(localStorage.getItem("user") || "{}");
  const vetId = vet?.id;
  const token = localStorage.getItem("token");

  const fetchAppointments = useCallback(async () => {
    if (!vetId || !token) {
      setError("No se pudo obtener la sesión del veterinario. Intenta iniciar sesión nuevamente.");
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${API_BASE}/api/appointments/vets/${vetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const baseAppointments = data.appointments || [];

      // Los datos ya están populados desde el backend, usar directamente
      const enriched = baseAppointments.map((appointment) => {
        // Usar los datos populados del backend
        const petName = appointment.petId?.name || "Mascota";
        const petImage = appointment.petId?.image || null;
        const userName = appointment.userId?.name || "Tutor";
        const vetName = appointment.vetId?.name || "Veterinario";

        return {
          ...appointment,
          vetName,
          petName,
          petImage,
          userName,
        };
      });

      setAppointments(enriched);
    } catch (err) {
      console.error("Error obteniendo citas del veterinario:", err);
      setError("No pudimos cargar tus citas. Intenta nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  }, [vetId, token]);

  const fetchActiveEmergency = useCallback(async () => {
    if (!vetId || !token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/api/vets/${vetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.activeEmergency) {
        const fetchEmergency = await axios.get(
          `${API_BASE}/api/emergency/${data.activeEmergency}/tracking`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (fetchEmergency.data?.success) {
          const emergency = fetchEmergency.data.request;
          // No mostrar emergencias completadas como activas
          if (emergency.status !== 'completed' && emergency.tracking?.status !== 'completed') {
            setActiveEmergency({
              ...emergency,
              conversationId: fetchEmergency.data.conversationId || null
            });
          } else {
            setActiveEmergency(null);
          }
        }
      } else {
        setActiveEmergency(null);
      }
    } catch (err) {
      console.error("Error obteniendo urgencia activa:", err);
    }
  }, [token, vetId]);

  useEffect(() => {
    fetchAppointments();
    fetchActiveEmergency();
  }, [fetchActiveEmergency, fetchAppointments]);

  // Conectar al socket para escuchar eventos de emergencia completada
  useEffect(() => {
    if (!vetId || !token) return;

    const socket = io(`${API_BASE}/emergency`, {
      transports: ["websocket"],
      auth: { token }
    });

    socket.on("connect", () => {
      console.log("Conectado al socket de emergencias en VetAppointments");
      socket.emit("join:vet", vetId);
    });

    socket.on("emergency:completed", (data) => {
      console.log("Urgencia completada:", data);
      setActiveEmergency(null);
      // Refrescar la lista de citas para incluir la emergencia completada
      fetchAppointments();
    });

    socket.on("status:updated", (data) => {
      if (data.status === "completed") {
        console.log("Estado actualizado a completado:", data);
        setActiveEmergency(null);
        // Refrescar la lista de citas para incluir la emergencia completada
        fetchAppointments();
      }
    });

    return () => {
      socket.off("emergency:completed");
      socket.off("status:updated");
      socket.disconnect();
    };
  }, [vetId, token, fetchAppointments]);

  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.hidden) return;
      fetchAppointments();
      fetchActiveEmergency();
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [fetchActiveEmergency, fetchAppointments]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(
        `${API_BASE}/api/appointments/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === id ? { ...appt, status: newStatus } : appt,
        ),
      );
    } catch (err) {
      console.error("Error actualizando cita:", err);
    }
  };

  const handleCancelClick = (appointment) => {
    // Si es urgencia, no permitir cancelación normal
    if (appointment.isEmergency) {
      // Si está pendiente, mostrar modal de rechazo
      if (appointment.status === 'pending' || appointment.status === 'pending_assignment') {
        setSelectedAppointment(appointment);
        setRejectModalOpen(true);
        return;
      }
      // Si está aceptada, mostrar modal de incidente
      const isAccepted = ['accepted_by_vet', 'in_progress', 'assigned'].includes(appointment.status) ||
                        appointment.tracking?.status === 'accepted' ||
                        appointment.tracking?.status === 'on-way' ||
                        appointment.tracking?.status === 'arrived';
      if (isAccepted) {
        setSelectedAppointment(appointment);
        setIncidentModalOpen(true);
        return;
      }
    }
    // Para citas normales, usar cancelación normal
    setSelectedAppointment(appointment);
    setCancelModalOpen(true);
  };

  const handleCancelSuccess = (data) => {
    fetchAppointments();
    setCancelModalOpen(false);
    setSelectedAppointment(null);
    if (data.isLate) {
      alert('Cita cancelada. Esta cancelación tardía afectará tu reputación en la plataforma.');
    }
  };

  const handleRejectSuccess = (data) => {
    fetchAppointments();
    setRejectModalOpen(false);
    setSelectedAppointment(null);
    alert('Urgencia rechazada. El sistema buscará otro veterinario disponible.');
  };

  const handleIncidentSuccess = (data) => {
    fetchAppointments();
    setIncidentModalOpen(false);
    setSelectedAppointment(null);
    alert('Incidente reportado. El sistema está buscando otro veterinario y se ha notificado al tutor.');
  };

  const allUpcoming = appointments
    .filter(
      (a) =>
        a.status === "scheduled" && new Date(a.appointmentDate) > new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime(),
    );

  const nextAppointment = allUpcoming[0];
  const upcomingAppointments = allUpcoming.slice(1);

  const pendingAppointments = appointments.filter(
    (a) => a.status === "pending",
  );

  const completedAppointments = appointments
    .filter((a) => a.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.appointmentDate).getTime() -
        new Date(a.appointmentDate).getTime(),
    )
    .slice(0, 3);

  const renderNextAppointmentCard = () => (
    <section className="bg-blue-100 rounded-xl shadow-md p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-blue-900">
            Próxima cita
          </h2>
          <p className="text-sm text-blue-700">
            Revisa la siguiente consulta agendada en tu agenda.
          </p>
        </div>

        {nextAppointment ? (
          <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white/70 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <img
                src={nextAppointment.petImage || "/default_pet_image.jpg"}
                alt="Mascota"
                className="w-14 h-14 rounded-full object-cover border border-blue-200"
              />
              <div className="text-sm text-blue-900 space-y-1">
                <p>
                  <strong>Mascota:</strong> {nextAppointment.petName}
                </p>
                <p>
                  <strong>Tutor:</strong> {nextAppointment.userName}
                </p>
                <p>
                  <strong>Fecha:</strong>{" "}
                  {new Date(nextAppointment.appointmentDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Hora:</strong> {nextAppointment.scheduledTime}
                </p>
                <p>
                  <strong>Tipo:</strong>{" "}
                  {nextAppointment.appointmentType === "online consultation"
                    ? "Videoconsulta"
                    : "Consulta presencial"}
                </p>
              </div>
            </div>

            <div className="flex md:flex-col gap-2">
              {nextAppointment.isEmergency ? (
                (() => {
                  const isPending = nextAppointment.status === 'pending' || nextAppointment.status === 'pending_assignment';
                  const isAccepted = ['accepted_by_vet', 'in_progress', 'assigned'].includes(nextAppointment.status) ||
                                    nextAppointment.tracking?.status === 'accepted' ||
                                    nextAppointment.tracking?.status === 'on-way' ||
                                    nextAppointment.tracking?.status === 'arrived';
                  
                  if (isPending) {
                    return (
                      <button
                        onClick={() => handleCancelClick(nextAppointment)}
                        className="w-full md:w-auto bg-orange-100 text-orange-700 px-4 py-2 rounded-lg shadow hover:bg-orange-200 transition"
                      >
                        Rechazar Urgencia
                      </button>
                    );
                  } else if (isAccepted) {
                    return (
                      <button
                        onClick={() => handleCancelClick(nextAppointment)}
                        className="w-full md:w-auto bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg shadow hover:bg-yellow-200 transition"
                      >
                        Reportar Incidente
                      </button>
                    );
                  }
                  return null;
                })()
              ) : (
                <button
                  onClick={() => handleCancelClick(nextAppointment)}
                  className="w-full md:w-auto bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow hover:bg-red-200 transition"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() =>
                  navigate(
                    nextAppointment.isEmergency
                      ? `/vet/emergency/${nextAppointment._id}/navigate`
                      : (nextAppointment.appointmentType === "online consultation"
                          ? `/video-call/${nextAppointment._id}`
                          : `/prescription-form/${nextAppointment._id}`),
                  )
                }
                className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
              >
                {nextAppointment.isEmergency
                  ? "Ver detalles"
                  : (nextAppointment.appointmentType === "online consultation"
                      ? "Iniciar videoconsulta"
                      : "Abrir ficha")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-blue-800 font-medium">
            No tienes una siguiente cita programada.
          </p>
        )}
      </div>
    </section>
  );

  const renderPendingSection = () => (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Solicitudes pendientes
          </h2>
          <p className="text-xs text-gray-500">
            Confirma o rechaza las nuevas solicitudes de los tutores.
          </p>
        </div>
      </div>

      {pendingAppointments.length > 0 ? (
        <div className="space-y-4">
          {pendingAppointments.map((a) => (
            <article
              key={a._id}
              className="bg-gray-50 rounded-lg border border-gray-100 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={a.petImage || "/default_pet_image.jpg"}
                  alt="Mascota"
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold">Mascota: {a.petName}</p>
                  <p>Tutor: {a.userName || a.userId}</p>
                  <p>
                    Fecha: {new Date(a.appointmentDate).toLocaleDateString()} • Hora:{" "}
                    {a.scheduledTime}
                  </p>
                  <p>
                    Tipo:{" "}
                    {a.appointmentType === "online consultation"
                      ? "Videoconsulta"
                      : "Consulta presencial"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleStatusChange(a._id, "scheduled")}
                  className="px-4 py-2 text-sm font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => handleStatusChange(a._id, "cancelled")}
                  className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  Rechazar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No tienes solicitudes pendientes en este momento.
        </p>
      )}
    </section>
  );

  const renderUpcomingSection = () => (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Próximas citas
          </h2>
          <p className="text-xs text-gray-500">
            Revisa qué consultas tienes agendadas para los próximos días.
          </p>
        </div>
      </div>

      {upcomingAppointments.length > 0 ? (
        <div className="space-y-4">
          {upcomingAppointments.map((a) => (
            <article
              key={a._id}
              className="bg-gray-50 rounded-lg border border-gray-100 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={a.petImage || "/default_pet_image.jpg"}
                  alt="Mascota"
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold">Mascota: {a.petName}</p>
                  <p>Tutor: {a.userName}</p>
                  <p>
                    Fecha: {new Date(a.appointmentDate).toLocaleDateString()} • Hora:{" "}
                    {a.scheduledTime}
                  </p>
                  <p>
                    Tipo:{" "}
                    {a.isEmergency
                      ? "Urgencia"
                      : (a.appointmentType === "online consultation"
                          ? "Videoconsulta"
                          : "Consulta presencial")}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {a.isEmergency ? (
                  // Para urgencias: mostrar botón según estado
                  (() => {
                    const isPending = a.status === 'pending' || a.status === 'pending_assignment';
                    const isAccepted = ['accepted_by_vet', 'in_progress', 'assigned'].includes(a.status) ||
                                      a.tracking?.status === 'accepted' ||
                                      a.tracking?.status === 'on-way' ||
                                      a.tracking?.status === 'arrived';
                    
                    if (isPending) {
                      return (
                        <button
                          onClick={() => handleCancelClick(a)}
                          className="px-4 py-2 rounded-lg bg-orange-100 text-orange-700 text-sm font-medium hover:bg-orange-200 transition"
                        >
                          Rechazar
                        </button>
                      );
                    } else if (isAccepted) {
                      return (
                        <button
                          onClick={() => handleCancelClick(a)}
                          className="px-4 py-2 rounded-lg bg-yellow-100 text-yellow-700 text-sm font-medium hover:bg-yellow-200 transition"
                        >
                          Reportar Incidente
                        </button>
                      );
                    }
                    return null;
                  })()
                ) : (
                  // Para citas normales: botón cancelar
                  <button
                    onClick={() => handleCancelClick(a)}
                    className="px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() =>
                    navigate(
                      a.isEmergency
                        ? `/vet/emergency/${a._id}/navigate`
                        : (a.appointmentType === "online consultation"
                            ? `/video-call/${a._id}`
                            : `/prescription-form/${a._id}`)
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  {a.isEmergency
                    ? "Ver detalles"
                    : (a.appointmentType === "online consultation"
                        ? "Iniciar videoconsulta"
                        : "Abrir ficha")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No tienes citas próximas agendadas.
        </p>
      )}
    </section>
  );

  const renderCompletedSection = () => (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Citas completadas recientes
      </h2>

      {completedAppointments.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aún no tienes citas marcadas como completadas.
        </p>
      ) : (
        <div className="space-y-3">
          {completedAppointments.map((a) => (
            <article
              key={a._id}
              onClick={() => navigate(`/vet/completed-appointment/${a._id}`)}
              className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition"
            >
              <img
                src={a.petImage || "/default_pet_image.jpg"}
                alt="Mascota"
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              <div className="text-xs text-gray-600 space-y-1">
                <p className="text-sm font-semibold text-gray-800">{a.petName}</p>
                <p>
                  {new Date(a.appointmentDate).toLocaleDateString()}
                  {a.scheduledTime && ` • Hora: ${a.scheduledTime}`}
                </p>
                <p>Tutor: {a.userName}</p>
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[11px] font-medium">
                  Completada
                </span>
              </div>
            </article>
          ))}

          <button
            onClick={() => navigate("/vet/history")}
            className="text-blue-600 hover:underline text-sm font-medium mt-2"
          >
            Ver historial completo →
          </button>
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-4 md:pt-6 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
            Mis citas
          </h1>
          <p className="text-sm text-blue-600 mt-1">
            Gestiona tus consultas pendientes, próximas y completadas.
          </p>
        </header>

        {activeEmergency && (
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl p-5 md:p-6 mb-6 shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Urgencia en curso</h2>
            <p className="text-violet-100 mb-4">
              Tienes una urgencia activa. Retómala cuando estés listo.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/15 rounded-lg p-4">
              <div>
                <p className="text-sm text-violet-100 uppercase tracking-wide">Motivo</p>
                <p className="text-lg font-semibold">
                  {formatReason(activeEmergency.triage?.mainReason) || 'Urgencia activa'}
                </p>
              </div>
              <div>
                <p className="text-sm text-violet-100 uppercase tracking-wide">Paciente</p>
                <p className="text-lg font-semibold">
                  {activeEmergency.petId?.name || 'Mascota'}
                </p>
              </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/vet/emergency/${activeEmergency._id}/navigate`, {
                  state: { conversationId: activeEmergency.conversationId || null }
                })}
                className="px-4 py-2 bg-white text-violet-700 font-semibold rounded-lg shadow hover:bg-violet-50 transition"
              >
                Ver urgencia
              </button>
              {activeEmergency.conversationId && (
                <button
                  onClick={() => navigate(`/vet/conversations/${activeEmergency.conversationId}`)}
                  className="px-4 py-2 bg-white text-violet-700 font-semibold rounded-lg shadow hover:bg-violet-50 transition border border-white/60"
                >
                  Abrir chat
                </button>
              )}
            </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 text-center text-blue-600 font-medium">
            Cargando citas...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
            {error}
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {renderNextAppointmentCard()}

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-2 space-y-6">
                {renderPendingSection()}
                {renderUpcomingSection()}
              </div>

              <aside className="space-y-4">{renderCompletedSection()}</aside>
            </div>
          </div>
        )}
      </div>

      {/* Modal de cancelación (solo para citas normales) */}
      <CancelAppointmentModal
        appointment={selectedAppointment}
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedAppointment(null);
        }}
        onSuccess={handleCancelSuccess}
      />

      {/* Modal de rechazo de urgencia (antes de aceptar) */}
      <RejectEmergencyModal
        emergency={selectedAppointment}
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedAppointment(null);
        }}
        onSuccess={handleRejectSuccess}
      />

      {/* Modal de reporte de incidente (después de aceptar) */}
      <ReportIncidentModal
        emergency={selectedAppointment}
        isOpen={incidentModalOpen}
        onClose={() => {
          setIncidentModalOpen(false);
          setSelectedAppointment(null);
        }}
        onSuccess={handleIncidentSuccess}
      />
    </div>
  );
};

export default VetAppointments;
