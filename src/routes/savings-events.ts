/**
 * Savings Routes using EvtStore Commands
 *
 * These routes use the event sourcing command handlers for savings operations.
 * All state changes go through commands that emit events.
 */

import { Router } from 'express'
import { getSavingsCommands, getSavingsAggregate } from '../domain/domain'

const router = Router()

// ============================================================================
// SAVINGS PLAN ROUTES
// ============================================================================

/**
 * POST /api/savings/plans
 * Create a new savings plan
 */
router.post('/plans', async (req, res) => {
  try {
    const { userId, planType, depositAmount, apy, lockPeriod } = req.body

    const savingsCommands = await getSavingsCommands()
    const plan = await savingsCommands['create-plan'](userId, {
      userId,
      planType,
      depositAmount,
      apy,
      lockPeriod,
    })

    res.status(201).json({
      success: true,
      data: {
        id: plan.aggregateId,
        userId: plan.userId,
        planType: plan.planType,
        depositAmount: plan.depositAmount,
        currentBalance: plan.currentBalance,
        apy: plan.apy,
        status: plan.status,
        startDate: plan.startDate,
        endDate: plan.endDate,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/savings/plans/:planId
 * Get savings plan by ID
 */
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params
    const savingsAggregate = await getSavingsAggregate()
    const plan = await savingsAggregate.getAggregate(planId)

    res.json({
      success: true,
      data: {
        id: plan.aggregateId,
        userId: plan.userId,
        planType: plan.planType,
        depositAmount: plan.depositAmount,
        currentBalance: plan.currentBalance,
        interestEarned: plan.interestEarned,
        apy: plan.apy,
        status: plan.status,
        lockPeriod: plan.lockPeriod,
        startDate: plan.startDate,
        endDate: plan.endDate,
        totalDeposits: plan.totalDeposits,
        totalWithdrawals: plan.totalWithdrawals,
        earlyWithdrawalPenalty: plan.earlyWithdrawalPenalty,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      },
    })
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Plan not found',
    })
  }
})

/**
 * POST /api/savings/plans/:planId/deposit
 * Add deposit to savings plan
 */
router.post('/plans/:planId/deposit', async (req, res) => {
  try {
    const { planId } = req.params
    const { amount, transactionHash } = req.body

    const savingsCommands = await getSavingsCommands()
    const plan = await savingsCommands['add-deposit'](planId, {
      amount,
      transactionHash,
    })

    res.json({
      success: true,
      data: {
        id: plan.aggregateId,
        currentBalance: plan.currentBalance,
        updatedAt: plan.updatedAt,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/savings/plans/:planId/withdraw
 * Initiate withdrawal from savings plan
 */
router.post('/plans/:planId/withdraw', async (req, res) => {
  try {
    const { planId } = req.params
    const { amount, transactionHash } = req.body

    const savingsCommands = await getSavingsCommands()
    const plan = await savingsCommands['complete-withdrawal'](planId, {
      amount,
      transactionHash,
    })

    res.json({
      success: true,
      data: {
        id: plan.aggregateId,
        currentBalance: plan.currentBalance,
        earlyWithdrawalPenalty: plan.earlyWithdrawalPenalty,
        updatedAt: plan.updatedAt,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/savings/plans/:planId/interest
 * Accrue interest on savings plan
 */
router.post('/plans/:planId/interest', async (req, res) => {
  try {
    const { planId } = req.params
    const { amount } = req.body

    const savingsCommands = await getSavingsCommands()
    const plan = await savingsCommands['accrue-interest'](planId, {
      amount,
      calculatedAt: new Date(),
    })

    res.json({
      success: true,
      data: {
        id: plan.aggregateId,
        currentBalance: plan.currentBalance,
        interestEarned: plan.interestEarned,
        lastInterestCalculation: plan.lastInterestCalculation,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/savings/plans/:planId/complete
 * Complete a savings plan
 */
router.post('/plans/:planId/complete', async (req, res) => {
  try {
    const { planId } = req.params
    const { endDate } = req.body

    const savingsCommands = await getSavingsCommands()
    const plan = await savingsCommands['complete-plan'](planId, {
      endDate: new Date(endDate),
    })

    res.json({
      success: true,
      data: {
        id: plan.aggregateId,
        status: plan.status,
        endDate: plan.endDate,
        currentBalance: plan.currentBalance,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/savings/plans/:planId/penalty
 * Apply penalty to savings plan (admin only)
 */
router.post('/plans/:planId/penalty', async (req, res) => {
  try {
    const { planId } = req.params
    const { penaltyAmount, reason } = req.body

    const savingsCommands = await getSavingsCommands()
    const plan = await savingsCommands['apply-penalty'](planId, {
      penaltyAmount,
      reason,
    })

    res.json({
      success: true,
      data: {
        id: plan.aggregateId,
        status: plan.status,
        earlyWithdrawalPenalty: plan.earlyWithdrawalPenalty,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/savings/plans/:planId/close
 * Close a savings plan (admin only)
 */
router.post('/plans/:planId/close', async (req, res) => {
  try {
    const { planId } = req.params
    const { closedBy, reason } = req.body

    const savingsCommands = await getSavingsCommands()
    const plan = await savingsCommands['close-plan'](planId, {
      closedBy,
      reason,
    })

    res.json({
      success: true,
      data: {
        id: plan.aggregateId,
        status: plan.status,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
