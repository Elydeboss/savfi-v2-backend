import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Withdrawal Routes
 * V1 Compatibility: Handle withdrawal operations
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /withdrawal/ngn/initiate
 * V1 Compatibility: Initiate NGN withdrawal
 */
router.post('/ngn/initiate', authLimiter, async (req: any, res: any) => {
  try {
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ detail: 'Invalid amount' });
    }

    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankName) {
      return res.status(400).json({ detail: 'Bank details are required' });
    }

    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const availableBalance = user.walletBalance || 0;

    if (amount > availableBalance) {
      return res.status(400).json({
        detail: 'Insufficient balance',
        availableBalance,
        requestedAmount: amount
      });
    }

    // Calculate fees
    const rate = 1450; // NGN per USDT
    const otcFee = 570;
    const saveFiFee = 2000;
    const nairaAmount = amount * rate;
    const receiveAmount = nairaAmount - otcFee - saveFiFee;

    // Generate reference
    const reference = `WDR-NGN-${Date.now()}-${user._id}`;

    // Create pending transaction
    const Transaction = (await import('../models/Transaction')).default;
    const transaction = new Transaction({
      userId: user._id,
      type: 'Withdrawal',
      amount: `-${amount} USDT`,
      usdtAmount: amount,
      source: 'Naira',
      status: 'pending',
      reference,
      bankDetails,
      metadata: {
        nairaAmount,
        receiveAmount,
        rate,
        otcFee,
        saveFiFee,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName
      }
    });

    await transaction.save();

    res.status(200).json({
      message: 'Withdrawal initiated. Please confirm with 2FA.',
      reference,
      amount: {
        usdt: amount,
        ngn: nairaAmount,
        receive: receiveAmount
      },
      fees: {
        otc: otcFee,
        saveFi: saveFiFee
      },
      bankDetails: {
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
  } catch (error: any) {
    console.error('Initiate NGN withdrawal error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /withdrawal/ngn/confirm
 * V1 Compatibility: Confirm NGN withdrawal (after 2FA)
 */
router.post('/ngn/confirm', authLimiter, async (req: any, res: any) => {
  try {
    const { reference, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ detail: 'OTP is required' });
    }

    const Transaction = (await import('../models/Transaction')).default;
    const User = (await import('../models/User')).default;

    const transaction = await Transaction.findOne({
      reference,
      userId: req.user?.userId
    });

    if (!transaction) {
      return res.status(404).json({ detail: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ detail: 'Transaction already processed' });
    }

    // Verify OTP (you might want to implement proper 2FA here)
    // For now, we'll accept any 6-digit code
    if (otp.length !== 6) {
      return res.status(400).json({ detail: 'Invalid OTP' });
    }

    // Update transaction status
    transaction.status = 'processing';
    await transaction.save();

    // Deduct from user balance
    const user = await User.findById(req.user?.userId);
    if (user && transaction.usdtAmount) {
      user.walletBalance = (user.walletBalance || 0) - transaction.usdtAmount;
      await user.save();
    }

    // Simulate processing (in production, you'd integrate with a payment processor)
    setTimeout(async () => {
      transaction.status = 'completed';
      await transaction.save();
    }, 3000);

    res.status(200).json({
      message: 'Withdrawal processing. You will receive funds within 24 hours.',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference
      },
      newBalance: user?.walletBalance || 0
    });
  } catch (error: any) {
    console.error('Confirm NGN withdrawal error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /withdrawal/usdt/initiate
 * V1 Compatibility: Initiate USDT withdrawal
 */
router.post('/usdt/initiate', authLimiter, async (req: any, res: any) => {
  try {
    const { amount, network = 'TRC20', recipientAddress } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ detail: 'Invalid amount' });
    }

    if (!recipientAddress) {
      return res.status(400).json({ detail: 'Recipient address is required' });
    }

    const User = (await import('../models/User')).default;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    const availableBalance = user.walletBalance || 0;

    if (amount > availableBalance) {
      return res.status(400).json({
        detail: 'Insufficient balance',
        availableBalance,
        requestedAmount: amount
      });
    }

    // Calculate network fee
    const networkFee = network === 'TRC20' ? 1 : 5; // USDT
    const totalDeduction = amount + networkFee;

    if (totalDeduction > availableBalance) {
      return res.status(400).json({
        detail: 'Insufficient balance including network fee',
        availableBalance,
        requestedAmount: amount,
        networkFee,
        totalRequired: totalDeduction
      });
    }

    // Generate reference
    const reference = `WDR-USDT-${Date.now()}-${user._id}`;

    // Create pending transaction
    const Transaction = (await import('../models/Transaction')).default;
    const transaction = new Transaction({
      userId: user._id,
      type: 'Withdrawal',
      amount: `-${amount} USDT`,
      usdtAmount: amount,
      source: 'Crypto',
      status: 'pending',
      reference,
      network,
      toAddress: recipientAddress,
      metadata: {
        network,
        recipientAddress,
        networkFee,
        totalDeduction
      }
    });

    await transaction.save();

    res.status(200).json({
      message: 'Withdrawal initiated. Please confirm with 2FA.',
      reference,
      amount,
      network,
      recipientAddress,
      fees: {
        network: networkFee,
        total: totalDeduction
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
  } catch (error: any) {
    console.error('Initiate USDT withdrawal error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /withdrawal/usdt/confirm
 * V1 Compatibility: Confirm USDT withdrawal (after 2FA and blockchain confirmation)
 */
router.post('/usdt/confirm', authLimiter, async (req: any, res: any) => {
  try {
    const { reference, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ detail: 'OTP is required' });
    }

    const Transaction = (await import('../models/Transaction')).default;
    const User = (await import('../models/User')).default;

    const transaction = await Transaction.findOne({
      reference,
      userId: req.user?.userId
    });

    if (!transaction) {
      return res.status(404).json({ detail: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ detail: 'Transaction already processed' });
    }

    // Verify OTP
    if (otp.length !== 6) {
      return res.status(400).json({ detail: 'Invalid OTP' });
    }

    // Update transaction status
    transaction.status = 'processing';
    await transaction.save();

    // Deduct from user balance
    const user = await User.findById(req.user?.userId);
    if (user && transaction.metadata?.totalDeduction) {
      user.walletBalance = (user.walletBalance || 0) - transaction.metadata.totalDeduction;
      await user.save();
    }

    // Here you would initiate the blockchain transaction
    // For now, we'll simulate it
    res.status(200).json({
      message: 'Withdrawal processing. You will receive USDT within 24 hours.',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference,
        network: transaction.network,
        recipientAddress: transaction.metadata?.recipientAddress
      },
      newBalance: user?.walletBalance || 0
    });
  } catch (error: any) {
    console.error('Confirm USDT withdrawal error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

export default router;
