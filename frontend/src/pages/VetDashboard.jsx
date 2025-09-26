import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import VetSidebar from "../components/VetSidebar";
import avatar from "../pages/avatar.png";

const VetDashboard = () => {
  const navigate = useNavigate();
  const [vet, setVet] = useState(null);

  useEffect(() => {
    const storedVet = localStorage.getItem("user");

    if (storedVet) {
      const parsedVet = JSON.parse(storedVet);
      setVet(parsedVet);

      axios
        .get(`http://localhost:5555/api/vets/personalinfo/${parsedVet.id}`)
        .then((res) => {
          setVet(res.data); // full vet details
          console.log("Full vet data:", res.data); // 👈 show in dev console
        })
        .catch((err) => {
          console.error("Error fetching vet details:", err);
        });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return vet ? (
    <div className="flex h-screen">
      <VetSidebar />

      <div className="p-12 flex-1 bg-gray-50 overflow-y-auto">
        {/* Welcome */}
        <h1 className="text-5xl font-bold text-blue-800 mb-10">Bienvenido, Dr. {vet.name}</h1>

        {/* Profile Image + Info */}
        <div className="flex flex-col md:flex-row items-start gap-12 mb-12">
          {/* Image */}
          <img
            src={vet.profileImage || avatar}
            alt="Vet"
            className="w-56 h-56 rounded-full object-cover border-4 border-blue-500"
          />

          {/* Details */}
          <div className="space-y-4 text-xl text-gray-700">
            <p><span className="font-semibold text-gray-900">Email:</span> {vet.email}</p>
            <p><span className="font-semibold text-gray-900">Teléfono:</span> {vet.phoneNumber || "N/A"}</p>
            <p><span className="font-semibold text-gray-900">Especialización:</span> {vet.specialization || "N/A"}</p>
            <p><span className="font-semibold text-gray-900">Experiencia:</span> {vet.experience || "N/A"} años</p>
            <p><span className="font-semibold text-gray-900">Calificaciones:</span> {vet.qualifications || "N/A"}</p>
          </div>
        </div>

        {/* Button at the bottom */}
        <div className="text-center mt-12">
          <button
            className="bg-green-600 text-white text-lg px-8 py-3 rounded-full hover:bg-green-500 transition"
            onClick={() => navigate("/vet/update-profile")}
          >
            Actualizar perfil
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default VetDashboard;
