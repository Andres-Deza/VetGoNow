import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import avatar from "../avatar.png";

const API_BASE = import.meta.env.VITE_API_BASE || "";

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

const STATUS_LABELS = {
  pending: "Pendiente",
  "on-way": "En camino",
  arrived: "En el lugar",
  "in-service": "Atención en progreso",
  completed: "Completada",
  cancelled: "Cancelada"
};

const formatReason = (reason) =>
  REASON_LABELS[reason] ||
  reason?.replace(/[_-]/g, " ")?.replace(/\b\w/g, (char) => char.toUpperCase());

const formatStatus = (status) => STATUS_LABELS[status] || "En progreso";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0
  }).format(value ?? 0);

const VetDashboard = () => {
  const navigate = useNavigate();
  const [vet, setVet] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loadingEmergency, setLoadingEmergency] = useState(true);
  const socketRef = useRef(null);

  const isSameEmergency = useCallback((emergency, emergencyId) => {
    if (!emergency || !emergencyId) return false;
    const targetId = emergencyId.toString();
    return [emergency._id, emergency.id, emergency.requestId]
      .filter(Boolean)
      .map((value) => value.toString())
      .includes(targetId);
  }, []);

  const fetchActiveEmergency = useCallback(
    async (showLoader = false) => {
      const token = localStorage.getItem("token");
      const storedVet = localStorage.getItem("user");

      if (!token || !storedVet) {
        setActiveEmergency(null);
        setLoadingEmergency(false);
        return;
      }

      const parsedVet = JSON.parse(storedVet);
      const vetId = parsedVet?.id;

      if (!vetId) {
        setActiveEmergency(null);
        setLoadingEmergency(false);
        return;
      }

      if (showLoader) {
        setLoadingEmergency(true);
      }

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const { data } = await axios.get(`${API_BASE}/api/emergency/user-active`, {
          headers
        });

        const emergencies = Array.isArray(data?.emergencies)
          ? data.emergencies
          : data?.emergency
          ? [data.emergency]
          : [];

        const vetEmergency = emergencies.find(
          (item) =>
            item.vetId &&
            (item.vetId._id === vetId || item.vetId === vetId || item.vetId?.id === vetId) &&
            item.status &&
            item.status !== "completed" &&
            item.status !== "cancelled"
        );

        if (!vetEmergency) {
          setActiveEmergency(null);
        } else {
          const trackingEmergency = await axios.get(
            `${API_BASE}/api/emergency/${vetEmergency._id || vetEmergency.id || vetEmergency.requestId}/tracking`,
            { headers }
          );

          if (trackingEmergency.data?.success) {
            const request = trackingEmergency.data.request || vetEmergency;
            setActiveEmergency({
              ...request,
              conversationId:
                trackingEmergency.data.conversationId ||
                vetEmergency.conversationId ||
                null
            });
          } else {
            setActiveEmergency(vetEmergency);
          }
        }
      } catch (error) {
        console.error("Error obteniendo urgencia activa:", error);
        setActiveEmergency(null);
      } finally {
        setLoadingEmergency(false);
      }
    },
    []
  );

  useEffect(() => {
    const storedVet = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedVet || !token) {
      navigate("/login");
      return;
    }

    const parsedVet = JSON.parse(storedVet);
    const vetId = parsedVet?.id;

    if (!vetId) {
      navigate("/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const fetchProfile = async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE}/api/vets/personalinfo/${vetId}`,
          { headers }
        );
        setVet(data);
      } catch (error) {
        console.error("Error obteniendo datos del veterinario:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
    fetchActiveEmergency(true);
  }, [navigate, fetchActiveEmergency]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedVet = localStorage.getItem("user");

    if (!token || !storedVet) {
      return;
    }

    const parsedVet = JSON.parse(storedVet);
    const vetId = parsedVet?.id;

    if (!vetId) {
      return;
    }

    const socket = io(`${API_BASE}/emergency`, {
      transports: ["websocket"],
      auth: { token }
    });

    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit("join:vet", vetId);
    };

    const handleCancelled = (data) => {
      setActiveEmergency((prev) =>
        isSameEmergency(prev, data?.emergencyId) ? null : prev
      );
      fetchActiveEmergency(false);
    };

    const handleCompleteSuccess = () => {
      fetchActiveEmergency(false);
    };

    socket.on("connect", handleConnect);
    socket.on("emergency:cancelled", handleCancelled);
    socket.on("emergency:complete:success", handleCompleteSuccess);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("emergency:cancelled", handleCancelled);
      socket.off("emergency:complete:success", handleCompleteSuccess);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchActiveEmergency, isSameEmergency]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Cargando tu panel...</p>
      </div>
    );
  }

  if (!vet) {
    return null;
  }

  const handleOpenEmergency = () => {
    const emergencyId =
      activeEmergency?.requestId || activeEmergency?._id || activeEmergency?.id;
    if (emergencyId) {
      navigate(`/vet/emergency/${emergencyId}/navigate`);
    }
  };

  const handleOpenChat = () => {
    if (activeEmergency?.conversationId) {
      navigate(`/vet/conversations/${activeEmergency.conversationId}`);
    }
  };

  return (
    <div className="p-8 md:p-12 bg-gray-50 min-h-screen space-y-8">
      {/* Active emergency banner */}
      {!loadingEmergency && activeEmergency && (
        <div className="bg-amber-500 text-white rounded-2xl p-5 md:p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-amber-100">
                Urgencia en curso
              </p>
              <h2 className="text-2xl font-semibold mt-1">
                {activeEmergency.pet?.name || "Mascota"}
              </h2>
              <p className="text-sm text-amber-100 mt-2 max-w-2xl">
                Retoma el seguimiento, comparte ubicación o confirma acciones
                con el tutor directamente desde aquí.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleOpenEmergency}
                className="px-4 py-2 bg-white text-amber-700 font-semibold rounded-xl shadow hover:bg-amber-50 transition"
              >
                Ver seguimiento
              </button>
              {activeEmergency.conversationId && (
                <button
                  onClick={handleOpenChat}
                  className="px-4 py-2 bg-white/10 border border-white/40 text-white font-semibold rounded-xl hover:bg-white/20 transition"
                >
                  Abrir chat
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 text-sm">
            <div>
              <p className="text-amber-100 uppercase tracking-wide text-xs">
                Estado
              </p>
              <p className="font-medium">{formatStatus(activeEmergency.status)}</p>
            </div>
            <div>
              <p className="text-amber-100 uppercase tracking-wide text-xs">
                Motivo
              </p>
              <p className="font-medium">
                {formatReason(activeEmergency.reason) || "No especificado"}
              </p>
            </div>
            <div>
              <p className="text-amber-100 uppercase tracking-wide text-xs">
                Dirección
              </p>
              <p className="font-medium">
                {activeEmergency.address?.formatted || activeEmergency.address?.line1 || "Sin dirección"}
              </p>
            </div>
            <div>
              <p className="text-amber-100 uppercase tracking-wide text-xs">
                Total estimado
              </p>
              <p className="font-medium">
                {formatCurrency(activeEmergency.pricing?.total)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome */}
      <h1 className="text-4xl md:text-5xl font-bold text-blue-800">
        Bienvenido, Dr. {vet.name}
      </h1>

      {/* Profile Image + Info */}
      <div className="flex flex-col md:flex-row items-start gap-10 md:gap-12">
        {/* Image */}
        <img
          src={vet.profileImage || avatar}
          alt="Vet"
          className="w-52 h-52 md:w-56 md:h-56 rounded-full object-cover border-4 border-blue-500"
        />

        {/* Details */}
        <div className="space-y-3 md:space-y-4 text-lg md:text-xl text-gray-700">
          <p>
            <span className="font-semibold text-gray-900">Email:</span>{" "}
            {vet.email}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Teléfono:</span>{" "}
            {vet.phoneNumber || "N/A"}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Especialización:</span>{" "}
            {vet.specialization || "N/A"}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Experiencia:</span>{" "}
            {vet.experience || "N/A"} años
          </p>
          <p>
            <span className="font-semibold text-gray-900">Calificaciones:</span>{" "}
            {vet.qualifications || "N/A"}
          </p>
        </div>
      </div>

      {/* Button at the bottom */}
      <div className="text-center pt-6">
        <button
          className="bg-emerald-600 text-white text-lg px-8 py-3 rounded-full hover:bg-emerald-500 transition"
          onClick={() => navigate("/vet/update-profile")}
        >
          Actualizar perfil
        </button>
      </div>
    </div>
  );
};

export default VetDashboard;
