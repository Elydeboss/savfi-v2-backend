import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import connectDB, { connectToDatabase } from './config/database';
import { env } from './config/env';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import savingsRoutes from './routes/savings';
import v1CompatRoutes from './routes/v1-compat';
import walletRoutes from './routes/wallet';
import transactionRoutes from './routes/transactions';
import depositRoutes from './routes/deposits';
import withdrawalRoutes from './routes/withdrawals';
import passport from './config/oauth';
import { apiLimiter } from './middleware/rateLimiter';
import { startAllProjections } from './domain/handlers/projections';
import { responseWrapper } from './utils/response';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

// Security middleware
app.disable('x-powered-by'); // Hide Express signature
app.use(helmet({
  // Disable cross-origin resource policy to allow API requests from frontend
  crossOriginResourcePolicy: false,
  // Content Security Policy - can be re-enabled later if needed
  contentSecurityPolicy: false,
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

// Database connection middleware for serverless (Vercel)
// On Vercel, this runs before each API request
// Locally, the database is already connected at startup
app.use(async (req, res, next) => {
  try {
    // Skip database connection for health check on serverless
    // Health check will connect separately
    if (req.path === '/health' && process.env.VERCEL) {
      return next();
    }

    // Ensure database connection exists for serverless functions
    if (process.env.VERCEL) {
      await connectToDatabase();
    }
    next();
  } catch (error) {
    console.error('Database connection middleware error:', error);
    res.status(503).json({ error: 'Database connection failed' });
  }
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply response wrapper to standardize API responses
app.use('/api/', responseWrapper);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'SavFi Solana Platform API',
    version: '1.0.0',
    status: 'running',
    environment: env.NODE_ENV,
  });
});

// Handle favicon requests - return 204 to prevent browser from retrying
// This prevents console errors about blocked favicon requests
app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

// Enhanced health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Ensure database connection for health check (works in both local and serverless)
    if (!process.env.VERCEL || mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    const health = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
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

    const statusCode = isDbConnected ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      database: { status: 'disconnected' },
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/savings', savingsRoutes);

// V1 Compatibility Routes - These maintain backward compatibility with SavFi v1 frontend
app.use('/api/accounts', v1CompatRoutes); // Frontend sends /api/accounts/register/
app.use('/accounts', v1CompatRoutes); // Maps /accounts/* to auth operations
app.use('/wallets', walletRoutes); // Wallet endpoints
app.use('/wallet', walletRoutes); // Single wallet endpoint (v1 uses both)
app.use('/transactions', transactionRoutes); // Transaction endpoints
app.use('/deposit', depositRoutes); // Deposit endpoints
app.use('/withdrawal', withdrawalRoutes); // Withdrawal endpoints

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

      // Start EvtStore projection handlers if enabled
      if (process.env.EVTSTORE_ENABLED === 'true') {
        try {
          await startAllProjections();
          console.log('✅ EvtStore projection handlers started');
        } catch (error) {
          console.error('❌ Failed to start EvtStore projection handlers:', error);
          // Don't fail the app startup, just log the error
        }
      } else {
        console.log('ℹ️ EvtStore projection handlers not enabled (set EVTSTORE_ENABLED=true to enable)');
      }

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
