"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = __importStar(require("./config/database"));
const env_1 = require("./config/env");
const auth_1 = __importDefault(require("./routes/auth"));
const oauth_1 = __importDefault(require("./routes/oauth"));
const savings_1 = __importDefault(require("./routes/savings"));
const oauth_2 = __importDefault(require("./config/oauth"));
const rateLimiter_1 = require("./middleware/rateLimiter");
// Load environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);
// Security middleware
app.disable('x-powered-by'); // Hide Express signature
app.use((0, helmet_1.default)({
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
const allowedOrigins = env_1.env.ALLOWED_ORIGINS
    ? env_1.env.ALLOWED_ORIGINS.split(',')
    : [env_1.env.FRONTEND_URL];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Request logging
if (env_1.env.NODE_ENV === 'production') {
    app.use((0, morgan_1.default)('combined')); // Apache-style logs for production
}
else {
    app.use((0, morgan_1.default)('dev')); // Color-coded dev logs
}
// Compression middleware
app.use((0, compression_1.default)());
// Body parser with size limits
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Initialize Passport
app.use(oauth_2.default.initialize());
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
            await (0, database_1.connectToDatabase)();
        }
        next();
    }
    catch (error) {
        console.error('Database connection middleware error:', error);
        res.status(503).json({ error: 'Database connection failed' });
    }
});
// Apply rate limiting to all API routes
app.use('/api/', rateLimiter_1.apiLimiter);
// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'SavFi Solana Platform API',
        version: '1.0.0',
        status: 'running',
        environment: env_1.env.NODE_ENV,
    });
});
// Handle favicon requests - return 204 to prevent browser from retrying
// This prevents console errors about blocked favicon requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});
// Enhanced health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Ensure database connection for health check (works in both local and serverless)
        if (!process.env.VERCEL || mongoose_1.default.connection.readyState !== 1) {
            await (0, database_1.connectToDatabase)();
        }
        const isDbConnected = mongoose_1.default.connection.readyState === 1;
        const health = {
            status: isDbConnected ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            environment: env_1.env.NODE_ENV,
            database: {
                status: isDbConnected ? 'connected' : 'disconnected',
                name: mongoose_1.default.connection.name,
                host: mongoose_1.default.connection.host,
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
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
            database: { status: 'disconnected' },
        });
    }
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/auth/oauth', oauth_1.default);
app.use('/api/savings', savings_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    // Log error in production
    if (env_1.env.NODE_ENV === 'production') {
        console.error('Error:', {
            message: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method,
            ip: req.ip,
        });
    }
    else {
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
        error: env_1.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// ===== EXPORT FOR VERCEL =====
// Export the Express app for Vercel Functions to use
exports.default = app;
// ===== START SERVER LOCALLY ONLY =====
// Only start the server if NOT running on Vercel (which sets the 'VERCEL' env var)
if (!process.env.VERCEL) {
    const startServer = async () => {
        try {
            // Connect to MongoDB
            await (0, database_1.default)();
            // Start listening
            app.listen(env_1.env.PORT, () => {
                console.log(`🚀 Server running on port ${env_1.env.PORT}`);
                console.log(`📝 Environment: ${env_1.env.NODE_ENV}`);
                console.log(`🔗 API: http://localhost:${env_1.env.PORT}`);
                console.log(`🏥 Health: http://localhost:${env_1.env.PORT}/health`);
            });
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    };
    startServer();
}
// Handle unhandled promise rejections (keep for all environments)
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map