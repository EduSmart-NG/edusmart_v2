"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import {
  validateAndSanitizePasswordResetRequest,
  validateAndSanitizePasswordReset,
  type PasswordResetRequestInput,
  type PasswordResetInput,
} from "@/lib/validations/auth";
import type {
  PasswordResetRequestResult,
  PasswordResetResult,
  PasswordResetRateLimitData,
} from "@/types/auth";
import { ZodError } from "zod";
import { APIError } from "better-auth/api";
import { headers } from "next/headers"; // ✅ ADDED: Import headers for reCAPTCHA

/**
 * Rate limiting configuration for password reset requests
 */
const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 3, // Maximum requests
  WINDOW_MINUTES: 15, // Time window in minutes
  BLOCK_DURATION_MINUTES: 15, // Block duration after exceeding limit
};

/**
 * Check if email is rate limited for password reset requests
 *
 * @param email - User's email address
 * @returns Whether the email is currently rate limited
 */
async function isPasswordResetRateLimited(email: string): Promise<boolean> {
  try {
    const key = `password_reset:${email.toLowerCase()}`;
    const data = await redis.get(key);

    if (!data) {
      return false;
    }

    const rateLimitData: PasswordResetRateLimitData = JSON.parse(data);

    // Check if currently blocked
    if (rateLimitData.isBlocked && rateLimitData.blockedUntil) {
      const blockedUntil = new Date(rateLimitData.blockedUntil);
      if (new Date() < blockedUntil) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking password reset rate limit:", error);
    return false; // Fail open to prevent blocking legitimate users
  }
}

/**
 * Record a password reset attempt
 *
 * @param email - User's email address
 * @returns Whether the user is now rate limited
 */
async function recordPasswordResetAttempt(
  email: string
): Promise<{ limited: boolean; retryAfter: number }> {
  try {
    const key = `password_reset:${email.toLowerCase()}`;
    const now = new Date();
    const data = await redis.get(key);

    let rateLimitData: PasswordResetRateLimitData;

    if (!data) {
      // First attempt
      rateLimitData = {
        attempts: 1,
        firstAttempt: now.toISOString(),
        isBlocked: false,
      };
    } else {
      rateLimitData = JSON.parse(data);
      const firstAttempt = new Date(rateLimitData.firstAttempt);
      const windowExpired =
        now.getTime() - firstAttempt.getTime() >
        RATE_LIMIT_CONFIG.WINDOW_MINUTES * 60 * 1000;

      if (windowExpired) {
        // Window expired, reset counter
        rateLimitData = {
          attempts: 1,
          firstAttempt: now.toISOString(),
          isBlocked: false,
        };
      } else {
        // Increment attempts
        rateLimitData.attempts += 1;

        // Check if limit exceeded
        if (rateLimitData.attempts > RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
          const blockedUntil = new Date(
            now.getTime() + RATE_LIMIT_CONFIG.BLOCK_DURATION_MINUTES * 60 * 1000
          );
          rateLimitData.isBlocked = true;
          rateLimitData.blockedUntil = blockedUntil.toISOString();
        }
      }
    }

    // Store in Redis with TTL
    const ttl = RATE_LIMIT_CONFIG.WINDOW_MINUTES * 60;
    await redis.set(key, JSON.stringify(rateLimitData), ttl);

    // Calculate retry after time
    let retryAfter = 0;
    if (rateLimitData.isBlocked && rateLimitData.blockedUntil) {
      const blockedUntil = new Date(rateLimitData.blockedUntil);
      retryAfter = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
    }

    return {
      limited: rateLimitData.isBlocked,
      retryAfter,
    };
  } catch (error) {
    console.error("Error recording password reset attempt:", error);
    return { limited: false, retryAfter: 0 };
  }
}

/**
 * Request password reset - sends reset email with token
 *
 * Security features:
 * - Rate limiting (3 requests per 15 minutes per email)
 * - Doesn't reveal if email exists (always returns success)
 * - Single-use tokens with 1 hour expiration
 * - Email includes security warnings
 * - reCAPTCHA v3 bot protection ✅ NEW
 *
 * @param data - Password reset request data (email)
 * @returns Result with success status
 */
export async function requestPasswordReset(
  data: PasswordResetRequestInput
): Promise<PasswordResetRequestResult> {
  try {
    // Step 1: Validate and sanitize input
    const validatedData = validateAndSanitizePasswordResetRequest(data);
    const { email } = validatedData;

    // Step 2: Check rate limiting
    const isRateLimited = await isPasswordResetRateLimited(email);
    if (isRateLimited) {
      return {
        success: false,
        message:
          "Too many password reset requests. Please try again in 15 minutes.",
        code: "RATE_LIMITED",
        retryAfter: 900, // 15 minutes
      };
    }

    // Step 3: Record attempt
    const { limited, retryAfter } = await recordPasswordResetAttempt(email);
    if (limited) {
      return {
        success: false,
        message: `Too many password reset requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        code: "RATE_LIMITED",
        retryAfter,
      };
    }

    // Step 4: Check if user exists (silently - don't reveal to client)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });

    // Step 5: If user doesn't exist, still return success (security best practice)
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      // Return success to prevent email enumeration
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
        code: "EMAIL_SENT",
      };
    }

    // Step 6: Send password reset email via Better Auth
    // ✅ UPDATED: Now passes headers for reCAPTCHA validation
    await auth.api.forgetPassword({
      body: {
        email,
        redirectTo: "/auth/reset-password",
      },
      headers: await headers(), // ✅ ADDED: Pass headers for reCAPTCHA validation
    });

    console.log(`Password reset email sent to: ${email}`);

    return {
      success: true,
      message:
        "If an account exists with this email, you will receive password reset instructions.",
      code: "EMAIL_SENT",
    };
  } catch (error) {
    console.error("Password reset request error:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Invalid email address format.",
        code: "INVALID_EMAIL",
      };
    }

    // ✅ ENHANCED: Handle Better Auth API errors including reCAPTCHA
    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      // Check for reCAPTCHA-specific errors
      if (
        errorMessage.includes("captcha") ||
        errorMessage.includes("recaptcha")
      ) {
        return {
          success: false,
          message: "Bot verification failed. Please try again.",
          code: "UNKNOWN_ERROR",
        };
      }

      console.error("Better Auth API error:", error.message);
      // Don't expose internal errors to client
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
        code: "EMAIL_SENT",
      };
    }

    // Generic error
    return {
      success: false,
      message:
        "Unable to process your request at this time. Please try again later.",
      code: "UNKNOWN_ERROR",
    };
  }
}

/**
 * Reset password using valid token
 *
 * Security features:
 * - Token validation (single-use, 1 hour expiration)
 * - Password complexity enforcement
 * - Optional session revocation
 * - Security logging
 * - reCAPTCHA v3 bot protection ✅ NEW (optional)
 *
 * @param data - Password reset data (token, new password)
 * @returns Result with success status
 */
export async function resetPassword(
  data: PasswordResetInput
): Promise<PasswordResetResult> {
  try {
    // Step 1: Validate and sanitize input
    const validatedData = validateAndSanitizePasswordReset(data);
    const { token, password } = validatedData;

    // Step 2: Reset password via Better Auth
    // ✅ UPDATED: Now passes headers for reCAPTCHA validation (if endpoint is protected)
    await auth.api.resetPassword({
      body: {
        token,
        newPassword: password,
      },
      headers: await headers(), // ✅ ADDED: Pass headers for optional reCAPTCHA validation
    });

    console.log("Password reset successful for token");

    return {
      success: true,
      message: "Your password has been reset successfully. You can now log in.",
      code: "PASSWORD_RESET",
      redirectTo: "/auth/login",
    };
  } catch (error) {
    console.error("Password reset error:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return {
        success: false,
        message: firstIssue.message || "Invalid password format.",
        code: "WEAK_PASSWORD",
      };
    }

    // ✅ ENHANCED: Handle Better Auth API errors including reCAPTCHA
    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();
      const errorStatus = error.status;

      // Check for reCAPTCHA-specific errors
      if (
        errorMessage.includes("captcha") ||
        errorMessage.includes("recaptcha")
      ) {
        return {
          success: false,
          message: "Bot verification failed. Please try again.",
          code: "UNKNOWN_ERROR",
        };
      }

      // Token expired (400 or specific message)
      if (
        errorStatus === 400 ||
        errorMessage.includes("expired") ||
        errorMessage.includes("invalid")
      ) {
        return {
          success: false,
          message:
            "This password reset link has expired or is invalid. Please request a new one.",
          code: "EXPIRED_TOKEN",
        };
      }

      // Invalid token
      if (
        errorMessage.includes("token") ||
        errorMessage.includes("not found")
      ) {
        return {
          success: false,
          message: "Invalid password reset link. Please request a new one.",
          code: "INVALID_TOKEN",
        };
      }

      // Generic API error
      return {
        success: false,
        message: "Unable to reset password. Please try again.",
        code: "UNKNOWN_ERROR",
      };
    }

    // Handle other errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("password") && errorMessage.includes("weak")) {
        return {
          success: false,
          message:
            "Password is too weak. Please use a stronger password with uppercase, lowercase, numbers, and special characters.",
          code: "WEAK_PASSWORD",
        };
      }
    }

    // Generic error
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
      code: "UNKNOWN_ERROR",
    };
  }
}
