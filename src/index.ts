// src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express, { Request, Response } from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { initializeDatabase } from './database-init.js';

import cartRoutes from "./routes/cartRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import universityHallRoutes from './routes/universityHallRoutes.js';
import { studentRouter as studentRoutes } from './routes/studentroutes.js';
import homeRoutes from './routes/homeRoutes.js';
import { adminRouter as adminRoutes } from './routes/adminRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import { announcementRouter as announcementRoutes } from './routes/announcementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import openProductRoutes from './routes/openProductRoutes.js';
import { deleteAccountRouter } from './routes/deleteAccountRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import behaviorRoutes from './routes/behaviorRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import dealRoutes from './routes/dealRoutes.js';

// Initialize app
const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

// Server variable to be used in signal handlers
let server: any;

// -------------------- OLD CORS CONFIG (commented out) --------------------
/*
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:5000',
  'exp://10.128.105.124:8081',
  'exp://your-app-url',
  'http://10.128.105.124:8081',

  // ✅ For your current network IP
  'http://172.20.10.4:5000',  // backend
  'http://172.20.10.4:8081',  // Expo Metro
  'exp://172.20.10.4:8081',   // Expo app
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('Incoming origin:', origin); 
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin); 
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
}));
*/

// -------------------- CORS CONFIG (safer for credentials) --------------------
// If ALLOWED_ORIGINS is provided in environment, use it as a whitelist.
// Otherwise, reflect the request origin. This allows Access-Control-Allow-Credentials
// to be true while still returning a specific origin header (not "*").
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(',').map(s => s.trim()) : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) which have no origin
    if (!origin) return callback(null, true);

    // If a whitelist is configured, only allow those origins
    if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.log('CORS blocked for origin:', origin);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    }

    // No whitelist configured — reflect the requesting origin
    return callback(null, origin);
  },
  credentials: true,
}));

// ESM-friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
// NOTE: Register payment routes before body parsers so webhook raw body middleware
// (express.raw) can access the original request bytes for signature verification.
app.use('/api/payments', paymentRoutes);

// Register web payment page routes at subpath to avoid routing conflicts
import webPaymentPageRoutes from './controllers/webPaymentPage.js';
app.use('/api/payments/external', webPaymentPageRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Payment routes (registered above so webhook raw body middleware works correctly)

// Routes
app.use("/api/products", productRoutes);
app.use("/api/images", imageRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/university', universityHallRoutes);
app.use('/api/students', studentRoutes);
console.log('✅ Student routes registered at /api/students');
app.use('/api/home', homeRoutes);
app.use("/api/cart", cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', openProductRoutes);
app.use('/api', deleteAccountRouter);
app.use('/api/messages', messageRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/deals', dealRoutes);

console.log('✅ Admin routes registered at /api/admin');
console.log('✅ Delivery routes registered at /api/deliveries');
console.log('✅ Order routes registered at /api/orders');
console.log('✅ Review routes registered at /api/reviews');
console.log('✅ Announcement routes registered at /api/announcements');
console.log('✅ Notification routes registered at /api/notifications');
console.log('✅ Open product routes registered at /api');

// Root sanity check
app.get('/', (_: Request, res: Response) => {
  res.send('🚀 Unyva backend is running!');
});

// Serve delete account HTML page
app.get('/delete-account.html', (_: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../web-payment/delete-account.html'));
});

// Serve privacy policy HTML page
app.get('/privacy-policy.html', (_: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../web-payment/privacy-policy.html'));
});

// Test route
app.get('/api/test', (_: Request, res: Response) => {
  res.send('✅ Backend is working');
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, _next: any) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
(async () => {
  try {
    console.log('🚀 Starting Unyva backend server...');

    // Initialize database tables
    console.log('📊 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialization completed');

    // Start server
    server = app.listen(PORT, HOST, () => {
      console.log(`✅ Server running at http://${HOST}:${PORT}`);
      console.log(`✅ Server also accessible at http://localhost:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end();
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Database config check
console.log('Database config check:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
