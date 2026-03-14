import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import connectDB from './config/database';
import { env } from './config/env';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import savingsRoutes from './routes/savings';
import passport from './config/oauth';
import { apiLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

// Security middleware
app.disable('x-powered-by'); // Hide Express signature
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xssFilter: true,
  noSniff: true,
}));

// CORS configuration with whitelist
const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',')
  : [env.FRONTEND_URL];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
if (env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // Apache-style logs for production
} else {
  app.use(morgan('dev')); // Color-coded dev logs
}

// Compression middleware
app.use(compression());

// Body parser with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Initialize Passport
app.use(passport.initialize());

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'SavFi Solana Platform API',
    version: '1.0.0',
    status: 'running',
    environment: env.NODE_ENV,
  });
});

// Enhanced health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        name: mongoose.connection.name,
        host: mongoose.connection.host,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      },
      cpu: process.cpuUsage(),
    };

    const statusCode = health.database.status === 'connected' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/savings', savingsRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  // Log error in production
  if (env.NODE_ENV === 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  } else {
    console.error('Error:', err);
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.errors[0].message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Default error
  res.status(err.status || 500).json({
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ===== EXPORT FOR VERCEL =====
// Export the Express app for Vercel Functions to use
export default app;

// ===== START SERVER LOCALLY ONLY =====
// Only start the server if NOT running on Vercel (which sets the 'VERCEL' env var)
if (!process.env.VERCEL) {
  const startServer = async (): Promise<void> => {
    try {
      // Connect to MongoDB
      await connectDB();

      // Start listening
      app.listen(env.PORT, () => {
        console.log(`🚀 Server running on port ${env.PORT}`);
        console.log(`📝 Environment: ${env.NODE_ENV}`);
        console.log(`🔗 API: http://localhost:${env.PORT}`);
        console.log(`🏥 Health: http://localhost:${env.PORT}/health`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

// Handle unhandled promise rejections (keep for all environments)
process.on('unhandledRejection', (err: any) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err: any) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
