import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  connectWallet,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes with rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected routes (require authentication)
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, sensitiveLimiter, changePassword);
router.post('/connect-wallet', authenticate, sensitiveLimiter, connectWallet);

export default router;
