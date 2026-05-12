import crypto from 'crypto';
import { OTP } from '../models/OTP';
import { EmailService } from './email.service';

export class OTPService {
	private static generateOTP(): string {
		// Generate 6-digit OTP
		return crypto.randomInt(100000, 999999).toString();
	}

	static async createAndSendOTP(email: string, type: 'registration' | 'password-reset' | 'email-verification' = 'registration'): Promise<{ success: boolean; message: string }> {
		try {
			// Delete any existing OTP for this email and type
			await OTP.deleteMany({ email, type });

			// Generate new OTP
			const otp = this.generateOTP();
			const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

			// Store OTP in MongoDB
			await OTP.create({
				email,
				otp,
				type,
				expiresAt,
				attempts: 0
			});

			// TODO: Uncomment when email service is configured
			// // Send email
			// await EmailService.sendOTPEmail(email, otp, type);

			// Log OTP to console for development (remove in production)
			console.log(`OTP for ${email} (${type}): ${otp}`);

			return { success: true, message: 'OTP sent successfully' };
		} catch (error) {
			console.error('Create OTP error:', error);
			return { success: false, message: 'Failed to send OTP' };
		}
	}

	static async verifyOTP(email: string, otp: string, type: 'registration' | 'password-reset' | 'email-verification' = 'registration'): Promise<{ valid: boolean; message: string }> {
		try {
			const otpRecord = await OTP.findOne({ email, otp, type });

			if (!otpRecord) {
				return { valid: false, message: 'Invalid or expired OTP' };
			}

			// Check if expired
			if (otpRecord.expiresAt < new Date()) {
				await OTP.deleteOne({ _id: otpRecord._id });
				return { valid: false, message: 'OTP has expired' };
			}

			// Increment attempts
			otpRecord.attempts += 1;
			await otpRecord.save();

			// Check max attempts (3 attempts allowed)
			if (otpRecord.attempts > 3) {
				await OTP.deleteOne({ _id: otpRecord._id });
				return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
			}

			// Delete OTP after successful verification
			await OTP.deleteOne({ _id: otpRecord._id });

			return { valid: true, message: 'OTP verified successfully' };
		} catch (error) {
			console.error('Verify OTP error:', error);
			return { valid: false, message: 'Failed to verify OTP' };
		}
	}
}
