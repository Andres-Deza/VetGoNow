# Guía de Deployment - VetGoNow

## Opciones de Deployment

Este proyecto puede desplegarse en diferentes plataformas. Elige la que mejor se adapte a tus necesidades:

- **[Render + Vercel](#render--vercel-guía-paso-a-paso)** - Más fácil y rápido (Recomendado para empezar)
- [Google Cloud Platform](#google-cloud-platform-recomendado-para-costo-mínimo) - Más económico a largo plazo

---

## Google Cloud Platform (Recomendado para Costo Mínimo)

### Resumen Rápido

**Pasos principales:**

1. Instalar Google Cloud SDK y Firebase CLI
2. Crear proyecto en Google Cloud
3. Desplegar backend a Cloud Run: `gcloud run deploy`
4. Desplegar frontend a Firebase Hosting: `firebase deploy`
5. Configurar variables de entorno y CORS

**Tiempo estimado**: 30-45 minutos

### ¿Por qué Google Cloud?

- **Costo mínimo**: Cloud Run cobra solo cuando hay tráfico (puede ser $0 si no hay uso)
- **Firebase Hosting**: Plan gratuito generoso (10 GB almacenamiento, 360 MB/día transferencia)
- **Fácil de configurar**: Despliegue con comandos simples
- **Escalable**: Se adapta automáticamente al tráfico
- **Socket.io compatible**: Cloud Run soporta WebSockets

### Costos Estimados

- **Backend (Cloud Run)**: ~$0-5 USD/mes (depende del tráfico, mínimo 0 si no hay uso)
- **Frontend (Firebase Hosting)**: Gratis hasta 10 GB almacenamiento
- **Admin (Firebase Hosting)**: Gratis (mismo proyecto)
- **Total**: ~$0-5 USD/mes para proyectos pequeños/medianos

**Nota**: Google Cloud ofrece $300 USD de créditos gratuitos por 90 días para nuevos usuarios.

### Requisitos Previos

- Cuenta en [Google Cloud Platform](https://cloud.google.com) (con $300 USD de créditos gratuitos por 90 días)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) instalado
- MongoDB Atlas (o base de datos MongoDB)
- Proyecto de Google Cloud creado

### 1. Instalación y Configuración Inicial

```bash
# Instalar Google Cloud SDK (si no lo tienes)
# Windows: Descarga el instalador desde https://cloud.google.com/sdk/docs/install
# Mac/Linux: curl https://sdk.cloud.google.com | bash

# Iniciar sesión
gcloud auth login

# Crear proyecto (o usar uno existente)
gcloud projects create vetgonow --name="VetGoNow"

# Seleccionar proyecto
gcloud config set project vetgonow

# Habilitar APIs necesarias
gcloud services enable run.googleapis.com
gcloud services enable firebasehosting.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Backend - Cloud Run

#### Opción A: Despliegue Directo (Recomendado)

1. **Crear Dockerfile para el Backend** (si no existe):

Crea `Backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 8080

# Variable de entorno para el puerto (Cloud Run usa PORT automáticamente)
ENV PORT=8080

# Iniciar aplicación
CMD ["node", "index.js"]
```

2. **Desplegar a Cloud Run**:

```bash
# Desde la raíz del proyecto
cd Backend

# Desplegar (primera vez)
gcloud run deploy vetgonow-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,PORT=8080"

# Configurar variables de entorno (después del primer despliegue)
gcloud run services update vetgonow-backend \
  --region us-central1 \
  --set-env-vars "NODE_ENV=production,PORT=8080,mongoDBURL=tu_mongodb_connection_string,JWT_SECRET=tu_jwt_secret_seguro,MERCADOPAGO_ACCESS_TOKEN=tu_access_token,MERCADOPAGO_PUBLIC_KEY=tu_public_key,GEMINI_API_KEY=tu_gemini_api_key,GOOGLE_MAPS_API_KEY=tu_google_maps_api_key,WEBPAY_API_KEY=tu_webpay_api_key,WEBPAY_API_SECRET=tu_webpay_api_secret,WEBPAY_COMMERCE_CODE=tu_commerce_code,WEBPAY_ENVIRONMENT=PRODUCCION"
```

**Nota**: Para variables sensibles, usa Secret Manager:

```bash
# Crear secretos
echo -n "tu_jwt_secret_seguro" | gcloud secrets create jwt-secret --data-file=-
echo -n "tu_mongodb_connection_string" | gcloud secrets create mongodb-url --data-file=-

# Asignar permisos
gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Usar en Cloud Run
gcloud run services update vetgonow-backend \
  --region us-central1 \
  --update-secrets "JWT_SECRET=jwt-secret:latest,mongoDBURL=mongodb-url:latest"
```

3. **Obtener URL del Backend**:

```bash
gcloud run services describe vetgonow-backend --region us-central1 --format 'value(status.url)'
```

La URL será algo como: `https://vetgonow-backend-xxxxx-uc.a.run.app`

#### Opción B: Despliegue con Cloud Build (Más Automatizado)

1. **Crear `cloudbuild.yaml` en la raíz del proyecto**:

```yaml
steps:
  # Construir imagen Docker
  - name: "gcr.io/cloud-builders/docker"
    args: ["build", "-t", "gcr.io/$PROJECT_ID/vetgonow-backend", "./Backend"]

  # Subir imagen a Container Registry
  - name: "gcr.io/cloud-builders/docker"
    args: ["push", "gcr.io/$PROJECT_ID/vetgonow-backend"]

  # Desplegar a Cloud Run
  - name: "gcr.io/cloud-builders/gcloud"
    args:
      - "run"
      - "deploy"
      - "vetgonow-backend"
      - "--image"
      - "gcr.io/$PROJECT_ID/vetgonow-backend"
      - "--region"
      - "us-central1"
      - "--platform"
      - "managed"
      - "--allow-unauthenticated"
      - "--port"
      - "8080"
      - "--memory"
      - "512Mi"
      - "--min-instances"
      - "0"
      - "--max-instances"
      - "10"

images:
  - "gcr.io/$PROJECT_ID/vetgonow-backend"
```

2. **Desplegar**:

```bash
gcloud builds submit --config cloudbuild.yaml
```

### 3. Frontend - Firebase Hosting

1. **Instalar Firebase CLI**:

```bash
npm install -g firebase-tools
firebase login
```

2. **Inicializar Firebase en el proyecto**:

```bash
# Desde la raíz del proyecto
firebase init hosting

# Selecciona:
# - Usar proyecto existente: vetgonow
# - Public directory: frontend/dist
# - Single-page app: Yes
# - GitHub Actions: No (por ahora)
```

3. **Configurar `firebase.json`** (se crea automáticamente, pero verifica):

```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

4. **Construir y desplegar Frontend**:

```bash
cd frontend
npm install
npm run build
cd ..
firebase deploy --only hosting
```

5. **Configurar variables de entorno**:

Las variables de entorno de Vite deben estar en el build. Crea un archivo `.env.production` en `frontend/`:

```env
VITE_API_URL=https://vetgonow-backend-xxxxx-uc.a.run.app
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
```

Luego reconstruye y despliega:

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### 4. Admin Panel - Firebase Hosting (Sitio Adicional)

Firebase Hosting permite múltiples sitios. Para el admin:

1. **Actualizar `firebase.json`**:

```json
{
  "hosting": [
    {
      "target": "frontend",
      "public": "frontend/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "admin",
      "public": "admin/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

2. **Configurar targets**:

```bash
firebase target:apply hosting frontend vetgonow-frontend
firebase target:apply hosting admin vetgonow-admin
```

3. **Construir y desplegar**:

```bash
# Frontend
cd frontend
npm run build
cd ..

# Admin
cd admin
npm run build
cd ..

# Desplegar ambos
firebase deploy
```

### 5. Configurar CORS en el Backend

Actualiza `Backend/index.js` para incluir las URLs de Firebase:

```javascript
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  "http://localhost:5174",
  "https://vetgonow-frontend.web.app",
  "https://vetgonow-frontend.firebaseapp.com",
  "https://vetgonow-admin.web.app",
  "https://vetgonow-admin.firebaseapp.com",
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);
```

### 6. Actualizar URLs de Webhooks

Actualiza las URLs de webhooks de Mercado Pago y otros servicios con la URL de Cloud Run:
`https://vetgonow-backend-xxxxx-uc.a.run.app`

### 7. Almacenamiento de Archivos (Opcional pero Recomendado)

Para producción, usa Cloud Storage en lugar de `Backend/uploads/`:

1. **Crear bucket**:

```bash
gsutil mb -p vetgonow -c STANDARD -l us-central1 gs://vetgonow-uploads
```

2. **Configurar permisos**:

```bash
gsutil iam ch allUsers:objectViewer gs://vetgonow-uploads
```

3. **Instalar dependencias en Backend**:

```bash
cd Backend
npm install @google-cloud/storage
```

4. **Actualizar código de uploads** para usar Cloud Storage (ver documentación de `@google-cloud/storage`)

### 8. Monitoreo y Logs

```bash
# Ver logs del backend
gcloud run services logs read vetgonow-backend --region us-central1

# Ver logs en tiempo real
gcloud run services logs tail vetgonow-backend --region us-central1
```

### 9. Actualizaciones Automáticas con GitHub Actions (Opcional)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Google Cloud

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: vetgonow
      - name: Deploy to Cloud Run
        run: |
          cd Backend
          gcloud run deploy vetgonow-backend \
            --source . \
            --region us-central1 \
            --platform managed

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install Firebase CLI
        run: npm install -g firebase-tools
      - name: Build Frontend
        run: |
          cd frontend
          npm install
          npm run build
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: "${{ secrets.GITHUB_TOKEN }}"
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          channelId: live
          projectId: vetgonow
```

### Ventajas de esta Configuración

- **Costo mínimo**: Solo pagas por uso real
- **Escalable**: Se adapta automáticamente al tráfico
- **Fácil de mantener**: Despliegues simples con comandos
- **CDN incluido**: Firebase Hosting incluye CDN global
- **SSL automático**: Certificados SSL gestionados automáticamente
- **WebSockets**: Cloud Run soporta Socket.io

---

## Render + Vercel (Guía Paso a Paso)

### Resumen Rápido

**Pasos principales:**

1. Subir código a GitHub (si no está)
2. Crear cuenta en Render y desplegar backend
3. Crear cuenta en Vercel y desplegar frontend
4. Configurar variables de entorno
5. Configurar CORS y URLs

**Tiempo estimado**: 20-30 minutos

**Costos:**

- Render (Free tier): Gratis (con limitaciones)
- Vercel (Free tier): Gratis (generoso)
- MongoDB Atlas (Free tier): Gratis (512 MB)
- **Total**: $0 USD/mes para empezar

### Requisitos Previos

- Cuenta en [GitHub](https://github.com) (gratis)
- Cuenta en [Render](https://render.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis)
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratis)
- Tu proyecto debe estar en un repositorio de GitHub

---

## Paso 1: Preparar el Repositorio en GitHub

Si tu proyecto no está en GitHub:

1. Crea un repositorio en GitHub (público o privado)
2. Sube tu código:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/VetGoNow.git
   git push -u origin main
   ```

**Nota**: Asegúrate de tener un archivo `.gitignore` que excluya `node_modules`, `.env`, etc.

---

## Paso 2: Configurar MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) y crea una cuenta
2. Crea un nuevo cluster (elige el plan **FREE M0**)
3. Crea un usuario de base de datos:
   - Ve a "Database Access" → "Add New Database User"
   - Username y Password (guárdalos)
4. Configura Network Access:
   - Ve a "Network Access" → "Add IP Address"
   - Agrega `0.0.0.0/0` (permite desde cualquier IP) o la IP específica de Render
5. Obtén la connection string:
   - Ve a "Database" → "Connect" → "Connect your application"
   - Copia la URL (algo como: `mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   - Reemplaza `<password>` con tu contraseña real
   - Agrega el nombre de la base de datos al final: `...mongodb.net/VetGoNow?retryWrites=true&w=majority`

**Guarda esta URL**, la necesitarás en el siguiente paso.

---

## Paso 3: Desplegar Backend en Render

### 3.1. Crear Servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Haz clic en "New +" → "Web Service"
3. Conecta tu repositorio de GitHub:
   - Si es la primera vez, autoriza Render para acceder a GitHub
   - Selecciona el repositorio `VetGoNow`
4. Configura el servicio:

   - **Name**: `vetgonow-backend`
   - **Region**: Elige la más cercana (ej: `Oregon (US West)`)
   - **Branch**: `main` (o la rama que uses)
   - **Root Directory**: `Backend` (importante)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (puedes cambiar después)

5. Haz clic en "Create Web Service"

### 3.2. Configurar Variables de Entorno en Render

Mientras se despliega, configura las variables de entorno:

1. En el dashboard de Render, ve a tu servicio `vetgonow-backend`
2. Ve a la pestaña "Environment"
3. Agrega las siguientes variables (haz clic en "Add Environment Variable" para cada una):

```
NODE_ENV = production
PORT = 10000
mongoDBURL = mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/VetGoNow?retryWrites=true&w=majority
JWT_SECRET = tu_jwt_secret_muy_seguro_y_largo
MERCADOPAGO_ACCESS_TOKEN = tu_access_token_de_mercadopago
MERCADOPAGO_PUBLIC_KEY = tu_public_key_de_mercadopago
GEMINI_API_KEY = tu_gemini_api_key
GOOGLE_MAPS_API_KEY = tu_google_maps_api_key
WEBPAY_API_KEY = tu_webpay_api_key
WEBPAY_API_SECRET = tu_webpay_api_secret
WEBPAY_COMMERCE_CODE = tu_commerce_code
WEBPAY_ENVIRONMENT = PRODUCCION
BASE_URL = https://vetgonow-backend.onrender.com
FRONTEND_URL = https://tu-frontend.vercel.app
ADMIN_URL = https://tu-admin.vercel.app
```

**Importante**:

- Reemplaza todos los valores `tu_*` con tus valores reales
- Para `FRONTEND_URL` y `ADMIN_URL`, usa las URLs que obtendrás después de desplegar en Vercel (puedes actualizarlas luego)
- Para `JWT_SECRET`, genera uno seguro: puedes usar `openssl rand -base64 32` o cualquier generador de strings aleatorios

### 3.3. Configurar Health Check (Opcional pero Recomendado)

1. En Render, ve a "Settings" de tu servicio
2. En "Health Check Path", escribe: `/health`
3. Guarda los cambios

### 3.4. Obtener URL del Backend

Una vez desplegado, Render te dará una URL como:
`https://vetgonow-backend.onrender.com`

**Guarda esta URL**, la necesitarás para el frontend.

---

## Paso 4: Desplegar Frontend en Vercel

### 4.1. Crear Proyecto en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en "Add New..." → "Project"
3. Importa tu repositorio de GitHub:
   - Si es la primera vez, autoriza Vercel para acceder a GitHub
   - Selecciona el repositorio `VetGoNow`
4. Configura el proyecto:

   - **Framework Preset**: `Vite` (debería detectarlo automáticamente)
   - **Root Directory**: `frontend` (cámbialo si está en raíz)
   - **Build Command**: `npm run build` (debería estar automático)
   - **Output Directory**: `dist` (debería estar automático)
   - **Install Command**: `npm install` (debería estar automático)

5. Haz clic en "Deploy"

### 4.2. Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a "Settings" → "Environment Variables"
3. Agrega las siguientes variables:

```
VITE_API_URL = https://vetgonow-backend.onrender.com
VITE_GOOGLE_MAPS_API_KEY = tu_google_maps_api_key
```

**Importante**:

- Reemplaza `https://vetgonow-backend.onrender.com` con la URL real de tu backend en Render
- Reemplaza `tu_google_maps_api_key` con tu API key de Google Maps

4. Haz clic en "Save"
5. **Re-despliega** el proyecto para que las variables surtan efecto:
   - Ve a "Deployments"
   - Haz clic en los tres puntos del último deployment
   - Selecciona "Redeploy"

### 4.3. Actualizar vercel.json

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

**Actualiza** `https://vetgonow-backend.onrender.com` con tu URL real de Render.

### 4.4. Obtener URL del Frontend

Vercel te dará una URL como:
`https://vetgonow-frontend.vercel.app`

**Guarda esta URL**.

---

## Paso 5: Desplegar Admin Panel en Vercel (Opcional)

Si quieres desplegar el panel de administración:

1. En Vercel, crea un **nuevo proyecto**
2. Selecciona el mismo repositorio `VetGoNow`
3. Configuración:
   - **Root Directory**: `admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Framework Preset**: `Vite`
4. Variables de entorno:
   ```
   VITE_API_URL = https://vetgonow-backend.onrender.com
   ```
5. Despliega

Obtendrás una URL como: `https://vetgonow-admin.vercel.app`

---

## Paso 6: Configurar CORS en el Backend

Necesitas actualizar el archivo `Backend/index.js` para permitir las URLs de producción:

1. Abre `Backend/index.js`
2. Busca el array `allowedOrigins` (alrededor de la línea 33)
3. Agrega las URLs de producción:

```javascript
const allowedOrigins = [
  "http://localhost:5173", // main client (dev)
  "http://localhost:5175", // admin client (dev)
  "http://localhost:5174", // frontend client (dev)
  "http://localhost:5555", // maybe if using another port/server
  "https://vetgonow-frontend.vercel.app", // Frontend producción
  "https://vetgonow-admin.vercel.app", // Admin producción
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);
```

4. Haz commit y push a GitHub:

   ```bash
   git add Backend/index.js
   git commit -m "Add production URLs to CORS"
   git push
   ```

5. Render detectará el cambio y re-desplegará automáticamente

---

## Paso 7: Actualizar Variables de Entorno con URLs Finales

Ahora que tienes todas las URLs, actualiza las variables de entorno en Render:

1. Ve a Render → Tu servicio `vetgonow-backend` → "Environment"
2. Actualiza:
   ```
   FRONTEND_URL = https://vetgonow-frontend.vercel.app
   ADMIN_URL = https://vetgonow-admin.vercel.app
   BASE_URL = https://vetgonow-backend.onrender.com
   ```
3. Guarda los cambios
4. Render re-desplegará automáticamente

---

## Paso 8: Actualizar Webhooks (Si usas Mercado Pago)

Si usas Mercado Pago, actualiza las URLs de webhooks:

1. Ve a tu dashboard de Mercado Pago
2. Configura los webhooks para apuntar a:
   `https://vetgonow-backend.onrender.com/api/mercadopago/webhook`

---

## Verificación Final

### Verificar Backend

1. Visita: `https://vetgonow-backend.onrender.com/health`
2. Deberías ver: `OK`

### Verificar Frontend

1. Visita tu URL de Vercel
2. Debería cargar la aplicación
3. Intenta hacer login o cualquier acción que llame al backend

### Verificar Admin

1. Visita tu URL de admin en Vercel
2. Debería cargar el panel de administración

---

## Solución de Problemas Comunes

### Backend no inicia en Render

- Verifica que `Root Directory` esté configurado como `Backend`
- Verifica que todas las variables de entorno estén correctas
- Revisa los logs en Render para ver errores específicos

### Frontend no se conecta al Backend

- Verifica que `VITE_API_URL` en Vercel sea la URL correcta de Render
- Verifica que CORS esté configurado correctamente en `Backend/index.js`
- Re-despliega el frontend después de cambiar variables de entorno

### Error de CORS

- Asegúrate de haber agregado las URLs de producción a `allowedOrigins` en `Backend/index.js`
- Verifica que hayas hecho push de los cambios y Render haya re-desplegado

### MongoDB Connection Error

- Verifica que la URL de MongoDB Atlas sea correcta
- Verifica que hayas agregado `0.0.0.0/0` en Network Access de MongoDB Atlas
- Verifica que el usuario y contraseña sean correctos

---

## Notas Importantes

- **Render Free Tier**: El servicio se "duerme" después de 15 minutos de inactividad. La primera petición puede tardar ~30 segundos en despertar.
- **Vercel Free Tier**: Muy generoso, sin limitaciones importantes para proyectos pequeños/medianos.
- **MongoDB Atlas Free Tier**: 512 MB de almacenamiento, suficiente para desarrollo y proyectos pequeños.
- **Archivos estáticos**: Los uploads se guardan en `Backend/uploads/` en Render. Para producción, considera usar Cloudinary, AWS S3, o Google Cloud Storage.
- **Actualizaciones**: Cada vez que hagas push a GitHub, Render y Vercel desplegarán automáticamente (si está configurado).

---

## Próximos Pasos (Opcional)

- Configurar dominio personalizado en Vercel
- Migrar a Render Paid Plan para evitar el "sleep" del free tier
- Configurar almacenamiento en la nube para archivos (Cloudinary, S3, etc.)
- Configurar monitoreo y alertas
- Configurar CI/CD más avanzado
