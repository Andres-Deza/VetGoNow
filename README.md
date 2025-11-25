# 🐾 VetGoNow – Plataforma de Urgencias Veterinarias On-Demand

**VetGoNow** es una **plataforma web distribuida y escalable** que conecta a tutores de mascotas con veterinarios disponibles en tiempo real, permitiendo solicitar **urgencias, consultas tradicionales o telemedicina**.  
El sistema implementa un modelo **tipo Uber**, con **asignación automática por geolocalización**, **pagos en línea**, **chat y videollamada**, y **gestión clínica digital**.

VetGoNow está conformado por **tres aplicaciones independientes**:

1. **Frontend:** interfaz principal para tutores y veterinarios desarrollada en **React.js**.
2. **Backend:** API central con **Node.js y Express.js**.
3. **Admin:** panel administrativo y de métricas (superusuario).

---

## 🧩 Arquitectura general

### 🔹 Aplicaciones principales

| Aplicación                         | Descripción                                                                                        | Tecnologías principales                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Backend (API central)**          | Gestiona autenticación, base de datos, geolocalización, pagos, chat y comunicación en tiempo real. | Node.js + Express.js + Firebase + Firestore       |
| **Frontend (Tutor / Veterinario)** | Interfaz web SPA en React.js. Permite solicitar, aceptar y seguir atenciones en tiempo real.       | React.js + TailwindCSS + Google Maps API + WebRTC |
| **Admin (Superusuario)**           | Panel de control para administración, métricas, reportes y gestión de usuarios.                    | React.js + Vite + Chart.js + Firebase Admin SDK   |

---

## 🚀 Funcionalidades principales

### 🔐 Autenticación y seguridad

- Registro e inicio de sesión con **JWT** o **Firebase Authentication**.
- Roles y permisos: **Tutor**, **Veterinario**, **Administrador**.
- Validación profesional de veterinarios antes de la activación.
- Encriptación de contraseñas y sesiones seguras.
- Recuperación de credenciales por correo electrónico o SMS.

---

### 🩺 Módulo Veterinario

- Configuración de disponibilidad y atención activa.
- Recepción de solicitudes con información del tutor y mascota.
- Aceptación o rechazo de solicitudes.
- Seguimiento en tiempo real con mapa y navegación.
- Emisión de **fichas clínicas**, diagnósticos y recetas electrónicas.
- Acceso al historial de atenciones previas.
- Videoconsulta integrada mediante **WebRTC**.

---

### 🐶 Módulo Tutor (Cliente)

- Registro de mascotas y edición de datos.
- Solicitud de servicios veterinarios (urgencia, tradicional o telemedicina).
- Asignación automática del veterinario más cercano mediante **Google Maps API**.
- Seguimiento del profesional en tiempo real.
- Chat directo y videollamada con el veterinario asignado.
- Pagos en línea mediante **WebPay** o **Stripe**.
- Visualización del historial médico y comprobantes de pago.

---

### 👨‍💼 Módulo Administrador

- Validación y aprobación de veterinarios.
- Gestión de usuarios, fichas clínicas y registros de pagos.
- Monitoreo de servicios activos y métricas de desempeño.
- Configuración de tarifas, zonas, promociones y políticas.
- Auditoría de logs, incidentes y cumplimiento de SLA.
- Panel de control visual con gráficos dinámicos (KPI).

---

## ⚙️ Arquitectura técnica

```
                          ┌────────────────────┐
                          │     ADMIN APP      │
                          │      React
                          └────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │      BACKEND API     │
                        │ Node.js + Express    │
                        │ Auth, Firestore, API │
                        └────────┬─────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │           FRONTEND APP           │
                  │ React.js + Tailwind + Maps + RTC │
                  │ Roles: Tutor / Veterinario       │
                  └─────────────────────────────────┘
```

---

## 🧠 Indicadores KPI / SLA

| Indicador | Descripción                                                | Meta            |
| --------- | ---------------------------------------------------------- | --------------- |
| **KPI1**  | Tiempo promedio de asignación de veterinario               | < 90 segundos   |
| **KPI2**  | Porcentaje de urgencias atendidas dentro del tiempo máximo | ≥ 95%           |
| **KPI3**  | Nivel de satisfacción del tutor                            | ≥ 4.5 / 5       |
| **SLA1**  | Disponibilidad total de la plataforma                      | ≥ 99.5% mensual |
| **SLA2**  | Tiempo máximo de recuperación ante fallo                   | ≤ 10 minutos    |

---

## 🧱 Estructura de carpetas general

```plaintext
VetGoNow/
├── backend/                     # API central (Node/Express)
│   ├── src/
│   │   ├── controllers/         # Lógica de negocio
│   │   ├── models/              # Esquemas de datos (Mongoose/Firebase)
│   │   ├── routes/              # Endpoints REST
│   │   ├── middlewares/         # Autenticación / Validación
│   │   └── utils/               # Funciones auxiliares
│   ├── tests/                   # Pruebas unitarias e integración
│   ├── package.json
│   └── server.js
│
├── frontend/                    # Aplicación Tutor/Veterinario
│   ├── src/
│   │   ├── components/          # Componentes UI reutilizables
│   │   ├── pages/               # Rutas y vistas principales
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # Conexiones Firebase / Maps / Stripe
│   │   ├── utils/               # Validaciones y helpers
│   │   └── styles/              # Estilos globales
│   ├── public/                  # Logos e íconos
│   ├── package.json
│   └── vite.config.js
│
├── admin/                       # Panel administrativo
│   ├── src/
│   │   ├── components/          # Tablas, gráficos, dashboards
│   │   ├── pages/               # Rutas de administración
│   │   ├── hooks/               # Gestión de datos
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## ⚙️ Instalación y ejecución

```bash
# Clonar el proyecto
git clone https://github.com/<tu_usuario>/VetGoNow.git
cd VetGoNow
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Admin

```bash
cd admin
npm install
npm run dev
```

---

## 🌐 Variables de entorno (ejemplo)

```env
# Firebase
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...

# Google Maps
REACT_APP_GOOGLE_MAPS_API_KEY=...

# Pagos
STRIPE_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...

# JWT
JWT_SECRET=...

# URL Backend
REACT_APP_API_BASE_URL=https://api.vetgonow.cl
```

---

## 📈 Roadmap / Mejoras futuras

- IA para clasificación de urgencias y priorización automática.
- Recordatorios automáticos por SMS/email.
- Dashboard avanzado de analítica y rendimiento.
- Integración con clínicas asociadas y laboratorios.
- Aplicación móvil nativa (Flutter / React Native).
- Sistema de reputación mejorado con verificación cruzada.

---

## 👥 Equipo de desarrollo

| Rol                         | Integrante                 |
| --------------------------- | -------------------------- |
| **Jefe de Proyecto**        | Jorge Enrique Ortiz Adasme |
| **Desarrollador Backend**   | Andrés Deza                |
| **Desarrolladora Frontend** | Romina Guerra              |

---

## 🧾 Licencia

© 2025 VetGoNow.  
Proyecto académico desarrollado en el marco de la asignatura **Proyecto de Título TIHI84 – INACAP**.  
Uso autorizado únicamente con fines académicos y demostrativos.

---

## 📚 Referencias

- IEEE 830-1998 – _Software Requirements Specification_
- Guía ABPro Unidad 2 – _Proyecto de Título TIHI84 – INACAP_
- Ley N° 19.628 sobre Protección de la Vida Privada (Chile)
- Documentación oficial de Firebase, React.js, Google Maps API, Stripe y WebRTC
- Modelos de arquitectura escalable para sistemas on-demand (Uber, Glovo, Rappi)
