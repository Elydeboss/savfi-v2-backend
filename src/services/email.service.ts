import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (!this.transporter) {
      // Configure your email service here
      // Options: Resend, SendGrid, AWS SES, Gmail, etc.
      const transporterConfig = {
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASS || '',
        },
      };

      this.transporter = nodemailer.createTransport(transporterConfig);
    }
    return this.transporter;
  }

  static async sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"SavFi" <noreply@savfi.com>',
        to,
        subject,
        html
      });
      console.log('✅ Email sent:', info.messageId);
    } catch (error) {
      console.error('❌ Email error:', error);
      throw new Error('Failed to send email');
    }
  }

  static async sendOTPEmail(email: string, otp: string, type: string = 'registration'): Promise<void> {
    const subject = type === 'registration'
      ? 'Verify Your SavFi Account - OTP Code'
      : 'Your SavFi Verification Code';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">SavFi</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p>Thank you for signing up with SavFi! To complete your registration, please use the following OTP code:</p>
            <div style="background: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border: 2px dashed #667eea; border-radius: 5px;">
              ${otp}
            </div>
            <p><strong>This code will expire in 10 minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #888;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, html });
  }
}
