import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-blue-800 text-white shadow-md flex flex-col">
      {/* Logo / Branding */}
      {/* Sidebar Links */}
      <nav className="flex flex-col p-4 space-y-4">
        <NavLink
          to="/user-dashboard"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition ${isActive ? "bg-blue-600" : "hover:bg-blue-700"}`
          }
        >
          Panel
        </NavLink>
        <NavLink
          to="/appointments"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition ${isActive ? "bg-blue-600" : "hover:bg-blue-700"}`
          }
        >
          Mis Citas
        </NavLink>
        <NavLink
          to="/mypets"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition ${isActive ? "bg-blue-600" : "hover:bg-blue-700"}`
          }
        >
          Mis Mascotas
        </NavLink>
        <NavLink
          to="/client/history"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition ${isActive ? "bg-blue-600" : "hover:bg-blue-700"}`
          }
        >
          Historial de Citas
        </NavLink>
        {/* <NavLink
          to="/client/video-call/:appointmentId"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition ${isActive ? "bg-blue-600" : "hover:bg-blue-700"}`
          }
        >
          Consulta
        </NavLink> */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `px-4 py-2 rounded-md transition ${isActive ? "bg-blue-600" : "hover:bg-blue-700"}`
          }
        >
          Configuración
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
