// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Stethoscope,
  Calendar,
  DollarSign,
  LogOut
} from "lucide-react";

const navItems = [
  { name: "Dashboard", icon: <Home size={18} />, path: "/Admin/dashboard" },
  { name: "Users", icon: <Users size={18} />, path: "Admin/users" },
  { name: "Vets", icon: <Stethoscope size={18} />, path: "Admin/vets" },
  { name: "Appointments", icon: <Calendar size={18} />, path: "Admin/appointments" },
  { name: "Revenue", icon: <DollarSign size={18} />, path: "Admin/revenue" }
];

const Sidebar = () => {



  return (
    <aside className="w-64 bg-white border-r h-full shadow-sm flex flex-col">
      <div className="p-6 text-xl font-bold text-blue-600">Admin Panel</div>

      <nav className="flex-1 flex flex-col gap-1 px-4">
        {navItems.map(({ name, icon, path }) => (
          <NavLink
            key={name}
            to={path}
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
  );
};

export default Sidebar;
