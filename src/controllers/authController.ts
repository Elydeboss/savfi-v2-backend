import { Request, Response } from 'express';
import { ZodError } from 'zod';
import User from '../models/User';
import { generateToken, hashPassword, comparePassword, generateReferralCode } from '../utils/auth';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, connectWalletSchema } from '../utils/validation';

// Register user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input with Zod schema
    const validatedData = registerSchema.parse(req.body);
    const { email, username, password, referralCode } = validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email or username already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate referral code
    const userReferralCode = generateReferralCode(username);

    // Create new user
    const user = new User({
      email,
      username,
      password: hashedPassword,
      referralCode: userReferralCode,
    });

    // Handle referral
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) {
        user.referredBy = referrer.referralCode;
      }
    }

    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input with Zod schema
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if user is banned
    if (user.isBanned) {
      res.status(403).json({ error: 'Account is banned', reason: user.banReason });
      return;
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        kycVerified: user.kycVerified,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input with Zod schema
    const validatedData = updateProfileSchema.parse(req.body);

    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update allowed fields
    if (validatedData.username !== undefined) user.username = validatedData.username;
    if (validatedData.phoneNumber !== undefined) user.phoneNumber = validatedData.phoneNumber;
    if (validatedData.country !== undefined) user.country = validatedData.country;
    if (validatedData.dateOfBirth !== undefined) user.dateOfBirth = new Date(validatedData.dateOfBirth);
    if (validatedData.profilePicture !== undefined) user.profilePicture = validatedData.profilePicture;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input with Zod schema
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;

    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Connect Phantom wallet
export const connectWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input with Zod schema
    const validatedData = connectWalletSchema.parse(req.body);
    const { walletAddress } = validatedData;

    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if wallet is already connected to another account
    const existingWallet = await User.findOne({ phantomWallet: walletAddress });
    if (existingWallet && existingWallet._id.toString() !== user._id.toString()) {
      res.status(400).json({ error: 'Wallet already connected to another account' });
      return;
    }

    user.phantomWallet = walletAddress;
    await user.save();

    res.status(200).json({
      message: 'Wallet connected successfully',
      walletAddress: user.phantomWallet,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Connect wallet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
