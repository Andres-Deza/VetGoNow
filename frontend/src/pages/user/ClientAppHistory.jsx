import React, { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import { useNavigate, useLocation } from "react-router-dom";
import RatingModal from "../../components/RatingModal";

const ClientAppHistory = () => {
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const [filterByPetId, setFilterByPetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingAppointment, setRatingAppointment] = useState(null);
  const [ratings, setRatings] = useState({}); // { appointmentId: rating }
  const itemsPerPage = 12;
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || '';

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const token = localStorage.getItem("token");

  // Obtener petId del location.state si viene de "Resultados"
  useEffect(() => {
    if (location.state?.petId) {
      setFilterByPetId(location.state.petId);
    }
  }, [location.state]);

  useEffect(() => {
    if (!userId || !token) return;
  
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/appointments/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const completed = res.data.appointments.filter(
          (a) => a.status === "completed"
        );
  
        const tempList = [];
        for (const a of completed) {
          try {
            const res = await axios.get(
              `/api/appointments/${a._id}/prescriptionform`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
  
            const updated = {
              ...a,
              prescription: res.data.prescription,
            };
  
            tempList.push(updated);
          } catch (err) {
            console.error(`Error al obtener la receta para ${a._id}`, err);
          }
        }
  
        // Ordenar por fecha descendente (más reciente primero)
        const sortedList = tempList.sort((a, b) => {
          const dateA = new Date(a.appointmentDate || a.date || a.prescription?.appointmentDate);
          const dateB = new Date(b.appointmentDate || b.date || b.prescription?.appointmentDate);
          return dateB - dateA; // Descendente
        });
        setAppointments(sortedList);
        setFiltered(sortedList);
      } catch (err) {
        console.error("Error al obtener las citas del usuario:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchAppointments();
  }, [userId, token]);
  

  

  useEffect(() => {
    let data = appointments;

    // Filtrar por petId si viene de "Resultados"
    if (filterByPetId) {
      data = data.filter((a) => {
        const petId = a.prescription?.petId?._id || a.prescription?.petId;
        return petId && petId.toString() === filterByPetId.toString();
      });
    }

    if (searchTerm) {
      data = data.filter((a) =>
        a.prescription?.petId?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    if (searchDate) {
      data = data.filter((a) => {
        const date = new Date(a.appointmentDate).toISOString().split("T")[0];
        return date === searchDate;
      });
    }

    setFiltered(data);
    setCurrentPage(1);
  }, [searchTerm, searchDate, appointments, filterByPetId]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (key) => {
    let direction = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }

    const sorted = [...filtered].sort((a, b) => {
      const aValue = a.prescription?.[key] || a?.[key];
      const bValue = b.prescription?.[key] || b?.[key];
      if (aValue < bValue) return direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return direction === "ascending" ? 1 : -1;
      return 0;
    });

    setFiltered(sorted);
    setSortConfig({ key, direction });
  };

  const exportCSV = () => {
    const headers = [
      "Nombre de la mascota",
      "Nombre del veterinario",
      "Raza",
      "Contacto del veterinario",
      "Fecha de la cita",
      "Hora programada",
    ];

    const rows = filtered.map((a) => [
      a.prescription?.petId?.name,
      a.prescription?.vetId?.name,
      a.prescription?.petId?.breed,
      a.prescription?.vetId?.phoneNumber,
      new Date(a.appointmentDate).toLocaleDateString(),
      a.scheduledTime,
    ]);

    return { headers, rows };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {filterByPetId ? "Resultados de la mascota" : "Historial de Citas"}
        </h1>
              <p className="text-sm text-gray-600">
                {filtered.length} {filtered.length === 1 ? 'cita completada' : 'citas completadas'}
              </p>
            </div>
            {filtered.length > 0 && (
              <CSVLink
                data={exportCSV().rows}
                headers={exportCSV().headers}
                filename="historial_citas.csv"
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar CSV
              </CSVLink>
            )}
          </div>
          
        {filterByPetId && (
          <button
            onClick={() => {
              setFilterByPetId(null);
              navigate('/client/history', { replace: true });
            }}
              className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium text-sm sm:text-base transition-colors"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Ver todas las citas
          </button>
        )}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
          <input
            type="text"
            placeholder="Buscar por nombre de mascota"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
          <input
            type="date"
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm sm:text-base"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
            </div>
          </div>
        </div>
  
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay citas completadas</h3>
            <p className="text-gray-600 mb-6">Tus citas completadas aparecerán aquí</p>
            <button
              onClick={() => navigate('/appointments')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear nueva cita
            </button>
          </div>
        )}

        {/* Cards Grid */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {currentItems.map((a) => {
                const petName = a.prescription?.petId?.name || a.petId?.name || 'N/A';
                const vetName = a.prescription?.vetId?.name || a.vetId?.name || 'N/A';
                const petBreed = a.prescription?.petId?.breed || a.petId?.breed || 'N/A';
                const vetPhone = a.prescription?.vetId?.phoneNumber || a.vetId?.phoneNumber || 'N/A';
                const vetRating = (a.prescription?.vetId?.ratings?.average && a.prescription?.vetId?.ratings?.total >= 5) 
                  ? a.prescription.vetId.ratings.average 
                  : (a.vetId?.ratings?.average && a.vetId?.ratings?.total >= 5) 
                    ? a.vetId.ratings.average 
                    : null;
                const appointmentDate = new Date(a.appointmentDate || a.date || a.prescription?.appointmentDate);
                const isEmergency = a.isEmergency || false;

                return (
                  <div
                    key={a._id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden"
                  >
                    <div className={`p-4 sm:p-6 ${isEmergency ? 'bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-200' : 'bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isEmergency ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Urgencia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Cita Normal
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Completada</p>
                          <p className="text-xs font-semibold text-gray-700">
                            {appointmentDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{petName}</h3>
                      <p className="text-sm text-gray-600">{petBreed}</p>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4">
                      {/* Veterinario */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">Veterinario</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">Dr. {vetName}</p>
                          {vetPhone && (
                            <p className="text-xs text-gray-600">{vetPhone}</p>
                          )}
                        </div>
                      </div>

                      {/* Fecha y Hora */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">Fecha y Hora</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {appointmentDate.toLocaleDateString('es-CL', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-xs text-gray-600">{a.scheduledTime}</p>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={() => navigate(`/client/appointment-form/${a._id}`)}
                          className="w-full px-4 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver Receta
                        </button>
                        
                        {/* Botón Calificar - Solo si no tiene calificación */}
                        {!ratings[a._id] && (
                          <button
                            onClick={() => {
                              setRatingAppointment({
                                appointmentId: a._id,
                                vetId: a.vetId?._id || a.vetId || a.prescription?.vetId?._id || a.prescription?.vetId,
                                petId: a.petId?._id || a.petId || a.prescription?.petId?._id || a.prescription?.petId,
                                vetName: vetName,
                                vetRating: vetRating,
                                petName: petName,
                                appointmentDate: a.appointmentDate || a.date || a.prescription?.appointmentDate,
                                scheduledTime: a.scheduledTime
                              });
                              setShowRatingModal(true);
                            }}
                            className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            Calificar Atención
                          </button>
                        )}
                        
                        {/* Mostrar calificación si existe */}
                        {ratings[a._id] && (
                          <div className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center gap-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-5 h-5 ${i < ratings[a._id].rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-green-800">Ya calificada</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
  
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <p className="text-sm text-gray-600">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} citas
                </p>
                <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
          >
            Anterior
          </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                            currentPage === pageNum
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
          >
            Siguiente
          </button>
        </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && ratingAppointment && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setRatingAppointment(null);
          }}
          appointmentId={ratingAppointment.appointmentId}
          vetId={ratingAppointment.vetId}
          petId={ratingAppointment.petId}
          vetName={ratingAppointment.vetName}
          vetRating={ratingAppointment.vetRating}
          appointmentDate={ratingAppointment.appointmentDate}
          scheduledTime={ratingAppointment.scheduledTime}
          onSuccess={async (rating) => {
            // Actualizar el estado de ratings
            setRatings(prev => ({
              ...prev,
              [ratingAppointment.appointmentId]: rating
            }));
            setShowRatingModal(false);
            setRatingAppointment(null);
          }}
        />
      )}
    </div>
  );
};

export default ClientAppHistory;
