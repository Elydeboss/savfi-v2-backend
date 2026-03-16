import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

// Cached connection for serverless functions (Vercel)
let cachedConnection: typeof mongoose | null = null;

/**
 * Connect to MongoDB for serverless functions
 * Uses connection caching to reuse connections across warm function instances
 */
export const connectToDatabase = async (): Promise<typeof mongoose> => {
  // Return cached connection if available (warm function instance)
  if (cachedConnection && cachedConnection.connection.readyState === 1) {
    return cachedConnection;
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
  } catch (error) {
    console.error('❌ MongoDB connection failed (Serverless):', error);
    cachedConnection = null;
    throw error;
  }
};

export default connectDB;
