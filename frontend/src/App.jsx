import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Footer from './components/Footer';
import PublicHeader from './components/PublicHeader';
import ErrorBoundary from './components/ErrorBoundary';
import UserLayout from './layouts/UserLayout';
import VetLayout from './layouts/VetLayout';
import { initializeNotifications } from './utils/notifications';
import { io } from 'socket.io-client';
import VideoCallNotification from './components/VideoCallNotification';

// ==================== PÁGINAS PÚBLICAS ====================
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import TermsPage from './pages/public/TermsPage';
const VetGoNow360Page = lazy(() => import('./pages/public/VetGoNow360Page'));

// ==================== PÁGINAS DE AUTENTICACIÓN ====================
import LoginPage from './pages/auth/LoginPage';
import UserLoginPage from './pages/auth/UserLoginPage';
import VetLoginPage from './pages/auth/VetLoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UserRegisterPage from './pages/auth/UserRegisterPage';
import VetRegisterPage from './pages/auth/VetRegisterPage';
const VetRegisterTypeSelection = lazy(() => import('./pages/auth/VetRegisterTypeSelection'));
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
const WaitingPage = lazy(() => import('./pages/auth/WaitingPage'));

// ==================== PÁGINAS DE USUARIO ====================
import UserHome from './pages/user/UserHome';
import UserDashboard from './pages/user/UserDashboard';
import PetsPage from './pages/user/PetsPage';
const PetDetails = lazy(() => import('./pages/user/PetDetails'));
const MyAppointments = lazy(() => import('./pages/user/MyAppointments'));
const Settings = lazy(() => import('./pages/user/Settings'));
const VetPage = lazy(() => import('./pages/user/VetPage'));
const AppointmentPage = lazy(() => import('./pages/user/AppointmentPage'));
const ClientAppHistory = lazy(() => import('./pages/user/ClientAppHistory'));
const ClientPrescriptionForm = lazy(() => import('./pages/user/ClientAppComplete'));
const ClientVideoCall = lazy(() => import('./pages/user/ClientVideoCall'));
const PrescriptionDetail = lazy(() => import('./pages/user/PrescriptionDetail'));
const CompletedAppointmentPage = lazy(() => import('./pages/user/CompletedAppointmentPage'));
const PaymentProcessing = lazy(() => import('./pages/user/PaymentProcessing'));
const PaymentSuccess = lazy(() => import('./pages/user/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/user/PaymentFailure'));
const VetSearchPage = lazy(() => import('./pages/user/VetSearchPage'));
const EmergencyRequestPage = lazy(() => import('./pages/user/EmergencyRequestPage'));
const EmergencyHomeRequestPage = lazy(() => import('./pages/user/EmergencyHomeRequestPage'));
const EmergencyTrackingPage = lazy(() => import('./pages/user/EmergencyTrackingPage'));
const PreventiveCareAssistant = lazy(() => import('./pages/user/PreventiveCareAssistant'));

// ==================== PÁGINAS DE VETERINARIO ====================
const VetDashboard = lazy(() => import('./pages/vet/VetDashboard'));
import VetAppointments from './pages/vet/VetAppointments';
const VetSchedulePage = lazy(() => import('./pages/vet/VetSchedulePage'));
const VetScheduleConfigPage = lazy(() => import('./pages/vet/VetScheduleConfigPage'));
const VetAppHistory = lazy(() => import('./pages/vet/VetAppHistory'));
const VetUpdateProfile = lazy(() => import('./pages/vet/VetUpdateProfile'));
const OngoingAppointment = lazy(() => import('./pages/vet/OngoingAppointment'));
const VideoCall = lazy(() => import('./pages/vet/VideoCall'));
const VetEmergencyPanel = lazy(() => import('./pages/vet/VetEmergencyPanel'));
const VetEmergenciesPage = lazy(() => import('./pages/vet/VetEmergenciesPage'));
const VetEmergencyTrackingPage = lazy(() => import('./pages/vet/VetEmergencyTrackingPage'));
const VetEarningsPage = lazy(() => import('./pages/vet/VetEarningsPage'));

// ==================== PÁGINAS COMPARTIDAS ====================
const ConversationsPage = lazy(() => import('./pages/shared/ConversationsPage'));

// Componente de carga
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-vet-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">Cargando...</p>
    </div>
  </div>
);


const App = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  // Verificar estado de notificaciones cuando el usuario está autenticado
  // No solicitamos permiso automáticamente - debe ser resultado de una acción del usuario
  useEffect(() => {
    if (user) {
      // Solo verificar el estado, no solicitar permiso automáticamente
      initializeNotifications().catch(error => {
        console.error('Error al verificar notificaciones:', error);
      });
    }
  }, [user]);

  // Rutas que NO deben mostrar navbar ni bottom nav ni sidebar
  const noNavRoutes = [
    '/login',
    '/login/user',
    '/login/vet',
    '/register',
    '/register/user',
    '/register/vet',
    '/forgot-password',
    '/reset-password',
    '/waitingpage',
  ];

  // Rutas públicas que NO deben mostrar sidebar (solo estas rutas específicas)
  const publicRoutes = ['/', '/about', '/vetgonow-360', '/terms'];

  // Rutas públicas que deben mostrar header público
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isNoNavRoute = noNavRoutes.some(route => location.pathname.startsWith(route));
  
  const shouldShowPublicHeader = isPublicRoute;
  const isPlatformRoute = user && !isPublicRoute && !isNoNavRoute;
  const shouldShowFooter = !isPlatformRoute;

  return (
    <>
      {/* Header Público - Solo para rutas públicas */}
      {shouldShowPublicHeader && <PublicHeader />}

      <div className="text-black">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/vetgonow-360" element={<VetGoNow360Page />} />
            <Route path="/terms" element={<TermsPage />} />
            
            {/* Rutas de Autenticación */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/user" element={<UserLoginPage />} />
            <Route path="/login/vet" element={<VetLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register/user" element={<UserRegisterPage />} />
            <Route path="/register/vet" element={<VetRegisterTypeSelection />} />
            <Route path="/register/vet/independent" element={<VetRegisterPage vetType="independent" />} />
            <Route path="/register/vet/clinic" element={<VetRegisterPage vetType="clinic" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/waitingpage" element={<WaitingPage />} />

          {/* Rutas de Usuario - Con UserLayout */}
          <Route element={<UserLayout />}>
            <Route path="/user/home" element={<UserHome />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/mypets" element={<PetsPage />} />
            <Route path="/pet-details" element={<PetDetails />} />
            <Route path="/appointments" element={<MyAppointments />} />
            <Route path="/client/history" element={<ClientAppHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/vets" element={<VetPage />} />
            <Route path="/appointment/:id" element={<AppointmentPage />} />
            <Route path="/prescription/:appointmentId" element={<PrescriptionDetail />} />
            <Route path="/completed-appointment/:appointmentId" element={<CompletedAppointmentPage />} />
            <Route path="/client/appointment-form/:appointmentId" element={<ClientPrescriptionForm />} />
            <Route path="/client/video-call/:appointmentId" element={<ClientVideoCall />} />
            <Route path="/payment/process/:id" element={<PaymentProcessing />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failure" element={<PaymentFailure />} />
            <Route path="/mapa-veterinarios" element={<VetSearchPage />} />
            <Route path="/agendar-cita" element={<VetSearchPage />} />
            <Route path="/videoconsulta" element={<VetSearchPage />} />
            <Route path="/emergency/request" element={<EmergencyRequestPage />} />
            <Route path="/emergency/home/request" element={<EmergencyHomeRequestPage />} />
            <Route path="/emergency/:requestId/tracking" element={<EmergencyTrackingPage />} />
            <Route path="/emergency/list" element={<Navigate to="/appointments" replace />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/conversations/:conversationId" element={<ConversationsPage />} />
            <Route path="/preventive-care" element={<PreventiveCareAssistant />} />
          </Route>

          {/* Rutas de Veterinario - Con VetLayout */}
          <Route element={<VetLayout />}>
            <Route path="/vet-dashboard" element={<VetDashboard />} />
            <Route path="/vet/appointments" element={<VetAppointments />} />
            <Route path="/vet/schedule" element={<VetSchedulePage />} />
            <Route path="/vet/schedule-config" element={<VetScheduleConfigPage />} />
            <Route path="/vet/history" element={<VetAppHistory />} />
            <Route path="/vet/update-profile" element={<VetUpdateProfile />} />
            <Route path="/vet/earnings" element={<VetEarningsPage />} />
          <Route path="/appointments/:appointmentId/ongoing" element={<OngoingAppointment />} />
            <Route path="/prescription-form/:appointmentId" element={<OngoingAppointment />} />
          <Route path="/vet/emergency/:emergencyId/navigate" element={<VetEmergencyTrackingPage />} />
            <Route path="/video-call/:appointmentId" element={<VideoCall />} />
            <Route path="/vet/emergency/panel" element={<VetEmergencyPanel />} />
            <Route path="/vet/emergencies" element={<VetEmergenciesPage />} />
            <Route path="/vet/emergency/:emergencyId/tracking" element={<VetEmergencyTrackingPage />} />
            <Route path="/vet/conversations" element={<ConversationsPage />} />
            <Route path="/vet/conversations/:conversationId" element={<ConversationsPage />} />
            <Route path="/vet/completed-appointment/:appointmentId" element={<CompletedAppointmentPage />} />
          </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      
      {/* Notificación global de videollamada - Aparece en todas las páginas */}
      {user && user.role === 'user' && <VideoCallNotification userId={user.id} />}
      
      {shouldShowFooter && <Footer />}
    </>
  );
};

export default App;
