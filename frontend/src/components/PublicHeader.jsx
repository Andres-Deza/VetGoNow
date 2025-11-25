import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";

const navLinks = [
  { label: "Inicio", path: "/" },
  { label: "Nosotros", path: "/about" },
  // { label: "VetGoNow 360", path: "/vetgonow-360" }, // OCULTO TEMPORALMENTE
];

const PublicHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigate = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => handleNavigate("/")}
        >
          <Logo onDarkBackground={false} className="h-10 w-auto" />
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => handleNavigate(link.path)}
              className={`transition-colors ${
                location.pathname === link.path ? "text-vet-secondary" : "hover:text-vet-secondary-light"
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => handleNavigate("/login")}
            className="px-4 py-2 text-sm font-semibold text-vet-secondary border border-vet-gray-medium rounded-lg hover:bg-vet-gray-light transition-colors"
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => handleNavigate("/register")}
            className="px-4 py-2 text-sm font-semibold text-white bg-vet-accent rounded-lg hover:bg-vet-accent-dark transition-colors"
          >
            Registrarse
          </button>
        </div>

        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col px-4 py-3 space-y-3 text-sm font-medium text-gray-700">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavigate(link.path)}
                className={`text-left px-2 py-2 rounded-lg ${
                  location.pathname === link.path ? "bg-vet-gray-light text-vet-secondary" : "hover:bg-vet-gray-light"
                }`}
              >
                {link.label}
              </button>
            ))}
            <hr className="my-2" />
            <button
              onClick={() => handleNavigate("/login")}
              className="px-2 py-2 rounded-lg border border-vet-gray-medium text-vet-secondary hover:bg-vet-gray-light transition-colors"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => handleNavigate("/register")}
              className="px-2 py-2 rounded-lg bg-vet-accent text-white hover:bg-vet-accent-dark transition-colors"
            >
              Registrarse
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;

