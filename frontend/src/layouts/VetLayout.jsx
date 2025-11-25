import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import VetSidebar from '../components/VetSidebar';
import VetMobileNavBar from '../components/VetMobileNavBar';
import VetBottomNav from '../components/VetBottomNav';
import EmergencyChatNotification from '../components/EmergencyChatNotification';

const VetLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // If user is not a 'Vet' role, redirect them
        if (parsedUser.role !== 'Vet') {
          if (parsedUser.role === 'User') {
            navigate('/user/home', { replace: true });
          } else if (parsedUser.role === 'Admin') {
            navigate('/admin-dashboard', { replace: true });
          }
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.clear();
        navigate('/login', { replace: true });
      }
    } else {
      // If no user, redirect to login
      navigate('/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  if (!user || user.role !== 'Vet') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <VetMobileNavBar user={user} />

      {/* Notificación flotante de chat de urgencia */}
      <EmergencyChatNotification user={user} />

      <div className="flex min-h-screen bg-gray-50 pt-16 md:pt-0">
        {/* Sidebar desktop */}
        <div className="hidden md:flex">
          <aside className="fixed inset-y-0 left-0 w-64">
            <VetSidebar />
          </aside>
        </div>

        {/* Main content */}
        <main className="flex-1 w-full md:ml-64 px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-24 md:pb-10">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      <VetBottomNav />
    </>
  );
};

export default VetLayout;