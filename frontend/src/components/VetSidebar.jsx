import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";

const VetSidebar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="w-64 h-full md:h-screen bg-vet-primary text-white shadow-md flex flex-col overflow-y-auto">
      {/* Logo / Branding */}
      <div className="p-6 border-b border-vet-secondary/30">
        <Logo onDarkBackground={true} className="h-10 w-auto mb-2" />
        <p className="text-sm text-vet-secondary-light opacity-90">Panel Veterinario</p>
      </div>

      {/* User Info */}
      <div className="px-4 py-3 bg-vet-primary-dark">
        <p className="text-xs text-vet-secondary-light opacity-80">Bienvenido</p>
        <p className="text-sm font-semibold truncate">{user.name || "Veterinario"}</p>
      </div>

      {/* Sidebar Links */}
      <nav className="flex flex-col p-4 space-y-2 flex-1">
        {/* URGENCIAS - Primera y más destacada */}
        <NavLink
          to="/vet/emergencies"
          className={({ isActive }) =>
            `px-4 py-3 rounded-lg transition relative flex items-center gap-3 font-semibold ${
              isActive 
                ? "bg-red-600 shadow-lg" 
                : "bg-red-500 hover:bg-red-600 shadow"
            }`
          }
        >
          <span className="text-xl">🚨</span>
          <span>Urgencias</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
        </NavLink>

        <div className="my-2 border-t border-vet-secondary/30"></div>

        <NavLink
          to="/vet-dashboard"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>📊</span>
          <span>Panel General</span>
        </NavLink>

        <NavLink
          to="/vet/appointments"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>📅</span>
          <span>Mis Citas</span>
        </NavLink>

        <NavLink
          to="/vet/schedule"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>🗓️</span>
          <span>Mi Agenda</span>
        </NavLink>

        <NavLink
          to="/vet/schedule-config"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>⏰</span>
          <span>Horarios de Atención</span>
        </NavLink>

        <NavLink
          to="/vet/history"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>📋</span>
          <span>Historial</span>
        </NavLink>

        <NavLink
          to="/vet/earnings"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>💰</span>
          <span>Mis Ganancias</span>
        </NavLink>

        <NavLink
          to="/vet/conversations"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>💬</span>
          <span>Mensajes</span>
        </NavLink>

        <div className="my-2 border-t border-vet-secondary/30"></div>

        <NavLink
          to="/vet/update-profile"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition flex items-center gap-3 ${
              isActive ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
            }`
          }
        >
          <span>⚙️</span>
          <span>Configuración</span>
        </NavLink>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-vet-secondary/30">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-vet-primary-dark hover:bg-vet-primary-light rounded-md transition flex items-center justify-center gap-2"
        >
          <span>🚪</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default VetSidebar;
