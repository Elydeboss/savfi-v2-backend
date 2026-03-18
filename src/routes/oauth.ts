import express from 'express';
import passport from '../config/oauth';
import { generateToken } from '../utils/auth';

const router = express.Router();

// Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
	'/google/callback',
	passport.authenticate('google', {
		session: false,
		failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`
	}),
	async (req: any, res) => {
		try {
			// Passport strategy already created/found the user and attached it to req.user
			const user = req.user;

			if (!user) {
				console.error('❌ Google OAuth callback error: No user in request');
				return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
			}

			console.log('✅ Google OAuth successful:', {
				userId: user._id,
				email: user.email,
				username: user.username,
			});

			// Generate JWT token with the actual User object from MongoDB
			const token = generateToken(user);

			// Redirect to frontend with token
			res.redirect(
				`${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=google`
			);
		} catch (error) {
			console.error('❌ Google OAuth callback error:', {
				message: (error as Error).message,
				stack: (error as Error).stack,
				name: (error as Error).name,
			});

			// Determine error type and send appropriate response
			let errorMessage = 'oauth_failed';

			if ((error as Error).message?.includes('User already exists')) {
				errorMessage = 'user_exists';
			} else if ((error as Error).message?.includes('validation')) {
				errorMessage = 'validation_error';
			}

			res.redirect(`${process.env.FRONTEND_URL}/login?error=${errorMessage}`);
		}
	}
);

export default router;
