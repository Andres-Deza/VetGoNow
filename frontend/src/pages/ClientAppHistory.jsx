import React, { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";

const ClientAppHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const itemsPerPage = 15;
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!userId || !token) return;
  
    const fetchAppointments = async () => {
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
            console.error(`❌ Error al obtener la receta para ${a._id}`, err);
          }
        }
  
        // console.log("✅ Completed Appointments with Prescriptions:", tempList);
  
        setAppointments([...tempList]);
        setFiltered([...tempList]);
  

      } catch (err) {
        console.error("❌ Error al obtener las citas del usuario:", err);
      }
    };
  
    fetchAppointments();
  }, [userId, token]);
  

  

  useEffect(() => {
    let data = appointments;

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
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-semibold mb-6">Historial de mis citas</h1>
  
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre de mascota"
            className="border p-2 rounded-lg w-1/3 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className="border p-2 rounded-lg text-base"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          <CSVLink
            data={exportCSV().rows}
            headers={exportCSV().headers}
            filename="client_appointment_history.csv"
            className="ml-auto bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md text-base hover:bg-blue-600 transition-colors"
          >
            Exportar CSV
          </CSVLink>
        </div>
  
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg p-4">
          <table className="min-w-full table-auto text-base">
            <thead>
              <tr className="bg-blue-100">
                <th className="cursor-pointer py-3 px-4 border-b text-left font-medium text-gray-700">Nombre de la mascota</th>
                <th className="cursor-pointer py-3 px-4 border-b text-left font-medium text-gray-700">Nombre del veterinario</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Raza</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Contacto del veterinario</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Fecha de la cita</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Hora programada</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((a, index) => (
                  <tr
                    key={a._id}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-gray-100'}`}
                  >
                    <td className="py-2 px-4 border-b">{a.prescription?.petId?.name}</td>
                    <td className="py-2 px-4 border-b">{a.prescription?.vetId?.name}</td>
                    <td className="py-2 px-4 border-b">{a.prescription?.petId?.breed}</td>
                    <td className="py-2 px-4 border-b">{a.prescription?.vetId?.phoneNumber}</td>
                    <td className="py-2 px-4 border-b">
                      {new Date(a.appointmentDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-4 border-b">{a.scheduledTime}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => navigate(`/client/appointment-form/${a._id}`)}
                        className="text-blue-500 hover:underline text-base"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500">
                    No se encontraron citas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
  
        <div className="flex justify-center items-center mt-6 space-x-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-base transition-colors"
          >
            Anterior
          </button>
          <span className="font-medium text-lg">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-base transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
  
  
};

export default ClientAppHistory;
