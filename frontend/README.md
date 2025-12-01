# Frontend - VetGoNow

Aplicación web principal de VetGoNow desarrollada con React y Vite. Proporciona interfaces para tutores de mascotas y veterinarios.

## Tecnologías

- React 18
- Vite 6
- React Router 7
- TailwindCSS 3
- Google Maps API
- Jitsi Meet SDK
- Socket.io Client
- Axios

## Desarrollo Local

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Variables de Entorno

Crear archivo `.env` en la raíz de `frontend/`:

```env
VITE_API_BASE=http://localhost:5555
VITE_SOCKET_URL=http://localhost:5555
VITE_GOOGLE_MAPS_API_KEY=tu_api_key
```

## Build para Producción

```bash
npm run build
```

Los archivos compilados se generan en la carpeta `dist/`.
