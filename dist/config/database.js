"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/savfi';
        await mongoose_1.default.connect(mongoURI);
        console.log('✅ MongoDB Connected Successfully');
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
        });
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose_1.default.connection.close();
            console.log('👋 MongoDB connection closed through app termination');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};
// Cached connection for serverless functions (Vercel)
let cachedConnection = null;
/**
 * Connect to MongoDB for serverless functions
 * Uses connection caching to reuse connections across warm function instances
 */
const connectToDatabase = async () => {
    // Return cached connection if available (warm function instance)
    if (cachedConnection && cachedConnection.connection.readyState === 1) {
        return cachedConnection;
    }
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/savfi';
    try {
        // Create new connection
        const connection = await mongoose_1.default.connect(mongoURI, {
            // Serverless-specific options
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10, // Maximum connection pool size
            minPoolSize: 2, // Minimum connection pool size
        });
        cachedConnection = connection;
        console.log('✅ MongoDB Connected (Serverless)');
        // Handle connection errors
        connection.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error (Serverless):', err);
            cachedConnection = null; // Reset cache on error
        });
        connection.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected (Serverless)');
            cachedConnection = null; // Reset cache on disconnect
        });
        return connection;
    }
    catch (error) {
        console.error('❌ MongoDB connection failed (Serverless):', error);
        cachedConnection = null;
        throw error;
    }
};
exports.connectToDatabase = connectToDatabase;
exports.default = connectDB;
//# sourceMappingURL=database.js.map