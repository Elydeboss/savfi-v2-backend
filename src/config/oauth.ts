import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';
import { generateReferralCode } from '../utils/auth';
import { generateWalletAddress } from '../utils/wallet';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const CALLBACK_URL = process.env.OAUTH_CALLBACK_URL || 'http://localhost:5000';

// Google Strategy
passport.use(
	new GoogleStrategy(
		{
			clientID: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
			callbackURL: `${CALLBACK_URL}/api/auth/oauth/google/callback`
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				// Check if user already exists with this Google ID
				let user = await User.findOne({ 'googleProfile.id': profile.id });

				if (user) {
					return done(null, user);
				}

				// Check if email already exists (account linking)
				const email = profile.emails?.[0].value;
				if (email) {
					const existingUser = await User.findOne({ email });
					if (existingUser) {
						// Link Google account to existing user
						existingUser.provider = 'google';
						existingUser.providerId = profile.id;
						existingUser.googleProfile = {
							id: profile.id,
							email: email,
							name: profile.displayName,
							picture: profile.photos?.[0].value
						};
						existingUser.emailVerified = true;
						// Update profile picture if not set
						if (!existingUser.profilePicture && profile.photos?.[0].value) {
							existingUser.profilePicture = profile.photos[0].value;
						}
						// Generate wallet if not already present
						if (!existingUser.phantomWallet) {
							existingUser.phantomWallet = generateWalletAddress();
						}
						await existingUser.save();
						return done(null, existingUser);
					}
				}

				// Generate unique username from email
				const baseUsername = email?.split('@')[0] || 'google_user';
				const randomSuffix = Math.random().toString(36).substring(2, 7);
				const username = `${baseUsername}_${randomSuffix}`;

				// Generate referral code
				const referralCode = generateReferralCode(username);

				// Generate wallet address for the user
				const walletAddress = generateWalletAddress();

				// Create new user
				user = await User.create({
					email: email,
					username: username,
					referralCode: referralCode,
					provider: 'google',
					providerId: profile.id,
					emailVerified: true,
					phantomWallet: walletAddress,
					googleProfile: {
						id: profile.id,
						email: email || '',
						name: profile.displayName,
						picture: profile.photos?.[0].value
					},
					profilePicture: profile.photos?.[0].value
				});

				done(null, user);
			} catch (error) {
				done(error as Error);
			}
		}
	)
);

export default passport;
