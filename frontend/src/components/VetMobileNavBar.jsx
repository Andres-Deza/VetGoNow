import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

const VetMobileNavBar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const closeDrawer = () => setIsDrawerOpen(false);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    closeDrawer();
    navigate('/login');
  };

  const navItems = [
    {
      label: 'Urgencias',
      path: '/vet/emergencies',
      icon: (
        <span role="img" aria-label="Urgencias">
          🚨
        </span>
      ),
      highlight: true,
    },
    {
      label: 'Panel General',
      path: '/vet-dashboard',
      icon: (
        <span role="img" aria-label="Panel">
          📊
        </span>
      ),
    },
    {
      label: 'Mis Citas',
      path: '/vet/appointments',
      icon: (
        <span role="img" aria-label="Citas">
          📅
        </span>
      ),
    },
    {
      label: 'Mi Agenda',
      path: '/vet/schedule',
      icon: (
        <span role="img" aria-label="Agenda">
          🗓️
        </span>
      ),
    },
    {
      label: 'Horarios de Atención',
      path: '/vet/schedule-config',
      icon: (
        <span role="img" aria-label="Horarios">
          ⏰
        </span>
      ),
    },
    {
      label: 'Historial',
      path: '/vet/history',
      icon: (
        <span role="img" aria-label="Historial">
          📋
        </span>
      ),
    },
    {
      label: 'Mensajes',
      path: '/vet/conversations',
      icon: (
        <span role="img" aria-label="Mensajes">
          💬
        </span>
      ),
    },
    {
      label: 'Configuración',
      path: '/vet/update-profile',
      icon: (
        <span role="img" aria-label="Configuración">
          ⚙️
        </span>
      ),
    },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white border-b border-vet-gray-light shadow-sm px-4 py-3 md:hidden">
        <button
          onClick={() => navigate('/vet/emergencies')}
          className="flex items-center gap-2"
        >
          <Logo onDarkBackground={false} className="h-8 w-auto" />
        </button>

        <button
          onClick={toggleDrawer}
          className="p-2 text-vet-primary rounded-full hover:bg-vet-gray-light transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeDrawer}
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-[70%] max-w-sm bg-vet-primary text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-vet-secondary/30">
          <div>
            <p className="text-xs uppercase tracking-wide text-vet-secondary-light opacity-80">Bienvenido</p>
            <p className="text-base font-semibold truncate max-w-[180px]">{user?.name || 'Veterinario'}</p>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-full hover:bg-vet-primary-light transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path) || location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  closeDrawer();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  item.highlight
                    ? active
                      ? 'bg-red-600 shadow-lg'
                      : 'bg-red-500 hover:bg-red-600 shadow'
                    : active
                    ? 'bg-vet-secondary'
                    : 'hover:bg-vet-secondary/50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-6 border-t border-vet-secondary/30 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors px-4 py-3 text-sm font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default VetMobileNavBar;

