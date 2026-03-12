import mongoose, { Document } from 'mongoose';
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
    lockPeriod?: number;
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
declare const _default: mongoose.Model<ISavingsPlan, {}, {}, {}, mongoose.Document<unknown, {}, ISavingsPlan, {}, mongoose.DefaultSchemaOptions> & ISavingsPlan & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISavingsPlan>;
export default _default;
//# sourceMappingURL=SavingsPlan.d.ts.map