import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Wallet Routes
 * V1 Compatibility: Handle wallet operations
 */

/**
 * GET /wallets/
 * V1 Compatibility: Get user's wallet(s)
 */
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Return wallet in v1 format
    const walletData = {
      id: user._id,
      owner: user.username,
      addresses: user.phantomWallet ? [user.phantomWallet] : [],
      balance: user.walletBalance || 0,
      currency: 'USDT',
      created_at: user.createdAt
    };

    // v1 expects array of wallets
    res.status(200).json([walletData]);
  } catch (error: any) {
    console.error('Get wallet error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /wallets/
 * V1 Compatibility: Create a new wallet
 */
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const { owner, address, addresses, idempotency_key } = req.body;

    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const walletAddresses = addresses || (address ? [address] : []);

    // Update user's wallet
    if (walletAddresses.length > 0) {
      user.phantomWallet = walletAddresses[0];
    }

    await user.save();

    // Return created wallet in v1 format
    const walletData = {
      id: user._id,
      owner: user.username,
      addresses: [user.phantomWallet],
      balance: user.walletBalance || 0,
      currency: 'USDT',
      created_at: user.createdAt
    };

    res.status(201).json(walletData);
  } catch (error: any) {
    console.error('Create wallet error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * GET /wallet/info
 * V1 Compatibility: Get wallet information
 */
router.get('/info', authenticate, async (req: any, res: any) => {
  try {
    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Return wallet info in v1 format
    res.status(200).json({
      id: user._id,
      owner: user.username,
      addresses: user.phantomWallet ? [user.phantomWallet] : [],
      address: user.phantomWallet,
      balance: user.walletBalance || 0,
      currency: 'USDT',
      created_at: user.createdAt,
      updated_at: user.updatedAt
    });
  } catch (error: any) {
    console.error('Get wallet info error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /wallet/balance
 * V1 Compatibility: Update wallet balance (admin/internal use)
 */
router.post('/balance', authenticate, async (req: any, res: any) => {
  try {
    const { balance, currency = 'USDT' } = req.body;

    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    user.walletBalance = balance || 0;
    await user.save();

    res.status(200).json({
      message: 'Balance updated successfully',
      balance: user.walletBalance,
      currency
    });
  } catch (error: any) {
    console.error('Update balance error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

export default router;
