import { connectToDatabase } from '../src/config/database';
import app from '../src/index';

/**
 * Vercel Serverless Function Handler
 *
 * This is the entry point for all API requests on Vercel.
 * It ensures database connection before handling each request.
 *
 * The catch-all route [...path] matches all API paths:
 * - /api/auth/* → handles auth routes
 * - /api/savings/* → handles savings routes
 * - /health → handles health check
 * etc.
 */

export default async function handler(req: any, res: any) {
  try {
    // Ensure database connection for this serverless invocation
    // This uses connection caching, so subsequent requests are faster
    await connectToDatabase();

    // Handle the request with the Express app
    return app(req, res);
  } catch (error) {
    console.error('Vercel serverless handler error:', error);

    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }
}

/**
 * Vercel configuration for this API route
 *
 * bodyParser: false - We let Express handle body parsing
 * This allows Express middleware to process the body correctly
 */
export const config = {
  api: {
    bodyParser: false,
  },
};
