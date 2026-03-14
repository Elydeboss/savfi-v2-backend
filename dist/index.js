"use strict";
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
const database_1 = __importDefault(require("./config/database"));
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
// Enhanced health check endpoint
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            environment: env_1.env.NODE_ENV,
            database: {
                status: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
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
        const statusCode = health.database.status === 'connected' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
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