/**
 * Savings Aggregate
 *
 * Defines how Savings Plan state is built from events.
 * The fold function applies events to update the aggregate state.
 */

import { createAggregate } from '@evtstore/src/create-aggregate'
import type { SavingsEvt, SavingsAgg } from '../types/savings'

export const savings = createAggregate<SavingsEvt, SavingsAgg, 'savings'>({
  stream: 'savings',

  // Initial state for a new savings plan
  create: () => ({
    userId: '',
    planType: 'flexifi',
    depositAmount: 0,
    currentBalance: 0,
    interestEarned: 0,
    apy: 0,
    status: 'active',
    lockPeriod: undefined,
    startDate: new Date(),
    endDate: undefined,
    lastInterestCalculation: new Date(),
    totalDeposits: 0,
    totalWithdrawals: 0,
    earlyWithdrawalPenalty: 0,
    blockchainReceipt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  // Fold function: apply events to update state
  fold: (evt: SavingsEvt) => {
    switch (evt.type) {
      // Plan creation
      case 'plan-created':
        return {
          userId: evt.userId,
          planType: evt.planType,
          depositAmount: evt.depositAmount,
          currentBalance: evt.depositAmount,
          interestEarned: 0,
          apy: evt.apy,
          status: 'active',
          lockPeriod: evt.lockPeriod,
          startDate: new Date(),
          endDate: evt.lockPeriod ? new Date(Date.now() + evt.lockPeriod * 24 * 60 * 60 * 1000) : undefined,
          lastInterestCalculation: new Date(),
          totalDeposits: 1,
          totalWithdrawals: 0,
          earlyWithdrawalPenalty: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

      case 'plan-activated':
        return {
          status: 'active',
          blockchainReceipt: evt.transactionHash,
          updatedAt: new Date(),
        }

      // Deposits
      case 'deposit-confirmed':
        return {
          currentBalance: evt.amount, // This would be added to current balance in actual implementation
          totalDeposits: 1, // This would be incremented
          updatedAt: new Date(),
        }

      case 'deposit-failed':
        return {
          updatedAt: new Date(),
        }

      // Interest
      case 'interest-accrued':
        return {
          interestEarned: evt.amount,
          currentBalance: evt.newBalance,
          lastInterestCalculation: evt.calculatedAt,
          updatedAt: new Date(),
        }

      case 'interest-paid':
        return {
          updatedAt: new Date(),
          blockchainReceipt: evt.transactionHash,
        }

      // Withdrawals
      case 'withdrawal-completed':
        return {
          currentBalance: evt.amount, // This would be subtracted in actual implementation
          totalWithdrawals: 1, // This would be incremented
          earlyWithdrawalPenalty: evt.penalty || 0,
          updatedAt: new Date(),
        }

      case 'withdrawal-failed':
        return {
          updatedAt: new Date(),
        }

      case 'early-withdrawal-penalty-applied':
        return {
          earlyWithdrawalPenalty: evt.penalty,
          status: 'penalized',
          updatedAt: new Date(),
        }

      // Plan status changes
      case 'plan-completed':
        return {
          status: 'completed',
          endDate: evt.endDate,
          currentBalance: evt.finalBalance,
          updatedAt: new Date(),
        }

      case 'plan-penalized':
        return {
          status: 'penalized',
          earlyWithdrawalPenalty: evt.penaltyAmount,
          updatedAt: new Date(),
        }

      case 'plan-closed':
        return {
          status: 'withdrawn',
          updatedAt: new Date(),
        }

      // Blockchain operations
      case 'blockchain-deposit-confirmed':
      case 'blockchain-withdrawal-confirmed':
        return {
          blockchainReceipt: evt.signature || evt.txHash,
          updatedAt: new Date(),
        }

      default:
        return {}
    }
  },
})
