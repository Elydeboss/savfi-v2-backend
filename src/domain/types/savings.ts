/**
 * Savings Domain Types
 *
 * Defines the events, aggregates, and commands for savings plan operations.
 * Supports all SavFi plan types: vaultfi, growfi, flexifi, swiftfi
 */

// ============================================================================
// SAVINGS AGGREGATE (Current State)
// ============================================================================
export type SavingsAgg = {
  userId: string
  planType: 'vaultfi' | 'growfi' | 'flexifi' | 'swiftfi'
  depositAmount: number
  currentBalance: number
  interestEarned: number
  apy: number
  status: 'active' | 'completed' | 'withdrawn' | 'penalized'
  lockPeriod?: number // in days
  startDate: Date
  endDate?: Date
  lastInterestCalculation: Date
  totalDeposits: number
  totalWithdrawals: number
  earlyWithdrawalPenalty: number
  blockchainReceipt?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SAVINGS EVENTS (What happened)
// ============================================================================
export type SavingsEvt =
  // Plan creation
  | { type: 'plan-created'; userId: string; planType: 'vaultfi' | 'growfi' | 'flexifi' | 'swiftfi'; depositAmount: number; apy: number; lockPeriod?: number }
  | { type: 'plan-activated'; transactionHash?: string }

  // Deposits
  | { type: 'deposit-added'; amount: number; transactionHash?: string; timestamp: Date }
  | { type: 'deposit-confirmed'; amount: number; transactionHash: string; timestamp: Date }
  | { type: 'deposit-failed'; amount: number; reason: string; timestamp: Date }

  // Interest
  | { type: 'interest-accrued'; amount: number; calculatedAt: Date; newBalance: number }
  | { type: 'interest-paid'; amount: number; transactionHash?: string }

  // Withdrawals
  | { type: 'withdrawal-initiated'; amount: number; timestamp: Date }
  | { type: 'withdrawal-completed'; amount: number; transactionHash?: string; penalty?: number; timestamp: Date }
  | { type: 'withdrawal-failed'; amount: number; reason: string; timestamp: Date }
  | { type: 'early-withdrawal-penalty-applied'; penalty: number; reason: string }

  // Plan status changes
  | { type: 'plan-completed'; endDate: Date; finalBalance: number }
  | { type: 'plan-penalized'; reason: string; penaltyAmount: number }
  | { type: 'plan-closed'; closedBy: string; reason?: string }

  // Blockchain operations
  | { type: 'blockchain-deposit-started'; txHash: string; amount: number }
  | { type: 'blockchain-deposit-confirmed'; txHash: string; amount: number; signature?: string }
  | { type: 'blockchain-withdrawal-started'; txHash: string; amount: number }
  | { type: 'blockchain-withdrawal-confirmed'; txHash: string; amount: number; signature?: string }

// ============================================================================
// SAVINGS COMMANDS (Actions to take)
// ============================================================================
export type SavingsCmd =
  | { type: 'create-plan'; userId: string; planType: 'vaultfi' | 'growfi' | 'flexifi' | 'swiftfi'; depositAmount: number; apy: number; lockPeriod?: number }
  | { type: 'activate-plan'; transactionHash?: string }
  | { type: 'add-deposit'; amount: number; transactionHash?: string }
  | { type: 'confirm-deposit'; amount: number; transactionHash: string }
  | { type: 'initiate-withdrawal'; amount: number }
  | { type: 'complete-withdrawal'; amount: number; transactionHash?: string }
  | { type: 'accrue-interest'; amount: number; calculatedAt: Date }
  | { type: 'complete-plan'; endDate: Date }
  | { type: 'apply-penalty'; penaltyAmount: number; reason: string }
  | { type: 'close-plan'; closedBy: string; reason?: string }
