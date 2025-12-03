# VetGoNow

Plataforma web de servicios veterinarios on-demand que conecta tutores de mascotas con veterinarios independientes y clínicas veterinarias. El sistema permite agendar tres tipos de servicios: consultas presenciales en clínica, teleconsultas por videollamada y servicios a domicilio para urgencias. 

Mediante un sistema de geolocalización integrado con Google Maps, la aplicación muestra en tiempo real los veterinarios y clínicas más cercanos a la ubicación del usuario, facilitando la búsqueda y selección del profesional adecuado. El sistema incluye asignación automática de veterinarios para urgencias, seguimiento en tiempo real durante servicios a domicilio, chat directo, videollamadas integradas y un sistema completo de pagos en línea.

## Arquitectura

VetGoNow está compuesto por tres aplicaciones independientes que trabajan en conjunto:

**Backend (API Central)**
- Node.js con Express.js
- MongoDB con Mongoose
- Socket.io para comunicación en tiempo real
- Autenticación JWT
- Integración con múltiples pasarelas de pago

**Frontend (Aplicación Principal)**
- React.js con Vite
- TailwindCSS para estilos
- Google Maps API para geolocalización
- Jitsi Meet para videollamadas
- Socket.io Client para comunicación en tiempo real

**Admin (Panel Administrativo)**
- React.js con Vite
- Chart.js para visualización de datos
- Gestión de usuarios, veterinarios y métricas

## Funcionalidades Principales

### Para Tutores

Registro y gestión de mascotas con historial médico completo. Solicitud de servicios veterinarios en tres modalidades: urgencias a domicilio, consultas presenciales en clínica y telemedicina por videollamada. Asignación automática del veterinario más cercano mediante geolocalización. Seguimiento en tiempo real del veterinario durante servicios a domicilio. Chat directo y videollamada integrada con el veterinario asignado. Sistema de pagos en línea con múltiples opciones: MercadoPago, WebPay (Transbank) y Stripe. Visualización del historial médico completo con fichas clínicas, recetas y comprobantes de pago. Asistente de cuidado preventivo con recordatorios de vacunas y desparasitaciones.

### Para Veterinarios

Configuración de disponibilidad y horarios de atención. Recepción de solicitudes con información completa del tutor y mascota. Aceptación o rechazo de solicitudes con sistema de notificaciones. Seguimiento en tiempo real con mapa interactivo y navegación GPS. Emisión de fichas clínicas digitales, diagnósticos y recetas electrónicas. Acceso al historial completo de atenciones previas de cada mascota. Videoconsulta integrada mediante Jitsi Meet. Gestión de ingresos y comisiones. Panel de emergencias para atender solicitudes urgentes.

### Para Administradores

Validación y aprobación de veterinarios con verificación de documentos. Gestión completa de usuarios, veterinarios y citas. Monitoreo de servicios activos en tiempo real. Configuración de tarifas, comisiones y políticas de la plataforma. Panel de métricas con indicadores de desempeño (KPI). Auditoría de transacciones y pagos. Exportación de reportes y datos.

## Tecnologías Utilizadas

**Backend**
- Node.js 18+
- Express.js 4.x
- MongoDB con Mongoose
- Socket.io 4.x
- JWT para autenticación
- MercadoPago SDK
- Transbank SDK (WebPay)
- Stripe SDK
- Google Generative AI (Gemini) para análisis de imágenes

**Frontend**
- React 18
- Vite 6
- React Router 7
- TailwindCSS 3
- Google Maps API
- Jitsi React SDK
- Axios para peticiones HTTP
- Socket.io Client

**Admin**
- React 18
- Vite 6
- Chart.js 4
- Material-UI 7

## Instalación y Configuración

### Requisitos Previos

- Node.js 18 o superior
- MongoDB (local o MongoDB Atlas)
- Cuentas de servicios externos:
  - Google Maps API
  - MercadoPago (opcional)
  - Transbank WebPay (opcional)
  - Stripe (opcional)
  - Google Gemini API (opcional, para análisis de imágenes)

### Instalación Local

Clonar el repositorio:

```bash
git clone https://github.com/Andres-Deza/VetGoNow.git
cd VetGoNow
```

**Backend**

```bash
cd Backend
npm install
```

Crear archivo `.env` en la carpeta `Backend`:

```env
MONGO_URI=mongodb://localhost:27017/vetgonow
JWT_SECRET=tu_jwt_secret_muy_seguro
PORT=5555
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5175
NODE_ENV=development

# Google Maps
GOOGLE_MAPS_API_KEY=tu_api_key

# MercadoPago (opcional)
MERCADOPAGO_ACCESS_TOKEN=tu_access_token

# WebPay Transbank (opcional)
WEBPAY_COMMERCE_CODE=tu_commerce_code
WEBPAY_API_KEY=tu_api_key

# Stripe (opcional)
STRIPE_SECRET_KEY=tu_secret_key
STRIPE_PUBLIC_KEY=tu_public_key

# Google Gemini (opcional)
GEMINI_API_KEY=tu_api_key

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email
EMAIL_PASS=tu_password
```

Iniciar el servidor:

```bash
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
```

Crear archivo `.env` en la carpeta `frontend`:

```env
VITE_API_BASE=http://localhost:5555
VITE_SOCKET_URL=http://localhost:5555
VITE_GOOGLE_MAPS_API_KEY=tu_api_key
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

**Admin**

```bash
cd admin
npm install
```

Crear archivo `.env` en la carpeta `admin`:

```env
VITE_API_BASE=http://localhost:5555
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

## Estructura del Proyecto

```
VetGoNow/
├── Backend/                 # API central
│   ├── controllers/         # Lógica de negocio
│   ├── models/              # Esquemas de MongoDB
│   ├── routes/              # Endpoints REST
│   ├── middleware/          # Autenticación y validación
│   ├── services/            # Servicios externos
│   ├── socket/              # Configuración Socket.io
│   ├── utils/               # Utilidades
│   ├── scripts/             # Scripts de utilidad
│   └── index.js             # Punto de entrada
│
├── frontend/                # Aplicación principal
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas y rutas
│   │   ├── layouts/         # Layouts de aplicación
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilidades
│   │   └── config/          # Configuración
│   └── public/              # Archivos estáticos
│
└── admin/                   # Panel administrativo
    ├── src/
    │   ├── components/      # Componentes
    │   ├── pages/           # Páginas
    │   └── config/          # Configuración
    └── public/              # Archivos estáticos
```

## Despliegue

El proyecto está configurado para desplegarse en:

- **Backend**: Render.com
- **Frontend**: Vercel
- **Admin**: Vercel

Para instrucciones detalladas de despliegue, consulta los archivos de documentación en la raíz del proyecto:
- `DEPLOYMENT-RAPIDO.md` - Guía rápida de despliegue
- `DESPLEGAR-FRONTEND-VERCEL.md` - Despliegue del frontend
- `DESPLEGAR-ADMIN-VERCEL.md` - Despliegue del admin

## Variables de Entorno de Producción

Asegúrate de configurar todas las variables de entorno necesarias en las plataformas de despliegue. Las variables críticas incluyen:

- `MONGO_URI` - Cadena de conexión a MongoDB
- `JWT_SECRET` - Secreto para tokens JWT
- `FRONTEND_URL` - URL del frontend en producción
- `ADMIN_URL` - URL del admin en producción
- `GOOGLE_MAPS_API_KEY` - API key de Google Maps
- Credenciales de pasarelas de pago según las que uses

## Licencia

© 2025 VetGoNow. Proyecto académico desarrollado en el marco de la asignatura Proyecto de Título TIHI84 – INACAP. Uso autorizado únicamente con fines académicos y demostrativos.
