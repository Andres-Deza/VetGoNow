import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRouter from './routes/userRoutes.js';
import vetRouter from './routes/vetRoutes.js';
import authRouter from './routes/authroutes.js';
import appointmentRouter from './routes/appointmentRoutes.js';
import petRouter from './routes/petRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import { PORT, mongoDBURL } from './config.js';
import setupSocket from './socket/VideoCallSocket.js';
import webpayRouter from './routes/webpayRoutes.js';
import emailRouter from './routes/emailRoutes.js';

const app = express();
const httpServer = createServer(app);
// Add all allowed frontends here
const allowedOrigins = [
  'http://localhost:5173', // main client
  'http://localhost:5175', // admin client (current port)
  'http://localhost:5174', // frontend client (current port)
  'http://localhost:5555'  // maybe if using another port/server
];
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
console.log('🔌 Socket.IO initialized');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Express CORS middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(helmet());

// Routes
app.use('/api/users', userRouter);
app.use('/api/vets', vetRouter);
app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/pets', petRouter);
app.use('/api/admin', adminRouter);
app.use('/uploads', express.static('Uploads'));
app.use('/api/payment/webpay', webpayRouter);
app.use('/api/send-token',emailRouter);


// Health check
app.get('/health', (_, res) => res.status(200).send('OK'));
app.get('/', (_, res) => res.send('Welcome to VetGestion'));

// MongoDB connection
mongoose.connect(mongoDBURL)
  .then(() => {
    console.log('✅ MongoDB Connected');
    httpServer.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
  })
  .catch(err => console.error('❌ DB connection error:', err));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Gracefully shutting down');
  await mongoose.disconnect();
  httpServer.close(() => process.exit(0));
});

// Global error logging
process.on('unhandledRejection', err => console.error('🔴 Unhandled Promise Rejection:', err));
process.on('uncaughtException', err => console.error('🔴 Uncaught Exception:', err));

export { io };