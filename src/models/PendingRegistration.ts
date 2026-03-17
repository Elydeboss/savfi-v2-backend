import mongoose, { Schema } from 'mongoose';

interface IPendingRegistration {
	email: string;
	username: string;
	password: string; // Will be hashed
	referralCode?: string;
	createdAt: Date;
	expiresAt: Date;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>({
	email: { type: String, required: true, unique: true },
	username: { type: String, required: true },
	password: { type: String, required: true },
	referralCode: { type: String },
	createdAt: { type: Date, default: Date.now },
	expiresAt: { type: Date, required: true }
});

// Auto-delete after 10 minutes
pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingRegistration = mongoose.models.PendingRegistration || mongoose.model<IPendingRegistration>('PendingRegistration', pendingRegistrationSchema);
