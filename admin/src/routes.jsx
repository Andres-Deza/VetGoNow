import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Vets from './pages/Vets';
import Appointments from './pages/Appointments';
import Revenue from './pages/Revenue';
import Login from './pages/Login';
import Register from './pages/Register';


const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      console.log('❌ ProtectedRoute: Access denied, redirecting to /login');
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
        path="/admin/appointments"
        element={<ProtectedRoute><Appointments /></ProtectedRoute>}
      />
      <Route
        path="/admin/revenue"
        element={<ProtectedRoute><Revenue /></ProtectedRoute>}
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