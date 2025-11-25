// Configuración centralizada de API
// Solo usa VITE_API_BASE, sin fallback a localhost
const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  console.error('VITE_API_BASE no está configurado. Por favor configura esta variable de entorno.');
}

export default API_BASE || '';

