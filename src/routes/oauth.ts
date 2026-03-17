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
			const googleProfile = req.user;

			if (!googleProfile || !googleProfile.email) {
				console.error('❌ Google OAuth callback error: No email in profile');
				return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
			}

			// Try to use EvtStore command first
			try {
				const { getUserCommands } = await import('../domain/domain');
				const userCommands = await getUserCommands();

				// Try to create user via EvtStore (will fail if user exists)
				await userCommands['create-user-oauth'](googleProfile.email, {
					email: googleProfile.email,
					username: googleProfile.email.split('@')[0], // Will be made unique by command
					provider: 'google',
					providerId: googleProfile.id,
				});

				console.log('✅ Google OAuth user created via EvtStore:', {
					email: googleProfile.email,
					providerId: googleProfile.id,
				});
			} catch (commandError: any) {
				// User might already exist, that's okay - the user was likely created
				// by the legacy Passport strategy or in a previous OAuth flow
				if (commandError.message?.includes('User already exists')) {
					console.log('ℹ️ User already exists, proceeding with authentication');
				} else {
					throw commandError; // Re-throw other errors
				}
			}

			// Generate JWT token
			const token = generateToken(googleProfile);

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
