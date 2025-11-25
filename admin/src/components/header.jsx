import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between py-3 px-4 md:py-4 md:px-6 bg-blue-800 text-white shadow-md">
      {/* Left Side - Menu Button (Mobile) + Logo & Brand Name */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-blue-700 rounded-lg transition-colors"
          aria-label="Alternar menú"
        >
          <Menu size={24} />
        </button>

        {/* Logo & Brand */}
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate("/admin/dashboard")}
        >
          <img src="/Logo.png" alt="Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-full" />
          <span className="text-lg md:text-xl font-bold">VetGoNow</span>
        </div>
      </div>

      {/* Right Side - Links & User Authentication */}
      <div className="hidden md:flex items-center gap-6">
        {/* {user?.role === "admin" && (
          <>
            <button onClick={() => navigate("/admin/dashboard")} className="text-white hover:text-blue-300">Dashboard</button>
            <button onClick={() => navigate("/admin/users")} className="text-white hover:text-blue-300">Manage Users</button>
            <button onClick={() => navigate("/admin/vets")} className="text-white hover:text-blue-300">Manage Vets</button>
            <button onClick={() => navigate("/admin/appointments")} className="text-white hover:text-blue-300">Appointments</button>
            <button onClick={() => navigate("/admin/revenue")} className="text-white hover:text-blue-300">Revenue</button>
            <button onClick={() => navigate("/admin/register")} className="text-white hover:text-blue-300">Register Admin</button>
          </>
        )} */}

        {user ? (
          // If user is logged in, show profile & logout
          // If user is logged in, show profile & logout
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-sm text-gray-200">Admin</span>
            </div>
            <img 
              src="/user-icon.png"
              alt="User Icon" 
              className="w-8 h-8 rounded-full"
            />
            <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded-full hover:bg-red-600">
              Salir
            </button>
          </div>

        ) : (
          // If not logged in, show Login/Register
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/login")} className="bg-blue-600 px-6 py-2 rounded-full text-white hover:bg-blue-500">
              Iniciar Sesión
            </button>
            <button onClick={() => navigate("/register")} className="bg-white text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50">
              Registrarse
            </button>
          </div>
        )}
      </div>

      {/* Mobile User Menu */}
      <div className="md:hidden">
        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-right">
              <span className="text-sm font-medium truncate max-w-[120px]">{user.name}</span>
              <span className="text-xs text-gray-200">Admin</span>
            </div>
            <img 
              src="/user-icon.png"
              alt="Icono de Usuario" 
              className="w-8 h-8 rounded-full"
            />
            <button 
              onClick={handleLogout} 
              className="bg-red-500 px-3 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors"
            >
              Salir
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate("/login")} 
              className="bg-blue-600 px-3 py-1.5 rounded-lg text-sm text-white hover:bg-blue-500 transition-colors"
            >
              Iniciar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;