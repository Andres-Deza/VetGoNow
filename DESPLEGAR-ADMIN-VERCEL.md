# Desplegar Panel de Admin en Vercel

## Resumen

El panel de administración de VetGoNow está listo para desplegarse en Vercel. Se han actualizado todas las referencias hardcodeadas a `localhost:5555` para usar variables de entorno.

## Configuración Realizada

### 1. Archivo de Configuración de API

Se creó `admin/src/config/api.js` que centraliza la configuración de la URL del backend:

```javascript
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5555";
export default API_BASE;
```

### 2. Archivo vercel.json

Se creó `admin/vercel.json` con la configuración necesaria para Vercel:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://vetgonow-backend.onrender.com/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. Archivos Actualizados

Todos los archivos del admin han sido actualizados para usar `API_BASE`:

- `Login.jsx`
- `Register.jsx`
- `Dashboard.jsx`
- `Users.jsx`
- `Vets.jsx`
- `EditVet.jsx`
- `Appointments.jsx`
- `Revenue.jsx`
- `Pricing.jsx`
- `VetReliability.jsx`
- `CommissionManagement.jsx`

## Pasos para Desplegar en Vercel

### Opción 1: Desde el Dashboard de Vercel

1. **Ve a [vercel.com](https://vercel.com)** e inicia sesión

2. **Haz clic en "Add New Project"**

3. **Importa tu repositorio de GitHub**

   - Selecciona el repositorio `VetGoNow`
   - Vercel detectará automáticamente el proyecto

4. **Configura el proyecto:**

   - **Framework Preset**: Vite
   - **Root Directory**: `admin`
   - **Build Command**: `npm run build` (debería detectarse automáticamente)
   - **Output Directory**: `dist` (debería detectarse automáticamente)
   - **Install Command**: `npm install`

5. **Agrega Variables de Entorno:**

   - Ve a **Environment Variables**
   - Agrega:
     ```
     VITE_API_BASE=https://vetgonow-backend.onrender.com
     ```

6. **Haz clic en "Deploy"**

### Opción 2: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Navegar a la carpeta admin
cd admin

# Iniciar sesión en Vercel
vercel login

# Desplegar
vercel

# Seguir las instrucciones:
# - Set up and deploy? Y
# - Which scope? (tu cuenta)
# - Link to existing project? N
# - Project name? vetgonow-admin (o el nombre que prefieras)
# - Directory? ./
# - Override settings? N
```

### Opción 3: Con vercel.json (Recomendado)

Si ya tienes el repositorio conectado a Vercel:

1. **Ve a tu proyecto en Vercel**
2. **Settings → General**
3. **Root Directory**: Cambia a `admin`
4. **Environment Variables**: Agrega `VITE_API_BASE=https://vetgonow-backend.onrender.com`
5. **Redeploy** el proyecto

## Verificación Post-Deployment

1. **Verifica que la aplicación carga correctamente**

   - Deberías ver la página de login del admin

2. **Prueba el login**

   - Usa las credenciales del admin: `admin.demo@vetnow.com` / `AdminDemo123`

3. **Verifica que las llamadas a la API funcionan**
   - Abre las DevTools (F12)
   - Ve a la pestaña Network
   - Navega por el panel y verifica que las llamadas van a `https://vetgonow-backend.onrender.com`

## URLs de Producción

Después del deployment, tendrás:

- **Frontend**: `https://vetgonow-frontend.vercel.app`
- **Admin**: `https://vetgonow-admin.vercel.app` (o el nombre que hayas elegido)
- **Backend**: `https://vetgonow-backend.onrender.com`

## Notas Importantes

1. **CORS**: Asegúrate de que el backend en Render tenga configurado CORS para permitir el dominio del admin en Vercel. El backend ya debería tener configurado `https://vetgonow-admin.vercel.app` en `allowedOrigins`.

2. **Variables de Entorno**: Si cambias la URL del backend, actualiza `VITE_API_BASE` en Vercel.

3. **Imágenes y Assets**: Las imágenes que están en `Backend/uploads/` no estarán disponibles desde el admin en Vercel. Asegúrate de que las rutas de imágenes apunten correctamente al backend.

4. **Build**: Si el build falla, verifica:
   - Que todas las dependencias estén en `package.json`
   - Que no haya errores de sintaxis
   - Que el comando `npm run build` funcione localmente

## Troubleshooting

### Error: "Cannot find module"

- Verifica que todas las importaciones usen rutas relativas correctas
- Asegúrate de que `admin/src/config/api.js` existe

### Error: "API calls failing"

- Verifica que `VITE_API_BASE` esté configurado en Vercel
- Verifica que el backend esté funcionando en Render
- Revisa los logs del backend en Render para ver errores de CORS

### Error: "Build failed"

- Ejecuta `npm run build` localmente en la carpeta `admin` para ver el error exacto
- Verifica que todas las dependencias estén instaladas

## Siguiente Paso

Una vez desplegado, actualiza el backend en Render para incluir la URL del admin en `allowedOrigins` si aún no está:

```javascript
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  "https://vetgonow-frontend.vercel.app",
  "https://vetgonow-admin.vercel.app", // Agregar esta línea
];
```
