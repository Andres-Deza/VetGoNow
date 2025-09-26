import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
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
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between py-4 px-6 bg-blue-800 text-white shadow-md">
      {/* Left Side - Logo & Brand Name */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
        <img src="Logo.png" alt="Logo" className="w-10 h-10 rounded-full" />
        <span className="text-xl font-bold">VetGestion</span>
      </div>

      {/* Right Side - Links & User Authentication */}
      <div className="hidden md:flex items-center gap-6">
        {/* <button onClick={() => navigate("/")} className="text-white hover:text-blue-300">Home</button>
        <button onClick={() => navigate("/about")} className="text-white hover:text-blue-300">About Us</button> */}

        {user ? (
          // If user is logged in, show profile & logout
          <div className="flex items-center gap-4">
            <span className="font-medium">{user.name}</span>
            {/* <img 
              src="/user-icon.png" // Update this to dynamic user profile if available
              alt="User Icon" 
              className="w-8 h-8 rounded-full"
            /> */}
            <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded-full hover:bg-red-600">
              Cerrar Sesión
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

      {/* Mobile Menu Button */}
      <button className="md:hidden text-white" onClick={() => setShowMenu(!showMenu)}>
        ☰
      </button>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="absolute top-16 right-6 bg-white shadow-md rounded-lg p-4 md:hidden">
          {/* <button onClick={() => navigate("/")} className="block text-blue-800 py-2">Home</button>
          <button onClick={() => navigate("/about")} className="block text-blue-800 py-2">About Us</button> */}

          {user ? (
            // If logged in, show profile & logout
            <div className="flex flex-col gap-4 mt-4">
              <span className="text-blue-800 font-medium">{user.name}</span>
              <button onClick={handleLogout} className="bg-red-500 px-6 py-2 rounded-full text-white hover:bg-red-600">
                Cerrar Sesión
              </button>
            </div>
          ) : (
            // If not logged in, show Login/Register
            <div className="flex flex-col gap-4 mt-4">
              <button onClick={() => navigate("/login")} className="bg-blue-600 px-6 py-2 rounded-full text-white hover:bg-blue-500">
                Iniciar Sesión
              </button>
              <button onClick={() => navigate("/register")} className="bg-white text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50">
                Registrarse
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
