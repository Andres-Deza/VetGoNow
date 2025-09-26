import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import avatar from '../../../Backend/uploads/avatar.png';

const VetPage = () => {
  const [vets, setVets] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [filters, setFilters] = useState({
    name: "",
    phoneNumber: "",
    region: "",
    comuna: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchVets = async () => {
      try {
        const res = await axios.get("http://localhost:5555/api/vets");
        setVets(res.data);
      } catch (error) {
        console.error("Error fetching vets:", error);
      }
    };
    fetchVets();
  }, []);

  const filteredVets = vets.filter((vet) => {
    return (
      (!filters.name || vet.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.phoneNumber || vet.phoneNumber?.includes(filters.phoneNumber)) &&
      (!filters.region || vet.region?.toLowerCase().includes(filters.region.toLowerCase())) &&
      (!filters.comuna || vet.comuna?.toLowerCase().includes(filters.comuna.toLowerCase()))
    );
  });

  const sortedVets = [...filteredVets].sort((a, b) => {
    const fieldA = (a[sortBy] || "").toLowerCase();
    const fieldB = (b[sortBy] || "").toLowerCase();
    return fieldA.localeCompare(fieldB);
  });

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="container mx-auto p-6 flex-1 overflow-auto">
        <h2 className="text-3xl font-bold text-center mb-6">Nuestros Veterinarios</h2>

        {/* Filters and Sort */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <input
            type="text"
            placeholder="Filtrar por Nombre"
            className="border border-gray-400 rounded px-3 py-2"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Filtrar por Teléfono"
            className="border border-gray-400 rounded px-3 py-2"
            value={filters.phoneNumber}
            onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value })}
          />


          <input
            type="text"
            placeholder="Filtrar por Región"
            className="border border-gray-400 rounded px-3 py-2"
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          />
          <input
            type="text"
            placeholder="Filtrar por Comuna"
            className="border border-gray-400 rounded px-3 py-2"
            value={filters.comuna}
            onChange={(e) => setFilters({ ...filters, comuna: e.target.value })}
          />
        </div>

        {/* Vet Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
          {sortedVets.map((vet) => (
            <div
              key={vet._id}
              className="bg-gradient-to-b from-gray-100 to-gray-200 shadow-lg rounded-lg p-6 w-64 flex flex-col items-center cursor-pointer hover:scale-105 transition transform hover:shadow-xl"
              onClick={() => navigate(`/appointment/${vet._id}`)}
            >
              <img
                src={avatar}
                alt={vet.name}
                className="w-32 h-32 rounded-full object-cover border-2 border-blue-600 mb-4"
              />
              <h3 className="text-2xl font-semibold text-gray-900 mb-1 text-center">{vet.name || "N/A"}</h3>
              <p className="text-gray-600 mb-1 text-center">{vet.email || "N/A"}</p>
              <p className="text-gray-600 mb-1 text-center">Teléfono: {vet.phoneNumber || "N/A"}</p>
              <p className="text-gray-600 mb-4 text-center">
                Comuna: {vet.comuna || "N/A"}, Región: {vet.region || "N/A"}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/appointment/${vet._id}`);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition w-full mt-auto"
              >
                Reservar cita
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VetPage;
