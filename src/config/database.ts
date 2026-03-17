import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Declare global variable for MongoDB connection caching in serverless environments
declare global {
  var _mongoConnection: typeof mongoose | null;
}

// Initialize global connection if it doesn't exist
if (!global._mongoConnection) {
  global._mongoConnection = null;
}

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/savfi';

    await mongoose.connect(mongoURI);

    console.log('✅ MongoDB Connected Successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

/**
 * Connect to MongoDB for serverless functions (Vercel)
 * Uses GLOBAL connection caching to reuse connections across warm function instances
 * This is critical for serverless environments where module-level cache is reset per invocation
 */
export const connectToDatabase = async (): Promise<typeof mongoose> => {
  // Return cached connection if available (warm function instance)
  if (global._mongoConnection && global._mongoConnection.connection.readyState === 1) {
    return global._mongoConnection;
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/savfi';

  try {
    // Create new connection
    const connection = await mongoose.connect(mongoURI, {
      // Serverless-specific options
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Maximum connection pool size
      minPoolSize: 2,  // Minimum connection pool size
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
  } catch (error) {
    console.error('❌ MongoDB connection failed (Serverless):', error);
    global._mongoConnection = null;
    throw error;
  }
};

export default connectDB;
