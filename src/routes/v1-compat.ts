import { Router } from 'express';
import { register, login, verifyOTPAndRegister, getCurrentUser, updateProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * V1 API Compatibility Routes
 * These routes maintain backward compatibility with the SavFi v1 frontend
 * while the v2 backend transitions to the new API structure
 */

// ===== ACCOUNT ENDPOINTS =====
// Map /accounts/* to /api/auth/*

/**
 * POST /accounts/register/
 * V1 Compatibility: Creates user and wallet (returns JWT tokens)
 * V2 Equivalent: POST /api/auth/register + POST /api/auth/verify-otp
 */
router.post('/register/', authLimiter, async (req: any, res: any) => {
  try {
    // For v1 compatibility, we need to auto-complete registration
    // Skip OTP verification for v1 frontend
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        detail: 'Username, email, and password are required'
      });
    }

    // Call v2 register endpoint (this sends OTP)
    // For v1 compatibility, we'll proceed directly to user creation
    // In production, you might want to enforce OTP
    req.body = { username, email, password };

    // Create pending registration data
    const { PendingRegistration } = await import('../models/PendingRegistration');
    const { hashPassword, generateReferralCode, generateToken, generateRefreshToken } = await import('../utils/auth');
    const { generateWalletAddress } = await import('../utils/wallet');
    const User = (await import('../models/User')).default;

    // Check if user exists
    const emailExists = await User.findOne({ email });
    const usernameExists = await User.findOne({ username });

    if (emailExists) {
      return res.status(400).json({
        detail: 'This email is already registered. Please login or reset your password.'
      });
    }

    if (usernameExists) {
      return res.status(400).json({
        detail: 'This username is already taken. Please choose a different username.'
      });
    }

    // Hash password and create user directly (v1 compatibility - no OTP)
    const hashedPassword = await hashPassword(password);
    const userReferralCode = generateReferralCode(username);
    const walletAddress = generateWalletAddress();

    const user = new User({
      email,
      username,
      password: hashedPassword,
      referralCode: userReferralCode,
      phantomWallet: walletAddress,
      emailVerified: true,
      provider: 'email'
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Create wallet automatically for v1
    await User.findByIdAndUpdate(user._id, {
      $set: {
        walletAddress: walletAddress,
        walletBalance: 0
      }
    });

    // Return v1 expected format
    res.status(201).json({
      access: token,
      refresh: refreshToken,
      username: user.username,
      email: user.email,
      id: user._id,
      walletAddress: walletAddress
    });
  } catch (error: any) {
    console.error('V1 Register error:', error);
    res.status(500).json({ detail: 'Server error during registration' });
  }
});

/**
 * POST /accounts/verify-otp/
 * V1 Compatibility: Verifies OTP and completes registration
 * V2 Equivalent: POST /api/auth/verify-otp
 */
router.post('/verify-otp/', authLimiter, async (req: any, res: any) => {
  try {
    const { email, otp } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({
        detail: 'Email and OTP are required'
      });
    }

    const { PendingRegistration } = await import('../models/PendingRegistration');
    const { hashPassword, generateReferralCode, generateToken, generateRefreshToken } = await import('../utils/auth');
    const { generateWalletAddress } = await import('../utils/wallet');
    const User = (await import('../models/User')).default;

    // Find pending registration
    const pending = await PendingRegistration.findOne({ email });

    if (!pending) {
      return res.status(404).json({
        detail: 'No pending registration found. Please register first.'
      });
    }

    // Check if OTP is expired
    if (pending.otpExpiresAt < new Date()) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({
        detail: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (pending.otp !== otp) {
      return res.status(400).json({
        detail: 'Invalid OTP. Please try again.'
      });
    }

    // Check if user already exists (double check)
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({
        detail: 'This email is already registered. Please login.'
      });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(pending.password);
    const userReferralCode = generateReferralCode(pending.username);
    const walletAddress = generateWalletAddress();

    const user = new User({
      email: pending.email,
      username: pending.username,
      password: hashedPassword,
      referralCode: userReferralCode,
      phantomWallet: walletAddress,
      emailVerified: true,
      provider: 'email'
    });

    await user.save();

    // Delete pending registration
    await PendingRegistration.deleteOne({ email });

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return v1 expected format
    res.status(201).json({
      access: token,
      refresh: refreshToken,
      username: user.username,
      email: user.email,
      id: user._id,
      walletAddress: walletAddress
    });
  } catch (error: any) {
    console.error('V1 Verify OTP error:', error);
    res.status(500).json({ detail: 'Server error during OTP verification' });
  }
});

/**
 * POST /accounts/login/
 * V1 Compatibility: Returns JWT tokens and user info
 * V2 Equivalent: POST /api/auth/login
 */
router.post('/login/', authLimiter, async (req: any, res: any) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        detail: 'Username and password are required'
      });
    }

    const User = (await import('../models/User')).default;
    const { comparePassword, generateToken, generateRefreshToken } = await import('../utils/auth');

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({
        detail: 'Invalid credentials'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        detail: 'Account is banned',
        reason: user.banReason
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        detail: 'Invalid credentials'
      });
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return v1 expected format
    res.status(200).json({
      access: token,
      refresh: refreshToken,
      username: user.username,
      email: user.email,
      id: user._id,
      phantomWallet: user.phantomWallet,
      kycVerified: user.kycVerified
    });
  } catch (error: any) {
    console.error('V1 Login error:', error);
    res.status(500).json({ detail: 'Server error during login' });
  }
});

/**
 * GET /accounts/profile/
 * V1 Compatibility: Get user profile
 * V2 Equivalent: GET /api/auth/me
 */
router.get('/profile/', authenticate, async (req: any, res: any) => {
  try {
    const user = await (await import('../models/User')).default
      .findById(req.user?.userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Return v1 expected format
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      first_name: user.firstName || '',
      second_name: user.lastName || '',
      phone: user.phoneNumber || '',
      country: user.country || '',
      state: user.state || '',
      bio: user.bio || '',
      avatar: user.profilePicture || '',
      kycVerified: user.kycVerified,
      phantomWallet: user.phantomWallet
    });
  } catch (error: any) {
    console.error('V1 Profile error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * PUT /accounts/profile/
 * V1 Compatibility: Update user profile
 * V2 Equivalent: PUT /api/auth/profile
 */
router.put('/profile/', authenticate, async (req: any, res: any) => {
  try {
    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Update allowed fields with v1 field names
    if (req.body.first_name !== undefined) user.firstName = req.body.first_name;
    if (req.body.second_name !== undefined) user.lastName = req.body.second_name;
    if (req.body.phone !== undefined) user.phoneNumber = req.body.phone;
    if (req.body.country !== undefined) user.country = req.body.country;
    if (req.body.state !== undefined) user.state = req.body.state;
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.avatar !== undefined) user.profilePicture = req.body.avatar;

    await user.save();

    // Return updated profile in v1 format
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      first_name: user.firstName || '',
      second_name: user.lastName || '',
      phone: user.phoneNumber || '',
      country: user.country || '',
      state: user.state || '',
      bio: user.bio || '',
      avatar: user.profilePicture || '',
      kycVerified: user.kycVerified
    });
  } catch (error: any) {
    console.error('V1 Update Profile error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

export default router;
