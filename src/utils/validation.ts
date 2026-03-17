import { z } from 'zod';

// Registration validation schema
export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  referralCode: z.string().optional(),
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required'),
});

// Update profile validation schema
export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format. Use international format (e.g., +1234567890)')
    .optional(),
  country: z.string()
    .min(2, 'Country code must be at least 2 characters')
    .optional(),
  dateOfBirth: z.string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date of birth')
    .optional(),
  profilePicture: z.string().url('Profile picture must be a valid URL').optional(),
});

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});

// Savings plan creation validation schema
export const createSavingsPlanSchema = z.object({
  planType: z.enum(['vaultfi', 'growfi', 'flexifi', 'swiftfi'], {
    message: 'Invalid plan type. Must be one of: vaultfi, growfi, flexifi, swiftfi',
  }),
  amount: z.number()
    .min(1, 'Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 1,000,000'),
});

// Deposit/Withdraw validation schema
export const transactionSchema = z.object({
  amount: z.number()
    .min(1, 'Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 1,000,000'),
});

// Wallet connection validation schema
export const connectWalletSchema = z.object({
  walletAddress: z.string()
    .min(32, 'Invalid wallet address')
    .max(44, 'Invalid wallet address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana wallet address format'),
});

// OTP verification validation schema
export const verifyOTPSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  otp: z.string()
    .min(1, 'OTP is required')
    .regex(/^\d{6}$/, 'OTP must be 6 digits')
});

// Resend OTP validation schema
export const resendOTPSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
});

// Export type inference helper
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateSavingsPlanInput = z.infer<typeof createSavingsPlanSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ConnectWalletInput = z.infer<typeof connectWalletSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type ResendOTPInput = z.infer<typeof resendOTPSchema>;
