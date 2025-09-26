import React, { useEffect, useState } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";

import VetSidebar from "../components/VetSidebar";

const VetAppHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const itemsPerPage = 15;
  const navigate = useNavigate();


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
  
        // Temporary array to avoid duplicated state updates
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
  
            tempList.push(updated); // Add to array
            setAppointments([...tempList]); // Update UI with current snapshot
            setFiltered([...tempList]);
  
            // console.log("Fetched:", updated);
          } catch (err) {
            console.error(`❌ Failed to fetch prescription for ${a._id}`, err);
          }
        }
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
      a.prescription?.petId?.name,
      a.prescription?.vetId?.name,
      a.prescription?.userId?.name,
      a.prescription?.petId?.breed,
      a.prescription?.userId?.phoneNumber,
      new Date(a.appointmentDate).toLocaleDateString(),
      a.scheduledTime,
    ]);

    return { headers, rows };
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <VetSidebar />
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-semibold mb-6">Appointment History</h1>
  
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by owner contact"
            className="border p-3 rounded-lg w-1/3 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className="border p-3 rounded-lg text-base"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          <CSVLink
            data={exportCSV().rows}
            headers={exportCSV().headers}
            filename="vet_appointment_history.csv"
            className="ml-auto bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md text-base hover:bg-blue-600 transition-colors"
          >
            Export CSV
          </CSVLink>
        </div>
  
        {/* Table */}
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg p-4">
          <table className="min-w-full table-auto text-base">
            <thead>
              <tr className="bg-blue-100">
                <th onClick={() => handleSort("petId")} className="cursor-pointer py-3 px-4 border-b text-left font-medium text-gray-700">
                  Pet Name
                </th>
                <th onClick={() => handleSort("vetId")} className="cursor-pointer py-3 px-4 border-b text-left font-medium text-gray-700">
                  Vet Name
                </th>
                <th onClick={() => handleSort("userId")} className="cursor-pointer py-3 px-4 border-b text-left font-medium text-gray-700">
                  Pet Owner
                </th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Breed</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Owner Contact</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Appointment Date</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Scheduled Time</th>
                <th className="py-3 px-4 border-b text-left font-medium text-gray-700">Details</th>
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
                    <td className="py-2 px-4 border-b">{a.prescription?.userId?.name}</td>
                    <td className="py-2 px-4 border-b">{a.prescription?.petId?.breed}</td>
                    <td className="py-2 px-4 border-b">{a.prescription?.userId?.phoneNumber}</td>
                    <td className="py-2 px-4 border-b">
                      {new Date(a.appointmentDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-4 border-b">{a.scheduledTime}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => navigate(`/completed-appointment/${a._id}`)}
                        className="text-blue-500 hover:underline text-base"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
  
        {/* Pagination */}
        <div className="flex justify-center items-center mt-6 space-x-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-base transition-colors"
          >
            Prev
          </button>
          <span className="font-medium text-lg">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-base transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
  
};

export default VetAppHistory;
