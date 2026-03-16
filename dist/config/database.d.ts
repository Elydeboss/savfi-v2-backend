import mongoose from 'mongoose';
declare const connectDB: () => Promise<void>;
/**
 * Connect to MongoDB for serverless functions
 * Uses connection caching to reuse connections across warm function instances
 */
export declare const connectToDatabase: () => Promise<typeof mongoose>;
export default connectDB;
//# sourceMappingURL=database.d.ts.map