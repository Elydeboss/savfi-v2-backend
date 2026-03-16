import { Request, Response } from 'express';
import SavingsPlan from '../models/SavingsPlan';
import User from '../models/User';
import { createDepositTransaction, sendWithdrawalTransaction } from '../utils/wallet';
import blockchainService from '../services/blockchain.service';
import solendService from '../services/solend.service';

// Extend Express Request type to include user
declare global {
	namespace Express {
		interface Request {
			user?: {
				userId: string;
				email: string;
				role: string;
			};
		}
	}
}

// Plan configurations (minimums and lock periods only - APY comes from Solend)
const PLAN_CONFIGS = {
	vaultfi: { minDeposit: 100, lockPeriod: 365 },
	growfi: { minDeposit: 50, lockPeriod: 180 },
	flexifi: { minDeposit: 25, lockPeriod: 120 },
	swiftfi: { minDeposit: 10, lockPeriod: 0 }
};

// Create a new savings plan with blockchain integration
export const createPlan = async (req: Request, res: Response): Promise<void> => {
	try {
		const { planType, amount } = req.body;
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({ success: false, error: 'User not authenticated' });
			return;
		}

		// Get user
		const user = await User.findById(userId);
		if (!user || !user.phantomWallet) {
			res.status(400).json({
				success: false,
				error: 'Please connect your Phantom wallet first'
			});
			return;
		}

		// Validate plan type
		if (!PLAN_CONFIGS[planType as keyof typeof PLAN_CONFIGS]) {
			res.status(400).json({ success: false, error: 'Invalid plan type' });
			return;
		}

		const config = PLAN_CONFIGS[planType as keyof typeof PLAN_CONFIGS];

		// Validate amount
		if (amount < config.minDeposit) {
			res.status(400).json({
				success: false,
				error: `Minimum deposit for ${planType} is ${config.minDeposit} USDC`
			});
			return;
		}

		// Get current Solend APY and calculate user APY
		const userAPY = await solendService.calculateUserAPY(planType);

		// Calculate dates
		const startDate = new Date();
		const endDate = config.lockPeriod > 0
			? new Date(startDate.getTime() + config.lockPeriod * 24 * 60 * 60 * 1000)
			: undefined;

		// Create unsigned deposit transaction for user to sign
		const { transaction, blockhash } = await createDepositTransaction(
			user.phantomWallet,
			amount
		);

		// Serialize transaction for frontend
		const serializedTransaction = transaction.serialize({
			requireAllSignatures: false,
			verifySignatures: false
		});

		// Create savings plan (pending blockchain confirmation)
		const newPlan = new SavingsPlan({
			userId,
			planType,
			depositAmount: amount,
			currentBalance: 0, // Will be updated after blockchain confirmation
			interestEarned: 0,
			apy: userAPY,
			status: 'pending', // Waiting for blockchain confirmation
			lockPeriod: config.lockPeriod,
			startDate,
			endDate,
			yieldSource: 'solend',
			lastInterestCalculation: new Date(),
			deposits: [],
			withdrawals: [],
			earlyWithdrawalPenalty: 0
		});

		await newPlan.save();

		res.status(201).json({
			success: true,
			message: 'Savings plan created. Please sign the transaction in your wallet.',
			data: {
				plan: newPlan,
				transaction: {
					serialized: Array.from(serializedTransaction),
					blockhash
				}
			}
		});
	} catch (error: any) {
		console.error('Create plan error:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to create savings plan'
		});
	}
};

// Confirm deposit after user signs transaction
export const confirmDeposit = async (req: Request, res: Response): Promise<void> => {
	try {
		const { planId, signature } = req.body;

		if (!planId || !signature) {
			res.status(400).json({ success: false, error: 'planId and signature are required' });
			return;
		}

		// Get plan
		const plan = await SavingsPlan.findById(planId);
		if (!plan) {
			res.status(404).json({ success: false, error: 'Savings plan not found' });
			return;
		}

		// Verify transaction on blockchain
		const result = await blockchainService.verifyDeposit(
			signature,
			planId,
			plan.depositAmount
		);

		if (result.success) {
			res.json({
				success: true,
				message: result.message || 'Deposit confirmed and plan activated',
				data: plan
			});
		} else {
			res.status(400).json({
				success: false,
				error: result.message || 'Failed to confirm deposit'
			});
		}
	} catch (error: any) {
		console.error('Confirm deposit error:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to confirm deposit'
		});
	}
};

// Get all savings plans for the current user
export const getUserPlans = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({ success: false, error: 'User not authenticated' });
			return;
		}

		const plans = await SavingsPlan.find({ userId })
			.sort({ createdAt: -1 });

		// Calculate current interest for active plans
		const plansWithCurrentInterest = plans.map(plan => {
			if (plan.status === 'active') {
				const daysElapsed = Math.floor((Date.now() - new Date(plan.lastInterestCalculation).getTime()) / (1000 * 60 * 60 * 24));
				if (daysElapsed > 0) {
					const dailyRate = plan.apy / 365;
					const interest = plan.currentBalance * dailyRate * daysElapsed;
					return {
						...plan.toObject(),
						pendingInterest: interest
					};
				}
			}
			return plan.toObject();
		});

		res.status(200).json({
			success: true,
			data: plansWithCurrentInterest
		});
	} catch (error) {
		console.error('Get plans error:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch savings plans' });
	}
};

// Add funds to a savings plan
export const addFunds = async (req: Request, res: Response): Promise<void> => {
	try {
		const { planId } = req.params;
		const { amount } = req.body;
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({ success: false, error: 'User not authenticated' });
			return;
		}

		const plan = await SavingsPlan.findOne({ _id: planId, userId });

		if (!plan) {
			res.status(404).json({ success: false, error: 'Savings plan not found' });
			return;
		}

		if (plan.status !== 'active') {
			res.status(400).json({ success: false, error: 'Cannot add funds to inactive plan' });
			return;
		}

		// Add deposit
		plan.deposits.push({
			amount,
			timestamp: new Date()
		});
		plan.depositAmount += amount;
		plan.currentBalance += amount;
		await plan.save();

		res.status(200).json({
			success: true,
			message: 'Funds added successfully',
			data: plan
		});
	} catch (error) {
		console.error('Add funds error:', error);
		res.status(500).json({ success: false, error: 'Failed to add funds' });
	}
};

// Withdraw funds from a savings plan with blockchain integration
export const withdrawFunds = async (req: Request, res: Response): Promise<void> => {
	try {
		const { planId } = req.params;
		const { amount } = req.body;
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({ success: false, error: 'User not authenticated' });
			return;
		}

		// Get user
		const user = await User.findById(userId);
		if (!user || !user.phantomWallet) {
			res.status(400).json({ success: false, error: 'User wallet not found' });
			return;
		}

		const plan = await SavingsPlan.findOne({ _id: planId, userId });

		if (!plan) {
			res.status(404).json({ success: false, error: 'Savings plan not found' });
			return;
		}

		if (amount > plan.currentBalance) {
			res.status(400).json({ success: false, error: 'Insufficient balance' });
			return;
		}

		// Check if plan has matured
		const isMatured = plan.endDate ? new Date() >= new Date(plan.endDate) : true;
		let penalty = 0;

		if (!isMatured && plan.lockPeriod && plan.lockPeriod > 0) {
			// Calculate early withdrawal penalty (10% of interest earned)
			penalty = plan.interestEarned * 0.1;
		}

		const withdrawAmount = amount - penalty;

		// Send withdrawal transaction on blockchain
		const { signature: txSignature } = await sendWithdrawalTransaction(
			user.phantomWallet,
			withdrawAmount
		);

		// Update plan
		plan.withdrawals.push({
			amount: withdrawAmount,
			timestamp: new Date(),
			transactionHash: txSignature,
			penalty
		});
		plan.currentBalance -= amount;

		// If balance is zero, mark as completed
		if (plan.currentBalance === 0) {
			plan.status = 'completed';
		}

		await plan.save();

		res.status(200).json({
			success: true,
			message: penalty > 0
				? `Withdrawal successful. Early withdrawal penalty: $${penalty.toFixed(2)}`
				: 'Withdrawal successful',
			data: plan,
			transactionSignature: txSignature
		});
	} catch (error: any) {
		console.error('Withdraw funds error:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to withdraw funds'
		});
	}
};

// Get savings statistics
export const getStatistics = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({ success: false, error: 'User not authenticated' });
			return;
		}

		const plans = await SavingsPlan.find({
			userId,
			status: { $in: ['active', 'locked'] }
		});

		const totalBalance = plans.reduce((sum, plan) => sum + plan.currentBalance, 0);
		const totalInterest = plans.reduce((sum, plan) => sum + plan.interestEarned, 0);
		const activePlans = plans.length;

		res.status(200).json({
			success: true,
			data: {
				totalBalance,
				totalInterest,
				activePlans
			}
		});
	} catch (error) {
		console.error('Get statistics error:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
	}
};

// Get current APY from Solend
export const getCurrentAPY = async (req: Request, res: Response): Promise<void> => {
	try {
		const apyData = await solendService.getAllPlanAPYs();

		res.status(200).json({
			success: true,
			data: apyData
		});
	} catch (error: any) {
		console.error('Get APY error:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to get current APY'
		});
	}
};
