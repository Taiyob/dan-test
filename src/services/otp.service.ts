// src/modules/OTP/otp.service.ts
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { AppLogger } from '@/core/logging/logger';
import { SESEmailService } from '@/services/SESEmailService';
import { BadRequestError } from '@/core/errors/AppError';
import cron from 'node-cron';

export interface OTPData {
    id: string;
    identifier: string; // email only for auth purposes
    code: number;
    type: OTPType;
    expiresAt: Date;
    verified: boolean;
    attempts: number;
    createdAt: Date;
    updatedAt: Date;
    userId?: string;
}

export enum OTPType {
    email_verification = 'email_verification',
    login_verification = 'login_verification',
    password_reset = 'password_reset',
    two_factor = 'two_factor',
}

export interface SendOTPInput {
    identifier: string; // email address
    type: OTPType;
    userId?: string;
}

export interface VerifyOTPInput {
    identifier: string;
    code: string;
    type: OTPType;
}

export interface OTPResult {
    success: boolean;
    message: string;
    expiresAt?: Date;
    attemptsRemaining?: number;
}

export class OTPService {
    private readonly OTP_LENGTH = 6;
    private readonly OTP_EXPIRY_MINUTES = 15;
    private readonly MAX_ATTEMPTS = 3;
    private readonly MAX_SENDS_PER_HOUR = 3;
    private readonly RESEND_COOLDOWN_MINUTES = 2;
    private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; 

    private prisma: PrismaClient;
    private emailService: SESEmailService;

    constructor(prisma: PrismaClient, emailService: SESEmailService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.setupCleanupJob();
    }

    private setupCleanupJob(): void {
        cron.schedule('*/20 * * * *', async () => {
            try {
                AppLogger.info('Running scheduled OTP cleanup...');
                const deletedCount = await this.cleanupExpiredOTPs();
                AppLogger.info('Scheduled OTP cleanup completed', { deletedCount });
            } catch (error) {
                AppLogger.error('Error during scheduled OTP cleanup', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });
    }

    // Helper method to extract email string from identifier
    private getEmailFromIdentifier(identifier: string | { email: string }): string {
        return typeof identifier === 'string' ? identifier : identifier.email;
    }

    /**
     * Generate and send OTP with enhanced spam prevention
     */
    async sendOTP(data: SendOTPInput): Promise<OTPResult> {
        const { identifier, type, userId } = data;

        // ✅ Extract email string from identifier
        const email = this.getEmailFromIdentifier(identifier);

        // Check rate limiting (hourly limit)
        await this.checkRateLimit(email, type);

        // Check if there's a recent OTP that hasn't expired (prevent spam)
        await this.checkRecentOTP(email, type);

        // Clean up any existing OTPs for this identifier and type
        await this.cleanupExistingOTPs(email, type);

        // Generate OTP code
        const code = this.generateOTPCode();
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        // Save OTP to database
        const otpRecord = await this.prisma.oTP.create({
            data: {
                identifier: email,
                code: code,
                type: type,
                expiresAt: expiresAt,
                verified: false,
                attempts: 0,
                userId: userId,
            },
        });

        // Send OTP via email
        try {
            await this.sendOTPEmail(email, code, type, expiresAt);

            AppLogger.info('OTP sent successfully', {
                identifier: this.maskEmail(email),
                type,
                userId,
                expiresAt,
            });

            return {
                success: true,
                message: 'OTP sent successfully to your email',
                expiresAt,
                attemptsRemaining: this.MAX_ATTEMPTS,
            };
        } catch (error) {
            // If email sending fails, delete the OTP record
            await this.prisma.oTP.delete({
                where: { id: otpRecord.id },
            });

            AppLogger.error('Failed to send OTP email', {
                error: error instanceof Error ? error.message : 'Unknown error',
                identifier: this.maskEmail(email),
                type,
            });
            throw new BadRequestError('Failed to send OTP. Please try again.');
        }
    }

    /**
     * Verify OTP code and delete after successful verification
     */
    async verifyOTP(data: VerifyOTPInput): Promise<OTPResult> {
        const { identifier, code, type } = data;
        const email = this.getEmailFromIdentifier(identifier);

        // Convert string code to number for comparison
        const numericCode = parseInt(code, 10);
        if (isNaN(numericCode) || numericCode < 100000 || numericCode > 999999) {
            throw new BadRequestError('Invalid OTP format. Please enter a 6-digit code.');
        }

        // Find the OTP record
        const otpRecord = await this.prisma.oTP.findFirst({
            where: {
                identifier: email,
                type,
                verified: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!otpRecord) {
            throw new BadRequestError('Invalid or expired OTP');
        }

        // Check if OTP has expired
        if (new Date() > otpRecord.expiresAt) {
            // Update OTP record
            await this.prisma.oTP.update({
                where: { id: otpRecord.id },
                data: { verified: true },
            });

            throw new BadRequestError('OTP has expired. Please request a new one.');
        }

        // Check if max attempts exceeded
        if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
            // Delete OTP after max attempts
            await this.prisma.oTP.delete({
                where: { id: otpRecord.id },
            });
            throw new BadRequestError(
                'Maximum verification attempts exceeded. Please request a new OTP.'
            );
        }

        // Verify the code
        if (otpRecord.code !== numericCode) {
            // Increment attempts
            const newAttempts = otpRecord.attempts + 1;

            if (newAttempts >= this.MAX_ATTEMPTS) {
                // Delete OTP after max attempts reached
                await this.prisma.oTP.delete({
                    where: { id: otpRecord.id },
                });
                throw new BadRequestError(
                    'Maximum verification attempts exceeded. Please request a new OTP.'
                );
            }

            await this.prisma.oTP.update({
                where: { id: otpRecord.id },
                data: { attempts: newAttempts },
            });

            const attemptsRemaining = this.MAX_ATTEMPTS - newAttempts;
            throw new BadRequestError(`Invalid OTP code. ${attemptsRemaining} attempts remaining.`);
        }

        // OTP is valid - delete it after successful verification
        if (type === OTPType.password_reset || type === OTPType.two_factor) {
            // Keep record but mark as verified
            await this.prisma.oTP.update({
                where: { id: otpRecord.id },
                data: { verified: true },
            });

            AppLogger.info('OTP verified and marked as verified (kept in DB)', {
                identifier: this.maskEmail(email),
                type,
            });
        } else {
            // For email verification & login OTP → delete after verification
            await this.prisma.oTP.delete({
                where: { id: otpRecord.id },
            });

            AppLogger.info('OTP verified and deleted', {
                identifier: this.maskEmail(email),
                type,
            });
        }

        AppLogger.info('OTP verified and deleted successfully', {
            identifier: this.maskEmail(email),
            type,
        });

        return {
            success: true,
            message: 'OTP verified successfully',
        };
    }

    /**
     * Check if user has a valid pending OTP (for UI state management)
     */
    async hasPendingOTP(identifier: string, type: OTPType): Promise<boolean> {
        const existingOTP = await this.prisma.oTP.findFirst({
            where: {
                identifier,
                type,
                verified: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!existingOTP) return false;

        // Check if expired
        if (new Date() > existingOTP.expiresAt) {
            // Clean up expired OTP
            await this.prisma.oTP.delete({
                where: { id: existingOTP.id },
            });
            return false;
        }

        return true;
    }

    /**
     * Get remaining time for current OTP
     */
    async getOTPExpiryInfo(
        identifier: string,
        type: OTPType
    ): Promise<{ expiresAt: Date; minutesRemaining: number } | null> {
        const existingOTP = await this.prisma.oTP.findFirst({
            where: {
                identifier,
                type,
                verified: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!existingOTP) return null;

        if (new Date() > existingOTP.expiresAt) {
            await this.prisma.oTP.delete({
                where: { id: existingOTP.id },
            });
            return null;
        }

        const minutesRemaining = Math.ceil((existingOTP.expiresAt.getTime() - Date.now()) / 60000);
        return {
            expiresAt: existingOTP.expiresAt,
            minutesRemaining,
        };
    }

    /**
     * Clean up expired OTPs (call this periodically or on app startup)
     */
    async cleanupExpiredOTPs(): Promise<number> {
        const now = new Date();

        const result = await this.prisma.oTP.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: now } },
                    {
                        createdAt: {
                            lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours old
                        },
                    },
                ],
            },
        });

        if (result.count > 0) {
            AppLogger.info('Cleaned up expired/old OTPs', { deletedCount: result.count });
        }

        return result.count;
    }

    /**
     * Emergency cleanup - delete all OTPs for a specific user (useful for account deletion)
     */
    async cleanupUserOTPs(identifier: string): Promise<number> {
        const result = await this.prisma.oTP.deleteMany({
            where: { identifier },
        });

        AppLogger.info('Cleaned up user OTPs', {
            identifier: this.maskEmail(identifier),
            deletedCount: result.count,
        });

        return result.count;
    }

    // Private helper methods

    private generateOTPCode(): number {
        return crypto.randomInt(100000, 999999);
    }

    /**
     * Fixed rate limiting check
     */
    private async checkRateLimit(identifier: string, type: OTPType): Promise<void> {
        const oneHourAgo = new Date(Date.now() - this.RATE_LIMIT_WINDOW);

        // ✅ Fixed: Use identifier directly as a string
        const recentOTPs = await this.prisma.oTP.count({
            where: {
                identifier: identifier, // Simple string field, not nested object
                type,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentOTPs >= this.MAX_SENDS_PER_HOUR) {
            throw new BadRequestError(
                `Too many OTP requests. Please wait an hour before requesting another OTP.`
            );
        }
    }

    private async checkRecentOTP(identifier: string, type: OTPType): Promise<void> {
        const cooldownTime = new Date(Date.now() - this.RESEND_COOLDOWN_MINUTES * 60 * 1000);

        const recentOTP = await this.prisma.oTP.findFirst({
            where: {
                identifier: identifier,
                type,
                verified: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (recentOTP && recentOTP.createdAt > cooldownTime) {
            const waitTime = Math.ceil(
                (recentOTP.createdAt.getTime() +
                    this.RESEND_COOLDOWN_MINUTES * 60 * 1000 -
                    Date.now()) /
                    60000
            );
            throw new BadRequestError(
                `Please wait ${waitTime} minute${
                    waitTime > 1 ? 's' : ''
                } before requesting a new OTP.`
            );
        }
    }

    private async cleanupExistingOTPs(identifier: string, type: OTPType): Promise<void> {
        await this.prisma.oTP.deleteMany({
            where: {
                identifier: identifier,
                type,
            },
        });
    }

    private async sendOTPEmail(
        email: string,
        code: number,
        type: OTPType,
        expiresAt: Date
    ): Promise<void> {
        const templates = {
            [OTPType.email_verification]: {
                subject: 'Verify Your Email Address',
                title: 'Email Verification',
                icon: '🔐',
                message: 'Please verify your email address to complete your registration.',
            },
            [OTPType.login_verification]: {
                subject: 'Login Verification Code',
                title: 'Login Verification',
                icon: '🔑',
                message: 'Use this code to complete your secure login.',
            },
            [OTPType.password_reset]: {
                subject: 'Password Reset Code',
                title: 'Password Reset',
                icon: '🔄',
                message: 'Use this code to reset your password securely.',
            },
            [OTPType.two_factor]: {
                subject: 'Two-Factor Authentication Code',
                title: 'Two-Factor Authentication',
                icon: '🛡️',
                message: 'Use this code to complete your two-factor authentication.',
            },
        };

        const template = templates[type];
        const expiryMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / 60000);

        const htmlContent = this.generateEmailHTML(code, template, expiryMinutes, email);

        await this.emailService.sendEmail({
            to: email,
            subject: template.subject,
            html: htmlContent,
            text: `Your verification code is: ${code}. This code expires in ${expiryMinutes} minutes.`,
        });
    }

    private generateEmailHTML(
        code: number,
        template: { title: string; icon: string; message: string },
        expiryMinutes: number,
        email: string
    ): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               line-height: 1.6; color: #333; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 20px auto; background: white; 
                     border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 16px; margin-bottom: 20px; }
        .code-section { text-align: center; margin: 30px 0; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 6px; 
                color: #667eea; padding: 20px 30px; border: 2px dashed #667eea; 
                border-radius: 8px; background: #f8faff; display: inline-block; 
                font-family: 'Courier New', monospace; }
        .info-box { background: #f0f9ff; border: 1px solid #bae6fd; 
                    border-radius: 8px; padding: 16px; margin: 24px 0; }
        .info-box strong { color: #0369a1; }
        .warning-box { background: #fef2f2; border: 1px solid #fecaca; 
                       border-radius: 8px; padding: 16px; margin: 24px 0; }
        .warning-box strong { color: #dc2626; }
        .footer { background: #f8fafc; padding: 24px 30px; text-align: center; 
                  color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
        .small-text { font-size: 14px; color: #64748b; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${template.icon} ${template.title}</h1>
            <p>${template.message}</p>
        </div>
        
        <div class="content">
            <div class="greeting">Hello,</div>
            
            <p>We received a request for ${template.title.toLowerCase()} for <strong>${email}</strong>.</p>
            <p>Please use the following verification code:</p>
            
            <div class="code-section">
                <div class="code">${code}</div>
            </div>
            
            <div class="info-box">
                <strong>⏰ This code expires in ${expiryMinutes} minutes</strong><br>
                Enter this code in your application to continue.
            </div>
            
            <div class="warning-box">
                <strong>🔒 Security Notice</strong><br>
                Never share this code with anyone. We will never ask for your verification code via phone or email.
            </div>
            
            <div class="small-text">
                If you didn't request this code, please ignore this email and consider securing your account.
            </div>
        </div>
        
        <div class="footer">
            This is an automated security message. Please do not reply to this email.
        </div>
    </div>
</body>
</html>`;
    }

    private maskEmail(email: string): string {
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 2) return email;

        const maskedLocal =
            localPart.charAt(0) +
            '*'.repeat(localPart.length - 2) +
            localPart.charAt(localPart.length - 1);
        return `${maskedLocal}@${domain}`;
    }
}
