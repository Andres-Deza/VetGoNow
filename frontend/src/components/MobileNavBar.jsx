import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";

const MobileNavBar = ({ user, showBackButton = false, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setShowDrawer(false);
    navigate("/");
  };

  const toggleDrawer = () => {
    setShowDrawer(!showDrawer);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
  };

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setShowDrawer(false);
  }, [location.pathname]);

  // Determinar si mostrar botón de regreso
  const shouldShowBack = showBackButton && onBack;

  return (
    <>
      {/* Top Bar - Fija en la parte superior */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back button o Logo */}
          <div className="flex items-center gap-3">
            {shouldShowBack ? (
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => navigate(user ? "/user/home" : "/")}
              >
                <Logo onDarkBackground={false} className="h-8 w-auto" />
              </div>
            )}
          </div>

          {/* Right: Menu button */}
          <button
            onClick={toggleDrawer}
            className="p-2 -mr-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Overlay para cerrar drawer */}
      {showDrawer && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer lateral - Estilo cuidapet (morado oscuro desde la derecha) */}
      <div
        className={`fixed top-0 right-0 h-full w-[60%] max-w-[320px] bg-tutor-sidebar shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          showDrawer ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header del drawer - Logo VetGoNow */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center justify-center flex-1">
              <span className="text-white text-lg font-bold">
                VetGoNow
              </span>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 text-white hover:bg-tutor-sidebar-hover rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contenido del drawer */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {user ? (
              <>
                {/* Navigation links - Estilo cuidapet */}
                <nav className="space-y-1">
                  {/* Inicio */}
                  <button
                    onClick={() => {
                      navigate("/user/home");
                      closeDrawer();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                      location.pathname === "/user/home" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span>Inicio</span>
                  </button>

                  {/* Citas */}
                  <button
                    onClick={() => {
                      navigate("/appointments");
                      closeDrawer();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                      location.pathname === "/appointments" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Citas</span>
                  </button>

                  {/* Mascotas - Destacado */}
                  <button
                    onClick={() => {
                      navigate("/mypets");
                      closeDrawer();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                      location.pathname === "/mypets" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>Mascotas</span>
                  </button>

                  {/* Documentos */}
                  <button
                    onClick={() => {
                      navigate("/client/history");
                      closeDrawer();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                      location.pathname === "/client/history" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Documentos</span>
                  </button>

                       {/* Conversaciones */}
                       <button
                         onClick={() => {
                           navigate("/conversations");
                           closeDrawer();
                         }}
                         className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                           location.pathname.startsWith("/conversations") ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
                         }`}
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                         </svg>
                         <span>Conversaciones</span>
                       </button>

                       {/* Asistente de Cuidado Preventivo */}
                       <button
                         onClick={() => {
                           navigate("/preventive-care");
                           closeDrawer();
                         }}
                         className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                           location.pathname === "/preventive-care" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
                         }`}
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <span>Asistente Preventivo</span>
                       </button>

                  {/* VetGoNow 360 - OCULTO TEMPORALMENTE */}
                  {/* <button
                    onClick={() => {
                      navigate("/vetgonow-360");
                      closeDrawer();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                      location.pathname === "/vetgonow-360" ? "bg-[#7B4FC2]" : "hover:bg-[#7B4FC2]/50"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-white text-sm font-bold">
                      VetGoNow
                    </span>
                    <span className="text-xs">360</span>
                  </button> */}

                  {/* Mis datos */}
                  <button
                    onClick={() => {
                      navigate("/settings");
                      closeDrawer();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white rounded-lg transition-colors ${
                      location.pathname === "/settings" ? "bg-tutor-sidebar-active" : "hover:bg-tutor-sidebar-hover"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Mis datos</span>
                  </button>
                </nav>

                {/* Botones de acción al final */}
                <div className="mt-auto pt-4 space-y-3 pb-4">
                  {/* Solicitar Urgencia - Botón rojo-naranja */}
                  <button
                    onClick={() => {
                      navigate("/emergency/request");
                      closeDrawer();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-tutor-btn-primary text-white rounded-lg font-medium hover:bg-tutor-btn-primary-hover transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Solicitar Urgencia</span>
                  </button>

                  {/* Cerrar sesión - Botón morado oscuro */}
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
              </>
            ) : (
              <>
                {/* No user - Login options */}
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      navigate("/login");
                      closeDrawer();
                    }}
                    className="w-full bg-white text-tutor-sidebar px-4 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => {
                      navigate("/register");
                      closeDrawer();
                    }}
                    className="w-full border-2 border-white text-white px-4 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors"
                  >
                    Registrarse
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavBar;

