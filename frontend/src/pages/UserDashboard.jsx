import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login"); // Redirect to login if user is not found
    }
  }, [navigate]);

  return user ? (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="p-16 flex-1 flex flex-col justify-center items-center text-center">
        <h1 className="text-6xl font-extrabold mb-6 text-blue-900 drop-shadow-lg">
          ¡Bienvenido de vuelta,{" "}
          <span className="underline decoration-yellow-400">{user.name}!</span>
        </h1>

        <p className="text-2xl text-blue-800 max-w-3xl mb-12">
          ¿Listo para cuidar a tus amigos peludos? ¡Programa tu próxima cita
          veterinaria ahora!
        </p>

        <button
          className="bg-yellow-400 text-blue-900 text-3xl font-bold px-16 py-6 rounded-3xl shadow-lg hover:bg-yellow-500 transition-transform transform hover:scale-105 active:scale-95"
          onClick={() => navigate("/vets")}
        >
          Reservar cita
        </button>
      </div>
    </div>
  ) : null;
};

export default UserDashboard;
