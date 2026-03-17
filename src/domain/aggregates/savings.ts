/**
 Savings Aggregate
 Defines how Savings Plan state is built from events.
 The fold function applies events to update the aggregate state.
 */

import { createAggregate } from "@evtstore/src/create-aggregate";
import type { SavingsEvt, SavingsAgg } from "../types/savings";
import type { EventMeta, BaseAggregate } from '@evtstore/src/types';

export const savings = createAggregate<SavingsEvt, SavingsAgg, "savings">({
  stream: "savings",

  // Initial state for a new savings plan
  create: () => ({
    userId: "",
    planType: "flexifi",
    depositAmount: 0,
    currentBalance: 0,
    interestEarned: 0,
    apy: 0,
    status: "active",
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
  fold: (evt: SavingsEvt, agg: SavingsAgg & BaseAggregate, meta: EventMeta) => {
    switch (evt.type) {
      // Plan creation
      case "plan-created":
        return {
          userId: evt.userId,
          planType: evt.planType,
          depositAmount: evt.depositAmount,
          currentBalance: evt.depositAmount,
          apy: evt.apy,
          lockPeriod: evt.lockPeriod,
          endDate: evt.lockPeriod
            ? new Date(meta.timestamp.getTime() + evt.lockPeriod * 24 * 60 * 60 * 1000)
            : undefined,
          totalDeposits: 1,
          createdAt: meta.timestamp,
          updatedAt: meta.timestamp,
        };

      case "plan-activated":
        return {
          status: "active",
          blockchainReceipt: evt.transactionHash,
          updatedAt: meta.timestamp,
        };

      // Deposits
      case "deposit-confirmed":
        return {
          currentBalance: agg.currentBalance + evt.amount,
          totalDeposits: agg.totalDeposits + 1,
          updatedAt: meta.timestamp,
        };

      case "deposit-failed":
        return {
          updatedAt: meta.timestamp,
        };

      // Interest
      case "interest-accrued":
        return {
          interestEarned: agg.interestEarned + evt.amount,
          currentBalance: evt.newBalance,
          lastInterestCalculation: evt.calculatedAt,
          updatedAt: meta.timestamp,
        };

      case "interest-paid":
        return {
          updatedAt: meta.timestamp,
          blockchainReceipt: evt.transactionHash,
        };

      // Withdrawals
      case "withdrawal-completed":
        return {
          currentBalance: agg.currentBalance - evt.amount,
          totalWithdrawals: agg.totalWithdrawals + 1,
          earlyWithdrawalPenalty: agg.earlyWithdrawalPenalty + (evt.penalty || 0),
          updatedAt: meta.timestamp,
        };

      case "withdrawal-failed":
        return {
          updatedAt: meta.timestamp,
        };

      case "early-withdrawal-penalty-applied":
        return {
          earlyWithdrawalPenalty: agg.earlyWithdrawalPenalty + evt.penalty,
          status: "penalized",
          updatedAt: meta.timestamp,
        };

      // Plan status changes
      case "plan-completed":
        return {
          status: "completed",
          endDate: evt.endDate,
          currentBalance: evt.finalBalance,
          updatedAt: meta.timestamp,
        };

      case "plan-penalized":
        return {
          status: "penalized",
          earlyWithdrawalPenalty: evt.penaltyAmount,
          updatedAt: meta.timestamp,
        };

      case "plan-closed":
        return {
          status: "withdrawn",
          updatedAt: meta.timestamp,
        };

      // Blockchain operations
      case "blockchain-deposit-confirmed":
      case "blockchain-withdrawal-confirmed":
        return {
          blockchainReceipt: (evt as any).signature || (evt as any).txHash,
          updatedAt: meta.timestamp,
        };

      default:
        return {};
    }
  },
});
