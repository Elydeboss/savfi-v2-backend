import mongoose from 'mongoose';
declare global {
    var _mongoConnection: typeof mongoose | null;
}
declare const connectDB: () => Promise<void>;
/**
 * Connect to MongoDB for serverless functions (Vercel)
 * Uses GLOBAL connection caching to reuse connections across warm function instances
 * This is critical for serverless environments where module-level cache is reset per invocation
 */
export declare const connectToDatabase: () => Promise<typeof mongoose>;
export default connectDB;
//# sourceMappingURL=database.d.ts.map