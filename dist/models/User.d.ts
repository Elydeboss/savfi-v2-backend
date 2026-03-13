import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    username: string;
    password: string;
    provider?: 'email' | 'google' | 'apple';
    providerId?: string;
    emailVerified?: boolean;
    googleProfile?: {
        id: string;
        email: string;
        name?: string;
        picture?: string;
    };
    appleProfile?: {
        id: string;
        email?: string;
    };
    phantomWallet?: string;
    profilePicture?: string;
    phoneNumber?: string;
    country?: string;
    dateOfBirth?: Date;
    ninVerified: boolean;
    kycVerified: boolean;
    kycDocuments?: {
        idDocumentUrl?: string;
        selfieUrl?: string;
        proofOfAddressUrl?: string;
        submittedAt?: Date;
    };
    referralCode: string;
    referredBy?: string;
    referralEarnings: number;
    role: 'user' | 'admin';
    isActive: boolean;
    isBanned: boolean;
    banReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default _default;
//# sourceMappingURL=User.d.ts.map