import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
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
  walletAddress?: string;
  walletBalance?: number;
  profilePicture?: string;
  phoneNumber?: string;
  country?: string;
  state?: string;
  bio?: string;
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

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    provider: {
      type: String,
      enum: ['email', 'google', 'apple'],
      default: 'email',
    },
    providerId: {
      type: String,
      sparse: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    googleProfile: {
      id: String,
      email: String,
      name: String,
      picture: String,
    },
    appleProfile: {
      id: String,
      email: String,
    },
    phantomWallet: {
      type: String,
      sparse: true,
      trim: true,
    },
    walletAddress: {
      type: String,
      sparse: true,
      trim: true,
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    profilePicture: {
      type: String,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    ninVerified: {
      type: Boolean,
      default: false,
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    kycDocuments: {
      idDocumentUrl: String,
      selfieUrl: String,
      proofOfAddressUrl: String,
      submittedAt: Date,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    referredBy: {
      type: String,
      trim: true,
    },
    referralEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Note: unique indexes are automatically created for fields with unique: true
// Additional indexes for complex queries can be added here

export default mongoose.model<IUser>('User', userSchema);
