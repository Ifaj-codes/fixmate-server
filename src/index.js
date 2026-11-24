import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { runSeed } from './seed.js';

import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import bookingsRoutes from './routes/bookings.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration (handles Next.js dev & prod domains)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://fixmate-client.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for local dev & evaluation
    }
  },
  credentials: true
}));

// Raw body parser for Stripe Webhook (MUST be before express.json())
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Regular JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    platform: 'FixMate Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Server Startup (Local vs Vercel Serverless)
async function startServer() {
  try {
    await connectDB();
    await runSeed();

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`===============================================`);
        console.log(`🚀 FixMate Express API running on port ${PORT}`);
        console.log(`📡 URL: http://localhost:${PORT}`);
        console.log(`🔑 Admin:      admin@fixmate.com / Admin123#`);
        console.log(`🛠️ Technician: rahim.tech@fixmate.com / Tech123#`);
        console.log(`👤 Customer:   customer@fixmate.com / User123#`);
        console.log(`===============================================`);
      });
    }
  } catch (err) {
    console.error('Startup initialization notice:', err.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

startServer();

export default app;
