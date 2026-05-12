import { Request, Response } from 'express';
import { ZodError } from 'zod';
import User from '../models/User';
import { OTP } from '../models/OTP';
import { PendingRegistration } from '../models/PendingRegistration';
import { generateToken, hashPassword, comparePassword, generateReferralCode } from '../utils/auth';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, connectWalletSchema } from '../utils/validation';
import { generateWalletAddress } from '../utils/wallet';
import { OTPService } from '../services/otp.service';
import { EmailService } from '../services/email.service';

// Register user - sends OTP for verification
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input with Zod schema
    const validatedData = registerSchema.parse(req.body);
    const { email, username, password, referralCode } = validatedData;

    // Check if user already exists - check separately for better error messages
    const emailExists = await User.findOne({ email });
    const usernameExists = await User.findOne({ username });

    if (emailExists) {
      // Check if user registered via Google OAuth
      if (emailExists.provider === 'google') {
        res.status(400).json({
          error: 'This email is already registered with Google Sign-In. Please use Google Sign-In to login.',
          field: 'email',
          provider: 'google'
        });
        return;
      }

      res.status(400).json({
        error: 'This email is already registered. Please login or reset your password.',
        field: 'email'
      });
      return;
    }

    if (usernameExists) {
      res.status(400).json({
        error: 'This username is already taken. Please choose a different username.',
        field: 'username'
      });
      return;
    }

    // Check if there's already a pending OTP for this email
    const pendingOTP = await OTP.findOne({ email, type: 'registration' });
    if (pendingOTP) {
      // OTP exists but user might not have received the email
      // Re-send the email instead of blocking the user
      const otp = pendingOTP.otp;
      // TODO: Uncomment when email service is configured
      // try {
      //   await EmailService.sendOTPEmail(email, otp, 'registration');
      //   console.log(`Re-sent OTP email to ${email}`);
      // } catch (emailError) {
      //   console.error('Resend OTP email error:', emailError);
      //   // Still allow proceeding - the OTP exists in the database
      // }
      console.log(`OTP for ${email}: ${otp} (email disabled)`);
      // Continue with the registration flow - user can verify with existing OTP
    }

    // Check if there's pending registration data
    const pendingReg = await PendingRegistration.findOne({ email });
    if (pendingReg) {
      // Verify username is still available
      if (pendingReg.username !== username) {
        const usernameTaken = await User.findOne({ username });
        if (usernameTaken) {
          res.status(400).json({
            error: 'This username is already taken. Please choose a different username.',
            field: 'username'
          });
          return;
        }
      }
      // Update pending registration with new data
      pendingReg.username = username;
      pendingReg.password = await hashPassword(password);
      pendingReg.referralCode = referralCode;
      pendingReg.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Reset expiry
      await pendingReg.save();
    } else {
      // Hash password
      const hashedPassword = await hashPassword(password);

      // Store pending registration
      await PendingRegistration.create({
        email,
        username,
        password: hashedPassword,
        referralCode,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
    }

    // Send OTP to email
    const result = await OTPService.createAndSendOTP(email, 'registration');

    if (!result.success) {
      console.error('❌ OTP creation failed for email:', email);
      console.error('❌ Error message:', result.message);
      console.error('❌ Check RESEND_API_KEY environment variable');
      res.status(500).json({
        error: 'Registration failed. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? result.message : undefined
      });
      return;
    }

    res.status(200).json({
      message: 'Verification email sent. Please check your inbox to complete your registration.',
      requiresOTP: true,
      email
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

// Verify OTP and complete registration
export const verifyOTPAndRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      res.status(400).json({ error: 'Email and OTP are required', field: 'otp' });
      return;
    }

    // Verify OTP
    const verification = await OTPService.verifyOTP(email, otp, 'registration');
    if (!verification.valid) {
      res.status(400).json({ error: verification.message, field: 'otp' });
      return;
    }

    // Get pending registration
    const pendingReg = await PendingRegistration.findOne({ email });
    if (!pendingReg) {
      res.status(400).json({ error: 'Registration data not found or expired. Please start over.' });
      return;
    }

    // Check if username is still available
    const usernameTaken = await User.findOne({ username: pendingReg.username });
    if (usernameTaken) {
      // Delete pending registration
      await PendingRegistration.deleteOne({ email });
      res.status(400).json({
        error: 'This username is already taken. Please start registration with a different username.',
        field: 'username'
      });
      return;
    }

    // Generate referral code
    const userReferralCode = generateReferralCode(pendingReg.username);

    // Generate a wallet address for the user
    const walletAddress = generateWalletAddress();

    // Create user with pending data
    const user = new User({
      email: pendingReg.email,
      username: pendingReg.username,
      password: pendingReg.password,
      referralCode: userReferralCode,
      phantomWallet: walletAddress,
      emailVerified: true, // Email is verified since they completed OTP
      provider: 'email'
    });

    // Handle referral if code provided
    if (pendingReg.referralCode) {
      const referrer = await User.findOne({ referralCode: pendingReg.referralCode.toUpperCase() });
      if (referrer) {
        user.referredBy = referrer.referralCode;
      }
    }

    await user.save();

    // Delete pending registration
    await PendingRegistration.deleteOne({ email });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        phantomWallet: user.phantomWallet,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if there's a pending registration
    const pendingReg = await PendingRegistration.findOne({ email });
    if (!pendingReg) {
      res.status(400).json({ error: 'No pending registration found. Please start a new registration.' });
      return;
    }

    // Check if OTP was recently sent (rate limiting: 60 seconds)
    const recentOTP = await OTP.findOne({ email, type: 'registration' });
    if (recentOTP) {
      const timeSinceLastSent = Date.now() - recentOTP.createdAt.getTime();
      if (timeSinceLastSent < 60000) {
        const remainingSeconds = Math.ceil((60000 - timeSinceLastSent) / 1000);
        res.status(429).json({
          error: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
          retryAfter: remainingSeconds
        });
        return;
      }
    }

    // Send new OTP
    const result = await OTPService.createAndSendOTP(email, 'registration');
    if (!result.success) {
      res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
      return;
    }

    res.status(200).json({ message: 'New OTP sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Server error' });
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
        phantomWallet: user.phantomWallet,
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
