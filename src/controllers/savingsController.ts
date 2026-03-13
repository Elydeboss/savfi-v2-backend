import { Request, Response } from 'express';
import SavingsPlan from '../models/SavingsPlan';
import User from '../models/User';

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

// Plan configurations
const PLAN_CONFIGS = {
	vaultfi: { apy: 0.08, minDeposit: 100, lockPeriod: 365 },
	growfi: { apy: 0.04, minDeposit: 50, lockPeriod: 180 },
	flexifi: { apy: 0.02, minDeposit: 25, lockPeriod: 120 },
	swiftfi: { apy: 0.00, minDeposit: 10, lockPeriod: 0 }
};

// Create a new savings plan
export const createPlan = async (req: Request, res: Response): Promise<void> => {
	try {
		const { planType, amount } = req.body;
		const userId = req.user?.userId;

		if (!userId) {
			res.status(401).json({ success: false, error: 'User not authenticated' });
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
				error: `Minimum deposit for ${planType} is ${config.minDeposit}`
			});
			return;
		}

		// Check if user already has an active plan of this type
		const existingPlan = await SavingsPlan.findOne({
			userId,
			planType,
			status: { $in: ['active', 'locked'] }
		});

		if (existingPlan) {
			// Add funds to existing plan
			existingPlan.deposits.push({
				amount,
				timestamp: new Date()
			});
			existingPlan.depositAmount += amount;
			existingPlan.currentBalance += amount;
			await existingPlan.save();

			res.status(200).json({
				success: true,
				message: 'Funds added to existing plan',
				data: existingPlan
			});
			return;
		}

		// Calculate end date
		const startDate = new Date();
		const endDate = config.lockPeriod > 0
			? new Date(startDate.getTime() + config.lockPeriod * 24 * 60 * 60 * 1000)
			: undefined;

		// Create new savings plan
		const newPlan = new SavingsPlan({
			userId,
			planType,
			depositAmount: amount,
			currentBalance: amount,
			interestEarned: 0,
			apy: config.apy,
			status: config.lockPeriod > 0 ? 'active' : 'active',
			lockPeriod: config.lockPeriod,
			startDate,
			endDate,
			lastInterestCalculation: new Date(),
			deposits: [{
				amount,
				timestamp: new Date()
			}],
			earlyWithdrawalPenalty: 0
		});

		await newPlan.save();

		res.status(201).json({
			success: true,
			message: 'Savings plan created successfully',
			data: newPlan
		});
	} catch (error) {
		console.error('Create plan error:', error);
		res.status(500).json({ success: false, error: 'Failed to create savings plan' });
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

// Withdraw funds from a savings plan
export const withdrawFunds = async (req: Request, res: Response): Promise<void> => {
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

		if (amount > plan.currentBalance) {
			res.status(400).json({ success: false, error: 'Insufficient balance' });
			return;
		}

		// Check if plan has matured
		const isMatured = plan.endDate ? new Date() > new Date(plan.endDate) : true;
		let penalty = 0;

		if (!isMatured && plan.lockPeriod && plan.lockPeriod > 0) {
			// Calculate early withdrawal penalty (10% of interest earned)
			penalty = plan.interestEarned * 0.1;
		}

		const withdrawAmount = amount - penalty;

		// Add withdrawal record
		plan.withdrawals.push({
			amount: withdrawAmount,
			timestamp: new Date(),
			penalty
		});
		plan.currentBalance -= amount;

		// If balance is zero, mark as withdrawn
		if (plan.currentBalance === 0) {
			plan.status = 'withdrawn';
		}

		await plan.save();

		res.status(200).json({
			success: true,
			message: penalty > 0
				? `Withdrawal successful. Early withdrawal penalty: $${penalty.toFixed(2)}`
				: 'Withdrawal successful',
			data: plan
		});
	} catch (error) {
		console.error('Withdraw funds error:', error);
		res.status(500).json({ success: false, error: 'Failed to withdraw funds' });
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
