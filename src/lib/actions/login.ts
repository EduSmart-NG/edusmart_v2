"use server";

// export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  validateAndSanitizeLogin,
  type LoginInput,
} from "@/lib/validations/auth";
import {
  isAccountLocked,
  recordFailedAttempt,
  clearLockout,
  getRemainingLockoutTime,
  applyProgressiveDelay,
} from "@/lib/utils/brute-force";
import type { LoginResult, ResendVerificationResult } from "@/types/auth";
import { APIError } from "better-auth/api";

/**
 * Login user with email or username
 *
 * Security features:
 * - Email or username authentication
 * - Account lockout after 5 failed attempts
 * - Progressive delays on failed attempts
 * - Rate limiting via Better Auth
 * - Email verification enforcement
 * - Uses nextCookies plugin for automatic cookie handling
 *
 * @param data - Login credentials
 * @returns Login result with success status and error details
 */
export async function loginUser(data: LoginInput): Promise<LoginResult> {
  try {
    // Step 1: Validate and sanitize input
    const validatedData = validateAndSanitizeLogin(data);
    const { identifier, password, rememberMe } = validatedData;

    // Step 2: Check account lockout
    const locked = await isAccountLocked(identifier);
    if (locked) {
      const retryAfter = await getRemainingLockoutTime(identifier);
      return {
        success: false,
        message: "Account temporarily locked due to too many failed attempts.",
        code: "ACCOUNT_LOCKED",
        retryAfter,
      };
    }

    // Step 3: Apply progressive delay based on previous failed attempts
    await applyProgressiveDelay(identifier);

    // Step 4: Attempt login with Better Auth
    // Better Auth username plugin allows login with username OR email
    // nextCookies plugin automatically handles cookie setting
    const result = await auth.api.signInEmail({
      body: {
        email: identifier, // Works for both email and username
        password,
        rememberMe,
      },
      // ✅ NO headers() needed - nextCookies plugin handles this
    });

    // Step 5: Handle unsuccessful login
    if (!result) {
      const { locked: nowLocked } = await recordFailedAttempt(identifier);

      if (nowLocked) {
        return {
          success: false,
          message:
            "Too many failed login attempts. Account locked for 15 minutes.",
          code: "ACCOUNT_LOCKED",
          retryAfter: 900, // 15 minutes
        };
      }

      return {
        success: false,
        message: "Invalid email/username or password. Please try again.",
        code: "INVALID_CREDENTIALS",
        errors: {
          identifier: " ",
          password: "Incorrect credentials",
        },
      };
    }

    // Step 6: Success - clear any failed attempts
    await clearLockout(identifier);

    return {
      success: true,
      message: "Login successful",
      redirectTo: "/dashboard",
    };
  } catch (error) {
    console.error("Login error:", error);

    // Handle Better Auth API errors
    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();
      const errorStatus = error.status;

      // Email not verified (403)
      if (
        errorStatus === 403 ||
        errorMessage.includes("verify") ||
        errorMessage.includes("verification") ||
        errorMessage.includes("not verified")
      ) {
        // Try to extract email from identifier or error
        let userEmail = data.identifier;

        // If identifier is username, try to find email from database
        if (!data.identifier.includes("@")) {
          try {
            const user = await prisma.user.findUnique({
              where: { username: data.identifier.toLowerCase() },
              select: { email: true },
            });
            if (user) {
              userEmail = user.email;
            }
          } catch (dbError) {
            console.error("Error fetching user email:", dbError);
          }
        }

        return {
          success: false,
          message:
            "Please verify your email address before logging in. Check your inbox or resend the verification email.",
          code: "UNVERIFIED_EMAIL",
          userEmail,
        };
      }

      // Rate limited (429)
      if (errorStatus === 429 || errorMessage.includes("rate limit")) {
        return {
          success: false,
          message: "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: 60,
        };
      }

      // Invalid credentials (401 or error message)
      if (
        errorStatus === 401 ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("incorrect") ||
        errorMessage.includes("credential")
      ) {
        await recordFailedAttempt(data.identifier);
        return {
          success: false,
          message: "Invalid email/username or password. Please try again.",
          code: "INVALID_CREDENTIALS",
        };
      }

      // Other API errors
      return {
        success: false,
        message: error.message || "Authentication failed. Please try again.",
        code: "UNKNOWN_ERROR",
      };
    }

    // Handle other errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Check for common error patterns
      if (
        errorMessage.includes("verify") ||
        errorMessage.includes("verification")
      ) {
        let userEmail = data.identifier;

        if (!data.identifier.includes("@")) {
          try {
            const user = await prisma.user.findUnique({
              where: { username: data.identifier.toLowerCase() },
              select: { email: true },
            });
            if (user) {
              userEmail = user.email;
            }
          } catch (dbError) {
            console.error("Error fetching user email:", dbError);
          }
        }

        return {
          success: false,
          message:
            "Please verify your email address before logging in. Check your inbox or resend the verification email.",
          code: "UNVERIFIED_EMAIL",
          userEmail,
        };
      }

      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("credential")
      ) {
        await recordFailedAttempt(data.identifier);
        return {
          success: false,
          message: "Invalid email/username or password. Please try again.",
          code: "INVALID_CREDENTIALS",
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

/**
 * Resend verification email to user
 *
 * @param email - User's email address
 * @returns Result with success status
 */
export async function resendVerificationEmail(
  email: string
): Promise<ResendVerificationResult> {
  try {
    // Validate email format
    const emailSchema = z.string().email();
    const validEmail = emailSchema.parse(email.toLowerCase().trim());

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: validEmail },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
      },
    });

    if (!user) {
      // Don't reveal if email exists (security)
      return {
        success: true,
        message:
          "If an account exists with this email, a verification link has been sent.",
      };
    }

    // Check if already verified
    if (user.emailVerified) {
      return {
        success: false,
        message: "This email is already verified. You can log in now.",
      };
    }

    // Use Better Auth to send verification email
    // nextCookies plugin handles cookie setting automatically
    await auth.api.sendVerificationEmail({
      body: {
        email: validEmail,
        callbackURL: "/auth/email-verified",
      },
      // ✅ NO headers() needed - nextCookies plugin handles this
    });

    return {
      success: true,
      message: "Verification email sent! Please check your inbox.",
    };
  } catch (error) {
    console.error("Resend verification error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid email address.",
      };
    }

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message || "Failed to send verification email.",
      };
    }

    return {
      success: false,
      message: "Failed to send verification email. Please try again.",
    };
  }
}
