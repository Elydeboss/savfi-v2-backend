/**
 * Savings Command Handlers
 *
 * Command handlers validate business rules and produce events for savings operations.
 */

import { createCommands } from '@evtstore/src/create-command'
import type { BaseAggregate, ProvidedAggregate } from '@evtstore/src/types'
import type { SavingsEvt, SavingsAgg, SavingsCmd } from '../types/savings'

// Type alias for the full aggregate with base properties
export type SavingsAggregate = SavingsAgg & BaseAggregate

/**
 * Plan type configurations
 */
const PLAN_CONFIGS = {
  vaultfi: { minDeposit: 100, minLockPeriod: 30, defaultAPY: 12 },
  growfi: { minDeposit: 50, minLockPeriod: 90, defaultAPY: 15 },
  flexifi: { minDeposit: 10, minLockPeriod: 0, defaultAPY: 8 },
  swiftfi: { minDeposit: 20, minLockPeriod: 7, defaultAPY: 5 },
}

/**
 * Create savings command handlers
 */
export function createSavingsCommands(savingsAggregate: ProvidedAggregate<SavingsEvt, SavingsAgg>) {
  return createCommands<SavingsEvt, SavingsAgg, SavingsCmd>(savingsAggregate, {
    // Create a new savings plan
    'create-plan': async (cmd, agg) => {
      // Business rule: Plan cannot already exist
      if (agg.version > 0) {
        throw new Error('Savings plan already exists')
      }

      // Validate plan type
      if (!PLAN_CONFIGS[cmd.planType]) {
        throw new Error(`Invalid plan type: ${cmd.planType}`)
      }

      const config = PLAN_CONFIGS[cmd.planType]

      // Business rule: Minimum deposit
      if (cmd.depositAmount < config.minDeposit) {
        throw new Error(`${cmd.planType} requires minimum deposit of $${config.minDeposit}`)
      }

      // Business rule: Lock period validation
      if (cmd.planType !== 'flexifi' && (!cmd.lockPeriod || cmd.lockPeriod < config.minLockPeriod)) {
        throw new Error(`${cmd.planType} requires minimum lock period of ${config.minLockPeriod} days`)
      }

      // Business rule: APY validation
      if (cmd.apy < 0 || cmd.apy > 100) {
        throw new Error('APY must be between 0 and 100')
      }

      return {
        type: 'plan-created',
        userId: cmd.userId,
        planType: cmd.planType,
        depositAmount: cmd.depositAmount,
        apy: cmd.apy || config.defaultAPY,
        lockPeriod: cmd.lockPeriod,
      }
    },

    // Activate plan
    'activate-plan': async (_cmd, agg) => {
      if (agg.status !== 'active') {
        throw new Error('Plan must be active to activate')
      }

      return {
        type: 'plan-activated',
        transactionHash: _cmd.transactionHash,
      }
    },

    // Add deposit
    'add-deposit': async (cmd, agg) => {
      if (agg.status !== 'active') {
        throw new Error('Can only deposit to active plans')
      }

      if (cmd.amount <= 0) {
        throw new Error('Deposit amount must be positive')
      }

      return {
        type: 'deposit-added',
        amount: cmd.amount,
        transactionHash: cmd.transactionHash,
        timestamp: new Date(),
      }
    },

    // Confirm deposit
    'confirm-deposit': async (cmd, _agg) => {
      if (!cmd.transactionHash) {
        throw new Error('Transaction hash is required')
      }

      return {
        type: 'deposit-confirmed',
        amount: cmd.amount,
        transactionHash: cmd.transactionHash,
        timestamp: new Date(),
      }
    },

    // Initiate withdrawal
    'initiate-withdrawal': async (cmd, agg) => {
      if (agg.status !== 'active') {
        throw new Error('Can only withdraw from active plans')
      }

      if (cmd.amount <= 0) {
        throw new Error('Withdrawal amount must be positive')
      }

      if (cmd.amount > agg.currentBalance) {
        throw new Error('Insufficient balance')
      }

      return {
        type: 'withdrawal-initiated',
        amount: cmd.amount,
        timestamp: new Date(),
      }
    },

    // Complete withdrawal
    'complete-withdrawal': async (cmd, agg) => {
      if (cmd.amount <= 0) {
        throw new Error('Withdrawal amount must be positive')
      }

      if (cmd.amount > agg.currentBalance) {
        throw new Error('Insufficient balance')
      }

      // Check for early withdrawal penalty
      let penalty = 0
      if (agg.lockPeriod && agg.endDate) {
        const now = new Date()
        if (now < agg.endDate && agg.planType !== 'flexifi') {
          // Calculate early withdrawal penalty
          const daysRemaining = Math.ceil((agg.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          penalty = (cmd.amount * 0.05) + (daysRemaining * 0.01 * cmd.amount)
          penalty = Math.min(penalty, cmd.amount * 0.2) // Max 20% penalty
        }
      }

      return {
        type: 'withdrawal-completed',
        amount: cmd.amount,
        transactionHash: cmd.transactionHash,
        penalty: penalty > 0 ? penalty : undefined,
        timestamp: new Date(),
      }
    },

    // Accrue interest
    'accrue-interest': async (cmd, agg) => {
      if (agg.status !== 'active') {
        throw new Error('Can only accrue interest on active plans')
      }

      if (cmd.amount <= 0) {
        throw new Error('Interest amount must be positive')
      }

      const newBalance = agg.currentBalance + cmd.amount

      return {
        type: 'interest-accrued',
        amount: cmd.amount,
        calculatedAt: cmd.calculatedAt,
        newBalance,
      }
    },

    // Complete plan
    'complete-plan': async (cmd, agg) => {
      if (agg.status !== 'active') {
        throw new Error('Plan is not active')
      }

      return {
        type: 'plan-completed',
        endDate: cmd.endDate,
        finalBalance: agg.currentBalance + agg.interestEarned,
      }
    },

    // Apply penalty
    'apply-penalty': async (cmd, agg) => {
      if (agg.status !== 'active') {
        throw new Error('Can only apply penalty to active plans')
      }

      return {
        type: 'plan-penalized',
        reason: cmd.reason,
        penaltyAmount: cmd.penaltyAmount,
      }
    },

    // Close plan
    'close-plan': async (cmd, agg) => {
      if (agg.status !== 'active' && agg.status !== 'penalized') {
        throw new Error('Plan cannot be closed')
      }

      return {
        type: 'plan-closed',
        closedBy: cmd.closedBy,
        reason: cmd.reason,
      }
    },
  })
}
