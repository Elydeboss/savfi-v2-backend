import mongoose, { Schema, Model } from 'mongoose';

interface IOTP {
	email: string;
	otp: string;
	type: 'registration' | 'password-reset' | 'email-verification';
	expiresAt: Date;
	attempts: number;
	createdAt: Date;
}

const otpSchema = new Schema<IOTP>({
	email: { type: String, required: true, index: true },
	otp: { type: String, required: true },
	type: { type: String, enum: ['registration', 'password-reset', 'email-verification'], default: 'registration' },
	// TTL index - auto-deletes documents when expiresAt is reached
	expiresAt: { type: Date, required: true, index: true, expires: 0 },
	attempts: { type: Number, default: 0 },
	createdAt: { type: Date, default: Date.now }
});

export const OTP = mongoose.models.OTP || mongoose.model<IOTP>('OTP', otpSchema);
