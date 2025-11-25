// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Stethoscope,
  Calendar,
  DollarSign,
  Activity,
  Settings,
  X,
  Percent
} from "lucide-react";

const navItems = [
  { name: "Panel Principal", icon: <Home size={18} />, path: "/admin/dashboard" },
  { name: "Usuarios", icon: <Users size={18} />, path: "/admin/users" },
  { name: "Veterinarios", icon: <Stethoscope size={18} />, path: "/admin/vets" },
  { name: "Citas", icon: <Calendar size={18} />, path: "/admin/appointments" },
  { name: "Ingresos", icon: <DollarSign size={18} />, path: "/admin/revenue" },
  { name: "Confiabilidad", icon: <Activity size={18} />, path: "/admin/vet-reliability" },
  { name: "Precios", icon: <Settings size={18} />, path: "/admin/pricing" },
  { name: "Comisiones", icon: <Percent size={18} />, path: "/admin/commissions" }
];

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Desktop Sidebar - Always visible on md and up */}
      <aside className="hidden md:flex w-64 bg-white border-r h-full shadow-sm flex-col fixed left-0 top-[72px] z-30">
        <div className="p-6 text-xl font-bold text-blue-600">Panel de Administración</div>

        <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto">
          {navItems.map(({ name, icon, path }) => (
            <NavLink
              key={name}
              to={path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition
                 ${isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`
              }
            >
              {icon}
              {name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar - Drawer */}
      <aside
        className={`fixed top-[72px] left-0 h-[calc(100vh-72px)] w-64 bg-white border-r shadow-lg flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-lg font-bold text-blue-600">Panel de Administración</div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cerrar menú lateral"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto py-4">
          {navItems.map(({ name, icon, path }) => (
            <NavLink
              key={name}
              to={path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition
                 ${isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`
              }
            >
              {icon}
              {name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
