# Guía Rápida de Deployment - Render + Vercel

## Checklist Pre-Despliegue

- [ ] Proyecto en GitHub
- [ ] Cuenta en Render
- [ ] Cuenta en Vercel
- [ ] Cuenta en MongoDB Atlas
- [ ] MongoDB Atlas configurado con cluster y usuario
- [ ] Connection string de MongoDB lista
- [ ] Todas las API keys listas (Google Maps, Gemini, Mercado Pago, etc.)

## Pasos Rápidos

### 1. MongoDB Atlas (5 min)

- Crear cluster FREE
- Crear usuario
- Network Access: `0.0.0.0/0`
- Copiar connection string

### 2. Render - Backend (10 min)

- New Web Service → Conectar GitHub
- Root Directory: `Backend`
- Build: `npm install`
- Start: `npm start`
- Agregar variables de entorno
- Guardar URL del backend

### 3. Vercel - Frontend (5 min)

- New Project → Conectar GitHub
- Root Directory: `frontend`
- Framework: Vite (auto-detectado)
- Agregar variables: `VITE_API_URL` y `VITE_GOOGLE_MAPS_API_KEY`
- Guardar URL del frontend

### 4. Vercel - Admin (5 min) - Opcional

- New Project → Mismo repo
- Root Directory: `admin`
- Variable: `VITE_API_URL`

### 5. Actualizar CORS (2 min)

- Editar `Backend/index.js`
- Agregar URLs de Vercel a `allowedOrigins`
- Push a GitHub

### 6. Actualizar Variables (2 min)

- Render: Actualizar `FRONTEND_URL` y `ADMIN_URL`
- Listo!

## Variables de Entorno Necesarias

### Render (Backend)

```
NODE_ENV=production
PORT=10000
mongoDBURL=tu_mongodb_connection_string
JWT_SECRET=tu_jwt_secret_seguro
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_PUBLIC_KEY=...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
WEBPAY_API_KEY=...
WEBPAY_API_SECRET=...
WEBPAY_COMMERCE_CODE=...
WEBPAY_ENVIRONMENT=PRODUCCION
BASE_URL=https://vetgonow-backend.onrender.com
FRONTEND_URL=https://tu-frontend.vercel.app
ADMIN_URL=https://tu-admin.vercel.app
```

### Vercel (Frontend)

```
VITE_API_URL=https://vetgonow-backend.onrender.com
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
```

### Vercel (Admin)

```
VITE_API_URL=https://vetgonow-backend.onrender.com
```

## URLs Importantes

- Backend Health: `https://vetgonow-backend.onrender.com/health`
- Frontend: `https://tu-frontend.vercel.app`
- Admin: `https://tu-admin.vercel.app`

## Comandos Útiles

```bash
# Generar JWT_SECRET seguro
openssl rand -base64 32

# Ver logs de Render
# (Desde el dashboard de Render)

# Ver logs de Vercel
# (Desde el dashboard de Vercel)
```

## Solución Rápida de Problemas

**Backend no inicia**: Verifica Root Directory = `Backend`
**CORS Error**: Agrega URLs a `allowedOrigins` en `Backend/index.js`
**MongoDB Error**: Verifica Network Access en MongoDB Atlas
**Frontend 404**: Re-despliega después de agregar variables de entorno
