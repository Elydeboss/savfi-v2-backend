import express from 'express';
import {
	createPlan,
	getUserPlans,
	addFunds,
	withdrawFunds,
	getStatistics,
	confirmDeposit,
	getCurrentAPY
} from '../controllers/savingsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get current APY from Solend (public endpoint for real-time rates)
router.get('/apy', getCurrentAPY);

// Create a new savings plan
router.post('/create', createPlan);

// Confirm deposit after blockchain transaction
router.post('/:planId/deposit/confirm', confirmDeposit);

// Get all savings plans for the current user
router.get('/', getUserPlans);

// Get savings statistics
router.get('/statistics', getStatistics);

// Add funds to a savings plan
router.post('/:planId/deposit', addFunds);

// Withdraw funds from a savings plan
router.post('/:planId/withdraw', withdrawFunds);

export default router;
