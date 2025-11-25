import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DesktopSidebar from '../components/DesktopSidebar';
import MobileNavBar from '../components/MobileNavBar';
import BottomNav from '../components/BottomNav';
import EmergencyChatNotification from '../components/EmergencyChatNotification';

const UserLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // useEffect solo se ejecuta una vez al montar el componente
  const hasCheckedUserRef = useRef(false);
  const lastPathnameRef = useRef(location.pathname);
  
  useEffect(() => {
    // Solo verificar usuario cuando cambia el pathname (no query params)
    const pathnameChanged = lastPathnameRef.current !== location.pathname;
    
    if (!hasCheckedUserRef.current || pathnameChanged) {
      lastPathnameRef.current = location.pathname;
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // Solo actualizar el estado si es diferente para evitar re-renderizados
          setUser(prev => {
            if (prev && prev.id === parsedUser.id && prev.role === parsedUser.role) {
              return prev; // No cambiar si es el mismo usuario
            }
            return parsedUser;
          });
          
          // Si el usuario no es 'User', redirigirlo
          if (parsedUser.role !== 'User') {
            if (parsedUser.role === 'Vet') {
              navigate('/vet-dashboard', { replace: true });
            } else if (parsedUser.role === 'Admin') {
              navigate('/admin-dashboard', { replace: true });
            } else {
              navigate('/login', { replace: true });
            }
          }
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          localStorage.clear();
          navigate('/login', { replace: true });
        }
      } else {
        // Si no hay usuario, redirigir a login
        navigate('/login', { replace: true });
      }
      
      hasCheckedUserRef.current = true;
    }
  }, [location.pathname, navigate]); // Solo cuando cambia el pathname, no query params
  
  // Memoizar el usuario para evitar re-renderizados innecesarios
  const memoizedUser = useMemo(() => user, [user?.id, user?.role]);

  // Rutas que deben mostrar BottomNav
  const showBottomNavRoutes = [
    '/user/home',
    '/mypets',
    '/appointments',
    '/client/history',
    '/settings',
    '/user-dashboard',
  ];

  // Rutas que deben mostrar botón de regreso
  const shouldShowBack = [
    '/mypets',
    '/appointments',
    '/client/history',
    '/settings',
    '/pet-details',
    '/emergency/request',
  ].some(route => location.pathname.startsWith(route));

  const shouldShowBottomNav = showBottomNavRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  const handleBack = () => {
    window.history.back();
  };

  // Si no hay usuario o no es 'User', mostrar spinner mientras se redirige
  if (!user || user.role !== 'User') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-tutor-sidebar border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <DesktopSidebar user={memoizedUser} />
      
      {/* MobileNavBar - Solo visible en móvil */}
      <MobileNavBar 
        user={memoizedUser} 
        showBackButton={shouldShowBack && location.pathname !== '/user/home'}
        onBack={handleBack}
      />

      {/* Notificación flotante de chat de urgencia */}
      <EmergencyChatNotification user={memoizedUser} />

      {/* Main Content */}
      <div className={`text-tutor-text-primary bg-tutor-bg-primary min-h-screen pt-14 md:pt-0 ${shouldShowBottomNav ? 'pb-[70px]' : ''} md:ml-64`}>
        <Outlet />
      </div>

      {/* Bottom Navigation - Solo móvil */}
      {shouldShowBottomNav && <BottomNav />}
    </>
  );
};

export default UserLayout;

