import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const VetScheduleConfigPage = () => {
  const [vet, setVet] = useState({
    openingHours: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVetInfo = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          navigate("/login");
          return;
        }

        const { id } = JSON.parse(storedUser);
        if (!id) {
          console.error("No user ID found in localStorage");
          navigate("/login");
          return;
        }

        const response = await axios.get(`/api/vets/personalinfo/${id}`);
        const fetchedVet = response.data || {};
        setVet((prev) => ({
          ...prev,
          ...fetchedVet,
          openingHours: fetchedVet?.openingHours || [],
        }));
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch vet info:", err);
        setError(err.message);
        setLoading(false);

        if (err.response?.status === 404) {
          alert("Perfil de veterinario no encontrado. Redirigiendo al dashboard.");
          navigate("/vet-dashboard");
        } else if (err.response?.status === 401) {
          alert("Sesión expirada. Por favor inicia sesión nuevamente.");
          navigate("/login");
        } else {
          alert("Error al cargar el perfil. Por favor intenta nuevamente.");
        }
      }
    };

    fetchVetInfo();
  }, [navigate]);

  // Función para actualizar openingHours
  const updateOpeningHours = (dayNum, daySchedule) => {
    setVet((prev) => {
      const currentHours = prev.openingHours || [];
      const filteredHours = currentHours.filter((h) => h.day !== dayNum);
      const newHours = daySchedule ? [...filteredHours, daySchedule] : filteredHours;
      return { ...prev, openingHours: newHours };
    });
  };

  // Helper para obtener el horario de un día
  const getDaySchedule = (dayNum) => {
    return vet.openingHours?.find((h) => h.day === dayNum) || null;
  };

  // Acciones rápidas para horarios
  const selectAllDays = () => {
    const defaultTime = { open: "09:00", close: "18:00", open24h: false };
    const allDays = [0, 1, 2, 3, 4, 5, 6].map((dayNum) => ({
      day: dayNum,
      ...defaultTime,
    }));
    setVet((prev) => ({ ...prev, openingHours: allDays }));
  };

  const selectWeekdays = () => {
    const defaultTime = { open: "09:00", close: "18:00", open24h: false };
    const weekdays = [1, 2, 3, 4, 5].map((dayNum) => ({
      day: dayNum,
      ...defaultTime,
    }));
    const currentHours = vet.openingHours || [];
    const filteredHours = currentHours.filter((h) => ![1, 2, 3, 4, 5].includes(h.day));
    setVet((prev) => ({ ...prev, openingHours: [...filteredHours, ...weekdays] }));
  };

  const clearAllDays = () => {
    setVet((prev) => ({ ...prev, openingHours: [] }));
  };

  const copyDaySchedule = (sourceDayNum, targetDayNums) => {
    const sourceSchedule = getDaySchedule(sourceDayNum);
    if (!sourceSchedule) return;

    const currentHours = vet.openingHours || [];
    const filteredHours = currentHours.filter((h) => !targetDayNums.includes(h.day));
    const newSchedules = targetDayNums.map((dayNum) => ({
      ...sourceSchedule,
      day: dayNum,
    }));
    setVet((prev) => ({ ...prev, openingHours: [...filteredHours, ...newSchedules] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("openingHours", JSON.stringify(vet.openingHours));

      await axios.put(`/api/vets/update/${vet._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Horarios actualizados exitosamente!");
      navigate("/vet-dashboard");
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Error al actualizar los horarios. Por favor intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando horarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar los horarios: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Horarios de Atención</h1>
            <p className="text-sm text-gray-500">
              Configura tus horarios de atención para que los tutores sepan cuándo pueden agendar citas.
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="hidden md:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Guardar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Botones de acción rápida */}
          <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllDays}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium border border-blue-200"
              >
                Seleccionar todos
              </button>
              <button
                type="button"
                onClick={selectWeekdays}
                className="px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors font-medium border border-green-200"
              >
                Solo días laborales (L-V)
              </button>
              <button
                type="button"
                onClick={clearAllDays}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium border border-gray-300"
              >
                Limpiar todo
              </button>
            </div>

            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5, 6].map((dayNum) => {
                const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                const dayName = dayNames[dayNum];
                const existingDay = getDaySchedule(dayNum);
                const isOpen = !!existingDay;
                const openTime = existingDay?.open || "09:00";
                const closeTime = existingDay?.close || "18:00";
                const open24h = existingDay?.open24h || false;
                const isWeekend = dayNum === 0 || dayNum === 6;

                return (
                  <div
                    key={dayNum}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      isOpen
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-3 cursor-pointer flex-1 group">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={(e) => {
                            updateOpeningHours(
                              dayNum,
                              e.target.checked
                                ? {
                                    day: dayNum,
                                    open: openTime,
                                    close: closeTime,
                                    open24h: false,
                                  }
                                : null
                            );
                          }}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer transition-all"
                        />
                        <span
                          className={`font-semibold transition-colors ${
                            isOpen ? "text-gray-900" : "text-gray-600 group-hover:text-gray-900"
                          }`}
                        >
                          {dayName}
                          {isWeekend && <span className="ml-2 text-xs text-gray-500 font-normal">(Fin de semana)</span>}
                        </span>
                      </label>

                      {/* Botón para copiar horario a otros días */}
                      {isOpen && !open24h && (
                        <div className="flex gap-1">
                          {isWeekend ? (
                            <button
                              type="button"
                              onClick={() => copyDaySchedule(dayNum, dayNum === 0 ? [6] : [0])}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded transition-colors font-medium"
                              title={`Copiar horario al ${dayNum === 0 ? "Sábado" : "Domingo"}`}
                            >
                              Copiar al {dayNum === 0 ? "Sábado" : "Domingo"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const otherWeekdays = [1, 2, 3, 4, 5].filter((d) => d !== dayNum);
                                copyDaySchedule(dayNum, otherWeekdays);
                              }}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded transition-colors font-medium"
                              title="Copiar horario a otros días laborales"
                            >
                              Copiar a L-V
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isOpen && (
                      <div className="ml-8 space-y-3 transition-all duration-200">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={open24h}
                            onChange={(e) => {
                              updateOpeningHours(dayNum, {
                                day: dayNum,
                                open: openTime,
                                close: closeTime,
                                open24h: e.target.checked,
                              });
                            }}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            Abierto 24 horas
                          </span>
                        </label>

                        {!open24h && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Hora de apertura</label>
                              <input
                                type="time"
                                value={openTime}
                                onChange={(e) => {
                                  updateOpeningHours(dayNum, {
                                    day: dayNum,
                                    open: e.target.value,
                                    close: closeTime,
                                    open24h: false,
                                  });
                                }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Hora de cierre</label>
                              <input
                                type="time"
                                value={closeTime}
                                onChange={(e) => {
                                  updateOpeningHours(dayNum, {
                                    day: dayNum,
                                    open: openTime,
                                    close: e.target.value,
                                    open24h: false,
                                  });
                                }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Solo los días con horarios configurados estarán disponibles para que los
                tutores agenden citas. Asegúrate de configurar todos los días en los que atiendes.
              </p>
            </div>
          </div>

          {/* Botón de guardar para móviles */}
          <div className="md:hidden bg-white rounded-2xl shadow-sm border p-5 sticky bottom-0 z-10">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar Horarios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VetScheduleConfigPage;

