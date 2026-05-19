import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Deposit Routes
 * V1 Compatibility: Handle deposit operations
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /deposit/ngn/initiate
 * V1 Compatibility: Initiate NGN deposit
 */
router.post('/ngn/initiate', authLimiter, async (req: any, res: any) => {
  try {
    const { amount, paymentMethod = 'bank_transfer' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ detail: 'Invalid amount' });
    }

    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Generate reference
    const reference = `DEP-${Date.now()}-${user._id}`;

    // Calculate USDT amount (assuming rate of 1600 NGN = 1 USDT)
    const rate = 1600;
    const usdtAmount = amount / rate;

    // Create pending transaction
    const Transaction = (await import('../models/Transaction')).default;
    const transaction = new Transaction({
      userId: user._id,
      type: 'Deposit',
      amount: `+₦${amount.toLocaleString()}`,
      usdtAmount,
      source: 'Naira',
      status: 'pending',
      reference,
      paymentMethod,
      metadata: {
        ngnAmount: amount,
        rate,
        fee: 0
      }
    });

    await transaction.save();

    // Return bank details for deposit
    res.status(200).json({
      message: 'Deposit initiated. Please transfer to the account below.',
      reference,
      amount: {
        ngn: amount,
        usdt: usdtAmount.toFixed(2)
      },
      bankDetails: {
        bankName: 'SaveFi',
        accountNumber: '1234567890',
        accountName: 'SaveFi Limited',
        narration: reference
      },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });
  } catch (error: any) {
    console.error('Initiate NGN deposit error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /deposit/ngn/confirm
 * V1 Compatibility: Confirm NGN deposit (after payment verification)
 */
router.post('/ngn/confirm', authLimiter, async (req: any, res: any) => {
  try {
    const { reference, transactionId } = req.body;

    const Transaction = (await import('../models/Transaction')).default;
    const User = (await import('../models/User')).default;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user?.userId
    });

    if (!transaction) {
      return res.status(404).json({ detail: 'Transaction not found' });
    }

    // Update transaction status
    transaction.status = 'completed';
    await transaction.save();

    // Update user wallet balance
    const user = await User.findById(req.user?.userId);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + (transaction.usdtAmount || 0);
      await user.save();
    }

    res.status(200).json({
      message: 'Deposit confirmed successfully',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        usdtAmount: transaction.usdtAmount,
        status: transaction.status,
        reference: transaction.reference
      },
      newBalance: user?.walletBalance || 0
    });
  } catch (error: any) {
    console.error('Confirm NGN deposit error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /deposit/usdt/initiate
 * V1 Compatibility: Initiate USDT deposit
 */
router.post('/usdt/initiate', authLimiter, async (req: any, res: any) => {
  try {
    const { amount, network = 'TRC20' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ detail: 'Invalid amount' });
    }

    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Generate reference
    const reference = `USDT-DEP-${Date.now()}-${user._id}`;

    // Create pending transaction
    const Transaction = (await import('../models/Transaction')).default;
    const transaction = new Transaction({
      userId: user._id,
      type: 'Deposit',
      amount: `+${amount} USDT`,
      usdtAmount: amount,
      source: 'Crypto',
      status: 'pending',
      reference,
      network,
      metadata: {
        network,
        expectedAmount: amount
      }
    });

    await transaction.save();

    // Return deposit address
    const depositAddress = user.phantomWallet || process.env.DEFAULT_USDT_ADDRESS || 'TYourUSDTAddressHere';

    res.status(200).json({
      message: 'Please send USDT to the address below',
      reference,
      amount,
      network,
      depositAddress,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });
  } catch (error: any) {
    console.error('Initiate USDT deposit error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /deposit/usdt/confirm
 * V1 Compatibility: Confirm USDT deposit (after blockchain verification)
 */
router.post('/usdt/confirm', authLimiter, async (req: any, res: any) => {
  try {
    const { reference, transactionHash } = req.body;

    const Transaction = (await import('../models/Transaction')).default;
    const User = (await import('../models/User')).default;

    const transaction = await Transaction.findOne({
      reference,
      userId: req.user?.userId
    });

    if (!transaction) {
      return res.status(404).json({ detail: 'Transaction not found' });
    }

    // Update transaction with hash and status
    transaction.transactionHash = transactionHash;
    transaction.status = 'completed';
    await transaction.save();

    // Update user wallet balance
    const user = await User.findById(req.user?.userId);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + (transaction.usdtAmount || 0);
      await user.save();
    }

    res.status(200).json({
      message: 'Deposit confirmed successfully',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        usdtAmount: transaction.usdtAmount,
        status: transaction.status,
        transactionHash: transaction.transactionHash
      },
      newBalance: user?.walletBalance || 0
    });
  } catch (error: any) {
    console.error('Confirm USDT deposit error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

export default router;
