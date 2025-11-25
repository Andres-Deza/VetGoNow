import { useNavigate, useLocation } from "react-router-dom";
import { memo, useRef, useState, useEffect } from "react";
import Logo from "./Logo";

const DesktopSidebar = memo(({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Usar ref y estado para rastrear el pathname y solo actualizar cuando realmente cambie (no query params)
  const pathnameRef = useRef(location.pathname);
  const [pathname, setPathname] = useState(location.pathname);
  
  useEffect(() => {
    // Solo actualizar si el pathname realmente cambió (no query params)
    if (pathnameRef.current !== location.pathname) {
      pathnameRef.current = location.pathname;
      setPathname(location.pathname);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };


  return (
    <div className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-tutor-sidebar shadow-xl flex-col" style={{ zIndex: 50 }}>
      {/* Logo VetGoNow */}
      <div className="flex items-center justify-center p-6 border-b border-white/20">
        <Logo onDarkBackground={true} className="h-10 w-auto" />
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* Inicio */}
        <button
          onClick={() => navigate("/user/home")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname === "/user/home" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>Inicio</span>
        </button>

        {/* Citas */}
        <button
          onClick={() => navigate("/appointments")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname === "/appointments" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Citas</span>
        </button>

        {/* Mascotas */}
        <button
          onClick={() => navigate("/mypets")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname === "/mypets" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>Mascotas</span>
        </button>

        {/* Documentos */}
        <button
          onClick={() => navigate("/client/history")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname === "/client/history" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Documentos</span>
        </button>

        {/* Conversaciones */}
        <button
          onClick={() => navigate("/conversations")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname.startsWith("/conversations") ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Conversaciones</span>
        </button>

        {/* Asistente de Cuidado Preventivo */}
        <button
          onClick={() => navigate("/preventive-care")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname === "/preventive-care" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Asistente Preventivo</span>
        </button>

        {/* VetGoNow 360 - OCULTO TEMPORALMENTE */}
        {/* <button
          onClick={() => navigate("/vetgonow-360")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname === "/vetgonow-360" ? "bg-vet-secondary" : "hover:bg-vet-secondary/50"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-white text-sm font-bold">VetGoNow</span>
          <span className="text-xs">360</span>
        </button> */}

        {/* Mis datos */}
        <button
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
            pathname === "/settings" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Mis datos</span>
        </button>
      </nav>

      {/* Botones de acción y usuario al final */}
      <div className="p-4 space-y-3 border-t border-white/20">
        {/* Solicitar Urgencia - Botón naranja de acción */}
        <button
          onClick={() => navigate("/emergency/request")}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-tutor-btn-primary text-white rounded-lg font-medium hover:bg-tutor-btn-primary-hover transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Solicitar Urgencia</span>
        </button>

        {/* Información del usuario */}
        {user && (
          <div className="px-4 py-3 text-white text-sm">
            <p className="text-white/70 text-xs">Bienvenid@</p>
            <p className="font-semibold">{user.name}</p>
          </div>
        )}

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-tutor-sidebar/80 border-2 border-white/20 text-white rounded-lg font-medium hover:bg-tutor-sidebar-hover transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
});

DesktopSidebar.displayName = 'DesktopSidebar';

export default DesktopSidebar;

