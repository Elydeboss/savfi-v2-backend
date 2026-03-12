import mongoose, { Document, Schema } from 'mongoose';

export type PlanType = 'vaultfi' | 'growfi' | 'flexifi' | 'swiftfi';
export type PlanStatus = 'active' | 'completed' | 'withdrawn' | 'penalized';

export interface ISavingsPlan extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planType: PlanType;
  depositAmount: number;
  currentBalance: number;
  interestEarned: number;
  apy: number;
  status: PlanStatus;
  lockPeriod?: number; // in days
  startDate: Date;
  endDate?: Date;
  lastInterestCalculation: Date;
  withdrawals: {
    amount: number;
    timestamp: Date;
    transactionHash?: string;
    penalty?: number;
  }[];
  deposits: {
    amount: number;
    timestamp: Date;
    transactionHash?: string;
  }[];
  earlyWithdrawalPenalty: number;
  blockchainReceipt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const savingsPlanSchema = new Schema<ISavingsPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planType: {
      type: String,
      enum: ['vaultfi', 'growfi', 'flexifi', 'swiftfi'],
      required: true,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    interestEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    apy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'withdrawn', 'penalized'],
      default: 'active',
    },
    lockPeriod: {
      type: Number, // in days
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    lastInterestCalculation: {
      type: Date,
      default: Date.now,
    },
    withdrawals: [
      {
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
        transactionHash: String,
        penalty: Number,
      },
    ],
    deposits: [
      {
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
        transactionHash: String,
      },
    ],
    earlyWithdrawalPenalty: {
      type: Number,
      default: 0,
      min: 0,
    },
    blockchainReceipt: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
savingsPlanSchema.index({ userId: 1 });
savingsPlanSchema.index({ planType: 1 });
savingsPlanSchema.index({ status: 1 });
savingsPlanSchema.index({ createdAt: -1 });

export default mongoose.model<ISavingsPlan>('SavingsPlan', savingsPlanSchema);
