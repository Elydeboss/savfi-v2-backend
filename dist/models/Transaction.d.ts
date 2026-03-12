import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<ITransaction, {}, {}, {}, mongoose.Document<unknown, {}, ITransaction, {}, mongoose.DefaultSchemaOptions> & ITransaction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITransaction>;
export default _default;
//# sourceMappingURL=Transaction.d.ts.map