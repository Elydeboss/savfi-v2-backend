import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

// Generate JWT token
export const generateToken = (user: IUser): string => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions);
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
  return jwt.verify(token, secret);
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
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
