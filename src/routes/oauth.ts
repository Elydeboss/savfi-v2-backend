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
			const token = generateToken(req.user);
			// Redirect to frontend with token
			res.redirect(
				`${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=google`
			);
		} catch (error) {
			res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
		}
	}
);

export default router;
