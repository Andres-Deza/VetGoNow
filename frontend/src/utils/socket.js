// utils/socket.js
import io from "socket.io-client";

// Use environment variable in production (e.g., Vercel), fallback to local dev
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5555";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;