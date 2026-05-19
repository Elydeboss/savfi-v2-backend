import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Transactions Routes
 * V1 Compatibility: Handle transaction operations
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /transactions
 * V1 Compatibility: Get user's transaction history
 */
router.get('/', async (req: any, res: any) => {
  try {
    const { limit = 50, offset = 0, type, status } = req.query;

    const Transaction = (await import('../models/Transaction')).default;
    const user = await (await import('../models/User')).default.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Build query
    const query: any = { userId: user._id };

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await Transaction.countDocuments(query);

    // Transform to v1 format
    const v1Transactions = transactions.map((tx: any) => ({
      id: tx._id,
      date: tx.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      source: tx.source || 'Wallet',
      details: {
        planId: tx.planId,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        transactionHash: tx.transactionHash
      }
    }));

    res.status(200).json({
      transactions: v1Transactions,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * GET /transactions/:id
 * V1 Compatibility: Get transaction details
 */
router.get('/:id', async (req: any, res: any) => {
  try {
    const Transaction = (await import('../models/Transaction')).default;
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user?.userId
    });

    if (!transaction) {
      return res.status(404).json({ detail: 'Transaction not found' });
    }

    // Transform to v1 format
    res.status(200).json({
      id: transaction._id,
      date: transaction.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      source: transaction.source || 'Wallet',
      details: {
        planId: transaction.planId,
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress,
        transactionHash: transaction.transactionHash,
        fee: transaction.fee,
        description: transaction.description
      }
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

/**
 * POST /transactions
 * V1 Compatibility: Create a new transaction (internal use)
 */
router.post('/', async (req: any, res: any) => {
  try {
    const { type, amount, source, planId, fromAddress, toAddress, transactionHash } = req.body;

    const Transaction = (await import('../models/Transaction')).default;
    const User = (await import('../models/User')).default;

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Create transaction
    const transaction = new Transaction({
      userId: user._id,
      type,
      amount,
      source: source || 'Wallet',
      planId,
      fromAddress,
      toAddress,
      transactionHash,
      status: 'pending'
    });

    await transaction.save();

    // Transform to v1 format
    res.status(201).json({
      id: transaction._id,
      date: transaction.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      source: transaction.source,
      details: {
        planId: transaction.planId,
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress,
        transactionHash: transaction.transactionHash
      }
    });
  } catch (error: any) {
    console.error('Create transaction error:', error);
    res.status(500).json({ detail: 'Server error' });
  }
});

export default router;
