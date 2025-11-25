// utils/socket.js
import io from "socket.io-client";

// Solo usar variables de entorno, sin fallback a localhost
const getSocketURL = () => {
  // Si hay VITE_SOCKET_URL configurado, usarlo
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // Si hay VITE_API_BASE configurado, usarlo (mismo servidor)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // Sin variables configuradas, no intentar conectar (evita permiso de red local)
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