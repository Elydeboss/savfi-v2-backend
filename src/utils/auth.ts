import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

// Get JWT secret with validation
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security.');
  }
  return secret;
};

// Generate JWT token
export const generateToken = (user: IUser): string => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRE || '7d';

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

// Hash password (increased salt rounds for production security)
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
  return bcrypt.hash(password, salt);
};

// Compare password
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate referral code
export const generateReferralCode = (username: string): string => {
  const prefix = username.substring(0, 4).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomStr}`;
};

// Generate refresh token (longer-lived token for v1 compatibility)
export const generateRefreshToken = (user: IUser): string => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    type: 'refresh'
  };

  const secret = getJwtSecret();
  const expiresIn = '30d'; // Refresh tokens last longer

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};
