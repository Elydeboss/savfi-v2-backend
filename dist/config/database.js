"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Initialize global connection if it doesn't exist
if (!global._mongoConnection) {
    global._mongoConnection = null;
}
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
/**
 * Connect to MongoDB for serverless functions (Vercel)
 * Uses GLOBAL connection caching to reuse connections across warm function instances
 * This is critical for serverless environments where module-level cache is reset per invocation
 */
const connectToDatabase = async () => {
    // Return cached connection if available (warm function instance)
    if (global._mongoConnection && global._mongoConnection.connection.readyState === 1) {
        return global._mongoConnection;
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
        // Store in global for reuse across function invocations
        global._mongoConnection = connection;
        console.log('✅ MongoDB Connected (Serverless)');
        // Handle connection errors
        connection.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error (Serverless):', err);
            global._mongoConnection = null; // Reset global cache on error
        });
        connection.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected (Serverless)');
            global._mongoConnection = null; // Reset global cache on disconnect
        });
        return connection;
    }
    catch (error) {
        console.error('❌ MongoDB connection failed (Serverless):', error);
        global._mongoConnection = null;
        throw error;
    }
};
exports.connectToDatabase = connectToDatabase;
exports.default = connectDB;
//# sourceMappingURL=database.js.map