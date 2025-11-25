import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRouter from './routes/userRoutes.js';
import vetRouter from './routes/vetRoutes.js';
import authRouter from './routes/authRoutes.js';
import appointmentRouter from './routes/appointmentRoutes.js';
import petRouter from './routes/petRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import { PORT, mongoDBURL } from './config.js';
import setupSocket from './socket/VideoCallSocket.js';
import setupEmergencySocket from './socket/EmergencySocket.js';
import setupConversationSocket from './socket/ConversationSocket.js';
// import webpayRouter from './routes/webpayRoutes.js'; // Deshabilitado - Solo Mercado Pago
import emailRouter from './routes/emailRoutes.js';
import emergencyRouter from './routes/emergencyRoutes.js';
import conversationRouter from './routes/conversationRoutes.js';
import mercadopagoRouter from './routes/mercadopagoRoutes.js';
import mercadopagoWebhookRouter from './routes/mercadopagoWebhookRoutes.js';
import ratingRouter from './routes/ratingRoutes.js';
import kycRouter from './routes/kycRoutes.js';
import pricingRouter from './routes/pricingRoutes.js';
import preventiveCareRouter from './routes/preventiveCareRoutes.js';
import addressRouter from './routes/addressRoutes.js';
import imageAnalysisRouter from './routes/imageAnalysisRoutes.js';
import vetEarningsRouter from './routes/vetEarningsRoutes.js';
import commissionRouter from './routes/commissionRoutes.js';
import vaccineRouter from './routes/vaccineRoutes.js';
import dewormingRouter from './routes/dewormingRoutes.js';

const app = express();
const httpServer = createServer(app);
// Add all allowed frontends here
const allowedOrigins = [
  'http://localhost:5173', // main client (dev)
  'http://localhost:5175', // admin client (dev)
  'http://localhost:5174', // frontend client (dev)
  'http://localhost:5555', // maybe if using another port/server
  
  // URLs de producción en Vercel
  'https://vetgonow-frontend.vercel.app', // Frontend production
  'https://vet-go-now-admin.vercel.app', // Admin production
  'https://vetgonow-admin.vercel.app', // Admin production (alternativa)
  
  // URLs desde variables de entorno
  process.env.FRONTEND_URL, // Frontend production URL
  process.env.ADMIN_URL, // Admin production URL
].filter(Boolean); // Remove undefined values
// Socket.io config
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Setup socket logic
setupSocket(io);
const emergencyOfferManager = setupEmergencySocket(io);
setupConversationSocket(io);
console.log('Socket.IO initialized (VideoCall + Emergency + Chat)');

// Middleware
// Body parser - IMPORTANTE: Debe estar antes de las rutas
// Configurar para aceptar JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware para logging de webhooks (solo para debugging)
app.use('/api/payment/mercadopago/webhook', (req, res, next) => {
  if (req.method === 'POST') {
    console.log('Webhook POST recibido en:', req.originalUrl);
    console.log('Content-Type:', req.headers['content-type']);
  }
  next();
});
// Express CORS middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Configurar helmet para permitir imágenes y recursos estáticos
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5555", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// Routes
// Make io accessible in routes
app.set('io', io);
app.set('emergencyOfferManager', emergencyOfferManager);

app.use('/api/users', userRouter);
app.use('/api/vets', vetRouter);
app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/pets', petRouter);
app.use('/api/admin', adminRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/addresses', addressRouter);
// Servir archivos estáticos con headers CORS apropiados
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static('uploads', {
  setHeaders: (res, path) => {
    // Detectar el tipo MIME correcto según la extensión
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
    // Headers para permitir acceso cross-origin
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));
// Rutas de pago - Solo Mercado Pago
// IMPORTANTE: El webhook router debe ir ANTES del router principal
// para evitar que el middleware de autenticación intercepte las peticiones
app.use('/api/payment/mercadopago', mercadopagoWebhookRouter);
app.use('/api/payment/mercadopago', mercadopagoRouter);
// Webpay y Stripe deshabilitados - Solo Mercado Pago
app.use('/api/send-token',emailRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/ratings', ratingRouter);
app.use('/api/preventive-care', preventiveCareRouter);
app.use('/api/image-analysis', imageAnalysisRouter);
app.use('/api/vaccines', vaccineRouter);
app.use('/api/dewormings', dewormingRouter);
app.use('/api/vet', vetEarningsRouter);
app.use('/api/commissions', commissionRouter);


// Health check
app.get('/health', (_, res) => res.status(200).send('OK'));
app.get('/', (_, res) => res.send('Welcome to VetGoNow'));

// MongoDB connection
mongoose.connect(mongoDBURL)
  .then(async () => {
    console.log('MongoDB Connected');
    
    // Inicializar configuraciones de comisiones por defecto
    try {
      const CommissionConfig = (await import('./models/CommissionConfig.js')).default;
      await CommissionConfig.initializeDefaults();
      console.log('Configuraciones de comisiones inicializadas');
    } catch (error) {
      console.error('Error al inicializar configuraciones de comisiones:', error);
    }
    
    httpServer.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch(err => console.error('DB connection error:', err));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down');
  await mongoose.disconnect();
  httpServer.close(() => process.exit(0));
});

// Global error logging
process.on('unhandledRejection', err => console.error('Unhandled Promise Rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

export { io };