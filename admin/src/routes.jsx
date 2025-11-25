import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Vets from './pages/Vets';
import EditVet from './pages/EditVet';
import Appointments from './pages/Appointments';
import Revenue from './pages/Revenue';
import VetReliability from './pages/VetReliability';
import Pricing from './pages/Pricing';
import CommissionManagement from './pages/CommissionManagement';
import Login from './pages/Login';
import Register from './pages/Register';


const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      console.log('ProtectedRoute: Acceso denegado, redirigiendo a /login');
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/admin/dashboard"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />
      <Route
        path="/admin/users"
        element={<ProtectedRoute><Users /></ProtectedRoute>}
      />
      <Route
        path="/admin/vets"
        element={<ProtectedRoute><Vets /></ProtectedRoute>}
      />
      <Route
        path="/admin/vets/:id/edit"
        element={<ProtectedRoute><EditVet /></ProtectedRoute>}
      />
      <Route
        path="/admin/appointments"
        element={<ProtectedRoute><Appointments /></ProtectedRoute>}
      />
      <Route
        path="/admin/revenue"
        element={<ProtectedRoute><Revenue /></ProtectedRoute>}
      />
      <Route
        path="/admin/vet-reliability"
        element={<ProtectedRoute><VetReliability /></ProtectedRoute>}
      />
      <Route
        path="/admin/pricing"
        element={<ProtectedRoute><Pricing /></ProtectedRoute>}
      />
      <Route
        path="/admin/commissions"
        element={<ProtectedRoute><CommissionManagement /></ProtectedRoute>}
      />
      <Route
        path="/admin/register"
        element={<ProtectedRoute><Register /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;