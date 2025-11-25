# Guía: Desplegar Frontend en Vercel

## Paso 1: Obtener URL del Backend

Primero, necesitas la URL de tu backend en Render:

1. Ve a tu [Render Dashboard](https://dashboard.render.com)
2. Selecciona tu servicio `vetgonow-backend`
3. Copia la URL (algo como: `https://vetgonow-backend.onrender.com`)

**Guarda esta URL**, la necesitarás en los siguientes pasos.

---

## Paso 2: Crear Proyecto en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Si es tu primera vez, inicia sesión con GitHub
3. Haz clic en "Add New..." → "Project"
4. Conecta tu repositorio:
   - Si es la primera vez, autoriza Vercel para acceder a GitHub
   - Busca y selecciona el repositorio `VetGoNow`

---

## Paso 3: Configurar el Proyecto

Vercel debería detectar automáticamente que es un proyecto Vite, pero verifica:

### Configuración del Proyecto:

- **Framework Preset**: `Vite` (debería estar automático)
- **Root Directory**: `frontend` ⚠️ **IMPORTANTE**: Cambia esto si está en raíz
- **Build Command**: `npm run build` (automático)
- **Output Directory**: `dist` (automático)
- **Install Command**: `npm install` (automático)

### ⚠️ Importante: Root Directory

**Asegúrate de cambiar el Root Directory a `frontend`** si Vercel lo detectó como raíz del proyecto.

---

## Paso 4: Configurar Variables de Entorno

Antes de desplegar, configura las variables de entorno:

1. En la página de configuración del proyecto, ve a la sección "Environment Variables"
2. Agrega las siguientes variables:

```
VITE_API_BASE = https://vetgonow-backend.onrender.com
VITE_GOOGLE_MAPS_KEY = tu_google_maps_api_key
VITE_SOCKET_URL = https://vetgonow-backend.onrender.com
```

**Importante**:
- Reemplaza `https://vetgonow-backend.onrender.com` con la URL real de tu backend en Render
- Reemplaza `tu_google_maps_api_key` con tu API key de Google Maps
- `VITE_SOCKET_URL` debe ser la misma URL del backend (para Socket.io)

### ¿Dónde obtener la API key de Google Maps?

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a "APIs & Services" → "Credentials"
4. Busca o crea una API key para "Maps JavaScript API"

---

## Paso 5: Desplegar

1. Haz clic en "Deploy"
2. Vercel comenzará a construir y desplegar tu frontend
3. Esto puede tardar 2-5 minutos

---

## Paso 6: Obtener URL del Frontend

Una vez desplegado, Vercel te dará una URL como:
- `https://vetgonow-frontend.vercel.app`
- O una URL personalizada si configuraste un dominio

**Guarda esta URL**, la necesitarás para:
- Actualizar CORS en el backend
- Actualizar variables de entorno en Render

---

## Paso 7: Actualizar vercel.json (Opcional)

El archivo `frontend/vercel.json` ya está configurado, pero verifica que la URL del backend sea correcta:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://vetgonow-backend.onrender.com/api/$1"
    }
  ]
}
```

Si cambiaste algo, haz commit y push, Vercel re-desplegará automáticamente.

---

## Paso 8: Actualizar CORS en el Backend

Ahora necesitas permitir que tu frontend se conecte al backend:

1. Ve a tu repositorio local
2. Abre `Backend/index.js`
3. Busca el array `allowedOrigins` (alrededor de la línea 33)
4. Agrega la URL de Vercel:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://localhost:5174',
  'https://vetgonow-frontend.vercel.app', // Agrega esta línea
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean);
```

5. Haz commit y push:
```bash
git add Backend/index.js
git commit -m "Add Vercel frontend URL to CORS"
git push
```

6. Render detectará el cambio y re-desplegará automáticamente

---

## Paso 9: Actualizar Variables de Entorno en Render

Actualiza las variables de entorno en Render con la URL del frontend:

1. Ve a Render → Tu servicio `vetgonow-backend` → "Environment"
2. Actualiza o agrega:
   ```
   FRONTEND_URL = https://vetgonow-frontend.vercel.app
   ```
3. Guarda los cambios
4. Render re-desplegará automáticamente

---

## Verificación Final

### Verificar Frontend

1. Visita tu URL de Vercel
2. Debería cargar la aplicación
3. Intenta hacer login o cualquier acción que llame al backend

### Verificar Conexión Backend

1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña "Network"
3. Intenta hacer una acción que llame al backend
4. Verifica que las peticiones vayan a `https://vetgonow-backend.onrender.com`

---

## Solución de Problemas

### Error: "Cannot connect to backend"

- Verifica que `VITE_API_BASE` esté configurada correctamente en Vercel
- Verifica que CORS esté configurado en el backend
- Verifica que el backend esté funcionando (visita `https://tu-backend.onrender.com/health`)

### Error: "Google Maps not loading"

- Verifica que `VITE_GOOGLE_MAPS_KEY` esté configurada en Vercel
- Verifica que la API key tenga habilitada "Maps JavaScript API" en Google Cloud
- Verifica que la API key no tenga restricciones de dominio que bloqueen Vercel

### El frontend no se actualiza después de cambios

- Vercel debería re-desplegar automáticamente cuando haces push a GitHub
- Si no, ve a Vercel → Tu proyecto → "Deployments" → "Redeploy"

### Error de CORS

- Verifica que hayas agregado la URL de Vercel a `allowedOrigins` en `Backend/index.js`
- Verifica que hayas hecho push de los cambios
- Verifica que Render haya re-desplegado

---

## Próximos Pasos

Después de desplegar el frontend:

1. ✅ Desplegar Admin Panel en Vercel (similar proceso)
2. ✅ Configurar dominio personalizado (opcional)
3. ✅ Configurar monitoreo y alertas
4. ✅ Optimizar performance

---

## Resumen de URLs

Después de completar el despliegue, deberías tener:

- **Backend**: `https://vetgonow-backend.onrender.com`
- **Frontend**: `https://vetgonow-frontend.vercel.app`
- **Admin**: `https://vetgonow-admin.vercel.app` (después de desplegar admin)

¡Listo! Tu frontend debería estar funcionando en Vercel. 🚀

