import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarCheck,
  FaPrescriptionBottle,
  FaHistory,
  FaPaw,
  FaUserMd,
} from "react-icons/fa";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section with background image */}
      <section
        className="relative w-full h-[500px] flex flex-col justify-center px-8 md:px-20 text-white"
        style={{
          backgroundImage: 'url("/header-bg.jpg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay for better contrast */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Reserva una cita <br /> con doctores de confianza
          </h1>
          <p className="text-lg md:text-xl mb-8 font-light">
            Navega por nuestra lista de doctores de confianza y agenda tu cita fácilmente.
          </p>
          <button
            onClick={() => navigate("/vets")}
            className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:scale-105 transition-transform duration-300 flex items-center gap-2"
          >
            Reservar cita{" "}
            <img className="w-4" src="rightarrow.png" alt="Arrow" />
          </button>
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          Bienvenido a VetGoNow
        </h2>
        <p className="text-lg text-gray-600 mb-10">
          Conectando dueños de mascotas con veterinarios calificados de forma fácil y eficiente.
        </p>

        {/* Main Services */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <FaCalendarCheck className="text-blue-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Reserva de citas en línea</h3>
            <p className="text-gray-600">Reserva citas con veterinarios cuando lo necesites.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <FaPrescriptionBottle className="text-green-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Recetas digitales</h3>
            <p className="text-gray-600">Accede a tus recetas al instante y de forma segura.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            <FaHistory className="text-yellow-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Historial de tratamientos</h3>
            <p className="text-gray-600">Consulta tratamientos previos, revisiones y el historial de tu mascota.</p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          <div className="flex flex-col items-center">
            <FaPaw className="text-gray-500 text-4xl mb-2" />
            <p className="text-sm text-gray-700">Múltiples mascotas</p>
          </div>
          <div className="flex flex-col items-center">
            <FaUserMd className="text-gray-500 text-4xl mb-2" />
            <p className="text-sm text-gray-700">Doctores calificados</p>
          </div>
          <div className="flex flex-col items-center">
            <FaHistory className="text-gray-500 text-4xl mb-2" />
            <p className="text-sm text-gray-700">Seguimiento Fácil</p>
          </div>
          <div className="flex flex-col items-center">
            <FaCalendarCheck className="text-gray-500 text-4xl mb-2" />
            <p className="text-sm text-gray-700">Programación Rápida</p>
          </div>
          <div className="flex flex-col items-center">
            <FaPrescriptionBottle className="text-gray-500 text-4xl mb-2" />
            <p className="text-sm text-gray-700">Acceso Instantáneo</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
