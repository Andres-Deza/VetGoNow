import axios from 'axios';

// Solo usar VITE_API_BASE, sin fallback a localhost
const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  console.error('VITE_API_BASE no está configurado. Por favor configura esta variable de entorno.');
}

axios.defaults.baseURL = API_BASE || '';

// Exportar API_BASE para uso en otros componentes
export { API_BASE };
export default axios;

const shouldForceLogout = (status, message, url) => {
  if (!status && !message) {
    return false;
  }

  const normalizedMessage = (message || '').toLowerCase();
  const normalizedUrl = (url || '').toLowerCase();

  // Mensajes específicos de autenticación que requieren deslogueo
  const knownAuthMessages = [
    'user not found',
    'not authorized',
    'invalid or expired token',
    'token missing',
    'invalid token structure',
    'invalid token',
    'token error',
    'no token',
    'no autorizado', // Versión en español
    'no autenticado', // Versión en español
    'sesión ha expirado', // Versión en español
    'sesion ha expirado', // Versión en español sin tilde
  ];

  // Mensajes que NO requieren deslogueo (errores de permisos, no de autenticación)
  const permissionOnlyMessages = [
    'no autorizado para acceder',
    'no tienes permiso',
    'no tiene permiso',
    'access denied',
    'forbidden',
  ];

  // Verificar si el mensaje es solo de permisos (no de autenticación)
  const isPermissionOnly = permissionOnlyMessages.some((known) =>
    normalizedMessage.includes(known),
  );

  // Si es un error 403 con mensaje de permisos (no autenticación), no desloguear
  if (status === 403 && isPermissionOnly) {
    return false;
  }

  // Si es 401, siempre desloguear (es un error de autenticación)
  if (status === 401) {
    return true;
  }

  // Verificar mensajes de autenticación conocidos
  const matchesKnownMessage = knownAuthMessages.some((known) =>
    normalizedMessage.includes(known),
  );

  // Si hay un mensaje de autenticación conocido, desloguear
  if (matchesKnownMessage) {
    return true;
  }

  // Si es 403 sin mensaje específico de permisos, verificar el contexto
  // Algunos 403 pueden ser de autenticación si no hay mensaje
  if (status === 403 && !isPermissionOnly && !normalizedMessage) {
    // Si el URL sugiere que es una ruta de autenticación/protección, desloguear
    if (normalizedUrl.includes('/auth/') || normalizedUrl.includes('/verify') || normalizedUrl.includes('/token')) {
      return true;
    }
    // Si no, es probablemente un error de permisos, no desloguear
    return false;
  }

  return false;
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    const url = error?.config?.url || error?.response?.config?.url;

    if (shouldForceLogout(status, message, url)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (status === 401) {
        sessionStorage.setItem(
          'authErrorMessage',
          'Tu sesión ha expirado o ha sido invalidada. Por favor inicia sesión nuevamente.',
        );
      } else if (message && (message.toLowerCase().includes('token') || message.toLowerCase().includes('autenticado') || message.toLowerCase().includes('autorizado'))) {
        sessionStorage.setItem('authErrorMessage', message);
      } else if (status === 403 && !message) {
        // Solo si es 403 sin mensaje y se determinó que es de autenticación
        sessionStorage.setItem(
          'authErrorMessage',
          'Tu sesión ha expirado o ha sido invalidada. Por favor inicia sesión nuevamente.',
        );
      }

      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  },
);


