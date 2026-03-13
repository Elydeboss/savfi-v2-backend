import express from 'express';
import {
	createPlan,
	getUserPlans,
	addFunds,
	withdrawFunds,
	getStatistics
} from '../controllers/savingsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create a new savings plan
router.post('/create', createPlan);

// Get all savings plans for the current user
router.get('/', getUserPlans);

// Get savings statistics
router.get('/statistics', getStatistics);

// Add funds to a savings plan
router.post('/:planId/deposit', addFunds);

// Withdraw funds from a savings plan
router.post('/:planId/withdraw', withdrawFunds);

export default router;
