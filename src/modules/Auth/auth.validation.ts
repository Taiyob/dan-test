// src/modules/Auth/auth.validation.ts
import { z } from 'zod';

// Password validation with security requirements
const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number')
    .regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain at least one special character');

// Role validation
const roleSchema = z.enum(['admin', 'subscriber', 'employee'], 'Role must be one of: admin, subscriber, employee');

// OTP code validation - accept string and validate format
const otpCodeSchema = z
    .string()
    .regex(/^\d{6}$/, 'OTP code must be exactly 6 digits')
    .transform(val => val.trim());

// Email validation helper
const emailSchema = z
    .string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim();

export const AuthValidation = {
    // Registration validation
    register: z
        .object({
            email: emailSchema,
            password: passwordSchema,
            phoneNumber:z.string(),
            confirmPassword: z.string(),
            terms:z.boolean(),
            firstName: z
                .string()
                .min(2, 'First name must be at least 2 characters')
                .max(100, 'First name must not exceed 100 characters')
                .trim(), 
            lastName: z
                .string()
                .min(2, 'Last name must be at least 2 characters')
                .max(100, 'Last name must not exceed 100 characters')
                .trim(), 
            designation: z.string().max(100).trim().optional(), 
            role: roleSchema.optional(),
        })
        .strict()
        .refine(data => data.password === data.confirmPassword, {
            message: 'Passwords do not match',
            path: ['confirmPassword'],
        })
        .transform(data => {
            // Remove confirmPassword from the final object
            const { confirmPassword, ...rest } = data;
            return rest;
        }),

    // Login validation
    login: z
        .object({
            email: emailSchema,
            password: z.string().min(1, 'Password is required'),
        })
        .strict(),

    // Email verification validation
    verifyEmail: z
        .object({
            email: emailSchema,
            code: otpCodeSchema,
        })
        .strict(),

    // Resend email verification validation
    resendEmailVerification: z
        .object({
            email: emailSchema,
        })
        .strict(),

    // Change password validation
    changePassword: z
        .object({
            currentPassword: z.string().min(1, 'Current password is required'),
            newPassword: passwordSchema,
            confirmNewPassword: z.string(),
        })
        .strict()
        .refine(data => data.newPassword === data.confirmNewPassword, {
            message: 'New passwords do not match',
            path: ['confirmNewPassword'],
        })
        .refine(data => data.currentPassword !== data.newPassword, {
            message: 'New password must be different from current password',
            path: ['newPassword'],
        })
        .transform(data => {
            // Remove confirmNewPassword from the final object
            const { confirmNewPassword, ...rest } = data;
            return rest;
        }),

    // Update role validation (admin only)
    updateRole: z
        .object({
            role: roleSchema,
        })
        .strict(),

    // Refresh token validation
    refreshToken: z
        .object({
            token: z.string().min(1, 'Token is required').optional(), 
        })
        .strict(),

    // Forgot password validation
    forgotPassword: z
        .object({
            email: emailSchema,
        })
        .strict(),

    // Password reset validation
    verifyResetPasswordOTPInput: z
        .object({
            email: emailSchema,
            code: otpCodeSchema,
        })
        .strict(),

    //reset password validation
    resetPassword: z
        .object({
            email: emailSchema,
            newPassword: passwordSchema,
        })
        .strict(),

    // Parameter validation
    params: {
        userId: z.object({
            userId: z.string().min(1, 'User ID is required').uuid('User ID must be a valid UUID'),
        }),
    },
};

// Type exports - Updated to match the corrected validation schemas
export type RegisterInput = z.infer<typeof AuthValidation.register>;
export type LoginInput = z.infer<typeof AuthValidation.login>;
export type VerifyEmailInput = z.infer<typeof AuthValidation.verifyEmail>;
export type ResendEmailVerificationInput = z.infer<typeof AuthValidation.resendEmailVerification>;
export type ChangePasswordInput = z.infer<typeof AuthValidation.changePassword>;
export type UpdateRoleInput = z.infer<typeof AuthValidation.updateRole>;
export type RefreshTokenInput = z.infer<typeof AuthValidation.refreshToken>;
export type ForgotPasswordInput = z.infer<typeof AuthValidation.forgotPassword>;
export type VerifyResetPasswordOTPInput = z.infer<
    typeof AuthValidation.verifyResetPasswordOTPInput
>;
export type ResetPasswordInput = z.infer<typeof AuthValidation.resetPassword>;
export type UserIdParams = z.infer<typeof AuthValidation.params.userId>;