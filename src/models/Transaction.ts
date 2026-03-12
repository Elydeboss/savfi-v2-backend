import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'deposit' | 'withdrawal' | 'interest' | 'referral' | 'penalty';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'processing';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  savingsPlanId?: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  transactionHash?: string;
  signature?: string;
  fromAddress?: string;
  toAddress?: string;
  blockchainConfirmed: boolean;
  confirmationCount?: number;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    savingsPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'SavingsPlan',
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'interest', 'referral', 'penalty'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'processing'],
      default: 'pending',
    },
    transactionHash: {
      type: String,
      sparse: true,
    },
    signature: {
      type: String,
    },
    fromAddress: {
      type: String,
    },
    toAddress: {
      type: String,
    },
    blockchainConfirmed: {
      type: Boolean,
      default: false,
    },
    confirmationCount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
transactionSchema.index({ userId: 1 });
transactionSchema.index({ savingsPlanId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ transactionHash: 1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
