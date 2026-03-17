import { Router } from 'express';
import {
  register,
  login,
  verifyOTPAndRegister,
  resendOTP,
  getCurrentUser,
  updateProfile,
  changePassword,
  connectWallet,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes with rate limiting
router.post('/register', authLimiter, register);  // Sends OTP
router.post('/verify-otp', authLimiter, verifyOTPAndRegister);  // Creates user after OTP
router.post('/resend-otp', authLimiter, resendOTP);  // Resend OTP
router.post('/login', authLimiter, login);

// Protected routes (require authentication)
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, sensitiveLimiter, changePassword);
router.post('/connect-wallet', authenticate, sensitiveLimiter, connectWallet);

export default router;
