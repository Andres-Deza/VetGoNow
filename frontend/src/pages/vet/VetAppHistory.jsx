import React, { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";

const VetAppHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const itemsPerPage = 15;
  const navigate = useNavigate();

  // Helper para formatear la hora correctamente
  const formatTime = (timeValue) => {
    if (!timeValue) return 'N/A';
    // Si es un timestamp ISO completo (contiene 'T' o 'Z')
    if (typeof timeValue === 'string' && (timeValue.includes('T') || timeValue.includes('Z'))) {
      try {
        const date = new Date(timeValue);
        return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return timeValue;
      }
    }
    // Si ya es una hora simple (formato HH:MM), devolverla tal cual
    return timeValue;
  };


  const vet = JSON.parse(localStorage.getItem("user"));
  const vetId = vet?.id;
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!vetId || !token) return;
  
    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`/api/appointments/vets/${vetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const completed = res.data.appointments.filter(
          (a) => a.status === "completed"
        );
  
        // Optimización: hacer todas las llamadas en paralelo en lugar de secuencial
        const appointmentPromises = completed.map(async (a) => {
          try {
            const prescriptionRes = await axios.get(
              `/api/appointments/${a._id}/prescriptionform`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return {
              ...a,
              prescription: prescriptionRes.data.prescription || null,
            };
          } catch (err) {
            // No es un error si no hay receta, solo la registramos en consola sin alertar al usuario
            if (err.response?.status === 404 || err.response?.status === 200) {
              console.log(`No hay receta disponible para la cita ${a._id}`);
            } else {
              console.error(`Error al obtener la receta para ${a._id}:`, err);
            }
            return {
              ...a,
              prescription: null,
            };
          }
        });
  
        // Esperar todas las promesas en paralelo
        const updatedAppointments = await Promise.all(appointmentPromises);
        // Ordenar por fecha descendente (más reciente primero)
        const sortedAppointments = updatedAppointments.sort((a, b) => {
          const dateA = new Date(a.appointmentDate);
          const dateB = new Date(b.appointmentDate);
          return dateB - dateA; // Descendente
        });
        setAppointments(sortedAppointments);
        setFiltered(sortedAppointments);
      } catch (err) {
        console.error("🚫 Error fetching vet appointments:", err);
      }
    };
  
    fetchAppointments();
  }, [vetId, token]);
  
  


  useEffect(() => {
    let data = appointments;

    if (searchTerm) {
        data = data.filter((a) =>
          a.prescription?.userId?.phoneNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
        );
      }
      

    if (searchDate) {
      data = data.filter((a) => {
        const date = new Date(a.appointmentDate)
          .toISOString()
          .split("T")[0];
        return date === searchDate;
      });
    }

    setFiltered(data);
    setCurrentPage(1);
  }, [searchTerm, searchDate, appointments]);

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
      "Pet Name",
      "Vet Name",
      "Pet Owner",
      "Breed",
      "Owner Contact",
      "Appointment Date",
      "Scheduled Time",
    ];

    const rows = filtered.map((a) => [
      a.prescription?.petId?.name || a.petId?.name || 'N/A',
      a.prescription?.vetId?.name || a.vetId?.name || 'N/A',
      a.prescription?.userId?.name || a.userId?.name || 'N/A',
      a.prescription?.petId?.breed || a.petId?.breed || 'N/A',
      a.prescription?.userId?.phoneNumber || a.userId?.phoneNumber || 'N/A',
      new Date(a.appointmentDate).toLocaleDateString(),
      a.scheduledTime,
    ]);

    return { headers, rows };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-gray-900">Historial de Citas</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Buscar por contacto del tutor"
            className="flex-1 border border-gray-300 p-3 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className="border border-gray-300 p-3 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          {filtered.length > 0 && (
            <CSVLink
              data={exportCSV().rows}
              headers={exportCSV().headers}
              filename="vet_appointment_history.csv"
              className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-md text-sm sm:text-base hover:bg-blue-600 transition-colors text-center font-medium"
            >
              Exportar CSV
            </CSVLink>
          )}
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden space-y-4">
          {currentItems.length > 0 ? (
            currentItems.map((a) => (
              <div
                key={a._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {a.prescription?.petId?.name || a.petId?.name || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-600">{a.prescription?.petId?.breed || a.petId?.breed || 'N/A'}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/vet/completed-appointment/${a._id}`)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tutor</p>
                      <p className="text-sm font-medium text-gray-900">{a.prescription?.userId?.name || a.userId?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Contacto</p>
                      <p className="text-sm font-medium text-gray-900">{a.prescription?.userId?.phoneNumber || a.userId?.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Fecha</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(a.appointmentDate).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Hora</p>
                      <p className="text-sm font-medium text-gray-900">{formatTime(a.scheduledTime)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Veterinario</p>
                      <p className="text-sm font-medium text-gray-900">{a.prescription?.vetId?.name || a.vetId?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No se encontraron citas.</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-white shadow-lg rounded-lg">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="bg-blue-50">
                <th onClick={() => handleSort("petId")} className="cursor-pointer py-3 px-4 border-b text-left font-semibold text-gray-700 hover:bg-blue-100 transition-colors">
                  Mascota
                </th>
                <th onClick={() => handleSort("vetId")} className="cursor-pointer py-3 px-4 border-b text-left font-semibold text-gray-700 hover:bg-blue-100 transition-colors">
                  Veterinario
                </th>
                <th onClick={() => handleSort("userId")} className="cursor-pointer py-3 px-4 border-b text-left font-semibold text-gray-700 hover:bg-blue-100 transition-colors">
                  Tutor
                </th>
                <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Raza</th>
                <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Contacto</th>
                <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Fecha</th>
                <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Hora</th>
                <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((a, index) => (
                  <tr
                    key={a._id}
                    className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="py-3 px-4 border-b text-gray-900">{a.prescription?.petId?.name || a.petId?.name || 'N/A'}</td>
                    <td className="py-3 px-4 border-b text-gray-700">{a.prescription?.vetId?.name || a.vetId?.name || 'N/A'}</td>
                    <td className="py-3 px-4 border-b text-gray-700">{a.prescription?.userId?.name || a.userId?.name || 'N/A'}</td>
                    <td className="py-3 px-4 border-b text-gray-600">{a.prescription?.petId?.breed || a.petId?.breed || 'N/A'}</td>
                    <td className="py-3 px-4 border-b text-gray-600">{a.prescription?.userId?.phoneNumber || a.userId?.phoneNumber || 'N/A'}</td>
                    <td className="py-3 px-4 border-b text-gray-700">
                      {new Date(a.appointmentDate).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4 border-b text-gray-700">{formatTime(a.scheduledTime)}</td>
                    <td className="py-3 px-4 border-b">
                      <button
                        onClick={() => navigate(`/vet/completed-appointment/${a._id}`)}
                        className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    No se encontraron citas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center mt-6 gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium transition-colors shadow-sm"
              >
                Anterior
              </button>
              <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm sm:text-base font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium transition-colors shadow-sm"
              >
                Siguiente
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} citas
            </p>
          </div>
        )}
      </div>
    </div>
  );
  
};

export default VetAppHistory;
