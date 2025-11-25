// utils/socket.js
import io from "socket.io-client";

// Use environment variable in production (e.g., Vercel), fallback to local dev
// En producción, usar la misma URL base que la API
const getSocketURL = () => {
  // Si hay VITE_SOCKET_URL configurado, usarlo
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // Si hay VITE_API_BASE configurado, usarlo (mismo servidor)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // Solo usar localhost en desarrollo local
  if (import.meta.env.DEV || window.location.hostname === 'localhost') {
    return "http://localhost:5555";
  }
  
  // En producción sin variables, no intentar conectar (evita permiso de red local)
  console.warn('Socket.io: No se configuró VITE_SOCKET_URL o VITE_API_BASE. Socket deshabilitado.');
  return null;
};

const SOCKET_URL = getSocketURL();

const socket = SOCKET_URL ? io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
}) : null;

export default socket;