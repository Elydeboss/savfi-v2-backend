import { Request, Response, NextFunction } from 'express';

/**
 * Standard API Response wrapper
 * Ensures all responses have consistent format: { success, data, error, message }
 */
interface APIResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

/**
 * Express middleware to wrap responses in APIResponse format
 * This should be applied BEFORE routes to intercept res.json() calls
 */
export function responseWrapper(req: Request, res: any, next: NextFunction) {
	// Store the original res.json method
	const originalJson = res.json.bind(res);

	// Override res.json to wrap responses
	res.json = function(body: any) {
		// If already an APIResponse, use as-is
		if (body && typeof body === 'object' && 'success' in body) {
			return originalJson(body);
		}

		// If it's an error response, wrap appropriately
		if (res.statusCode >= 400) {
			return originalJson({
				success: false,
				error: typeof body === 'string' ? body : body?.error || 'Request failed',
			});
		}

		// Success response - wrap the data
		return originalJson({
			success: true,
			data: body,
			message: body?.message,
		});
	};

	next();
}

/**
 * Helper function to send success response
 */
export function sendSuccess<T>(res: Response, data: T, message?: string) {
	return res.json({
		success: true,
		data,
		message,
	});
}

/**
 * Helper function to send error response
 */
export function sendError(res: Response, error: string, statusCode: number = 400) {
	return res.status(statusCode).json({
		success: false,
		error,
	});
}
