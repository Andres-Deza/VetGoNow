import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="p-4 md:p-8 lg:p-16 flex flex-col justify-center items-center text-center min-h-[calc(100vh-60px)]">
        <h1 className="text-3xl md:text-4xl lg:text-6xl font-extrabold mb-4 md:mb-6 text-blue-900 drop-shadow-lg px-4">
          ¡Bienvenido de vuelta,{" "}
          <span className="underline decoration-yellow-400">{user.name}!</span>
        </h1>

        <p className="text-base md:text-lg lg:text-2xl text-blue-800 max-w-3xl mb-6 md:mb-8 lg:mb-12 px-4">
          ¿Listo para cuidar a tus amigos peludos? ¡Programa tu próxima cita
          veterinaria ahora!
        </p>

        <button
          className="bg-yellow-400 text-blue-900 text-lg md:text-xl lg:text-3xl font-bold px-8 md:px-12 lg:px-16 py-4 md:py-5 lg:py-6 rounded-2xl md:rounded-3xl shadow-lg hover:bg-yellow-500 transition-transform transform hover:scale-105 active:scale-95"
          onClick={() => navigate("/vets")}
        >
          Reservar cita
        </button>
      </div>
    </div>
  ) : null;
};

export default UserDashboard;
