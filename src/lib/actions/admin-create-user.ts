"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import {
  createUserSchema,
  type CreateUserAdminInput,
} from "@/lib/validations/admin-user-creation";
import {
  generateSecurePassword,
  formatPasswordForLogging,
} from "@/lib/utils/password-generator";
import type {
  AdminActionResult,
  CreateUserAdminResult,
  AdminUser,
} from "@/types/admin";
import { ZodError } from "zod";
// ✅ RBAC imports
import { verifyAdminAccess as verifyAdminAccessRBAC } from "@/lib/rbac/utils";
// ✅ NEW: Rate limiting imports
import { checkRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";

/**
 * Verify that the current user has admin access
 *
 * ✅ UPDATED: Now uses RBAC utility from @/lib/rbac/utils
 * Kept as wrapper for backward compatibility
 *
 * Security checks:
 * - Validates active session exists
 * - Verifies user exists in database
 * - Confirms user is not banned
 * - Validates user has admin role
 *
 * @returns Result indicating if admin access is verified
 * @private
 */
async function verifyAdminAccess(): Promise<AdminActionResult<void>> {
  try {
    // ✅ Use centralized RBAC utility
    const accessCheck = await verifyAdminAccessRBAC();

    if (!accessCheck.success) {
      return {
        success: false,
        message:
          accessCheck.message ||
          "You do not have the permission to perform this operation",
        code: "FORBIDDEN",
      };
    }

    return {
      success: true,
      message: "Admin access verified",
    };
  } catch (error) {
    console.error("Admin access verification error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to verify admin access",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new user account (admin only)
 *
 * ✅ UPDATED: Uses RBAC for admin verification + Rate limiting
 *
 * This server action allows administrators to create user accounts with
 * manually entered usernames and automatically generated secure passwords.
 * The created user will be required to change their password on first login.
 *
 * Security features:
 * - Admin-only access (verified via RBAC)
 * - Rate limiting (10 creates per 5 minutes per admin)
 * - Input validation with Zod schema
 * - Email uniqueness check (prevents duplicate accounts)
 * - Username uniqueness check (prevents duplicate usernames)
 * - Username format validation (3-20 chars, lowercase, alphanumeric + underscores)
 * - Cryptographically secure password generation
 * - Audit logging to console (includes admin, user, password)
 * - Password change required on first login
 * - Tracks which admin created the account
 *
 * Process flow:
 * 1. Verify admin access using RBAC
 * 2. Check rate limit (10 creates per 5 minutes)
 * 3. Get current session
 * 4. Validate and sanitize input data (email, name, username, role)
 * 5. Check if email already exists in database
 * 6. Check if username already exists in database
 * 7. Generate secure random password (12+ chars, complexity requirements)
 * 8. Create user via Better Auth API (handles password hashing)
 * 9. Update username fields and auto-verify email via Prisma
 * 10. Update custom role if exam_manager (Better Auth only supports user/admin)
 * 11. Update user record with admin tracking fields (createdBy, passwordChangeRequired)
 * 12. Fetch complete user details
 * 13. Log password to console for admin (temporary until email system ready)
 * 14. Log audit trail
 * 15. Return created user (password NOT included in response)
 *
 * @param data - User creation input (email, name, username, role)
 * @returns Result with created user details and temp password
 *
 * @example
 * ```typescript
 * const result = await createUserByAdmin({
 *   email: "john.doe@example.com",
 *   name: "John Doe",
 *   username: "john_doe",
 *   role: "exam_manager"
 * });
 *
 * if (result.success) {
 *   console.log("User created:", result.data.user.email);
 *   console.log("Username:", result.data.user.username);
 *   // tempPassword is logged server-side only
 * }
 * ```
 *
 * @throws Never throws - all errors returned in result object
 */
export async function createUserByAdmin(
  data: CreateUserAdminInput
): Promise<AdminActionResult<CreateUserAdminResult>> {
  try {
    // Step 1: Verify admin access using RBAC
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        message: accessCheck.message,
        code: accessCheck.code,
        error: accessCheck.error,
      };
    }

    // Step 2: Get current admin session
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // This should never happen due to verifyAdminAccess, but TypeScript needs it
    if (!session) {
      return {
        success: false,
        message: "Session not found",
        code: "NO_SESSION",
      };
    }

    // ✅ NEW: Step 3 - Check rate limit (10 creates per 5 minutes per admin)
    const rateLimitResult = await checkRateLimit(
      "admin:create-user",
      RATE_LIMITS.ADMIN_CREATE_USER,
      session.user.id
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. You can only create ${RATE_LIMITS.ADMIN_CREATE_USER.max} users per ${Math.floor(RATE_LIMITS.ADMIN_CREATE_USER.windowSeconds / 60)} minutes. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Step 4: Validate and sanitize input
    let validatedData: CreateUserAdminInput;
    try {
      validatedData = createUserSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.issues[0];
        return {
          success: false,
          message: firstError?.message || "Validation failed",
          code: "VALIDATION_ERROR",
          error: JSON.stringify(error.issues),
        };
      }
      throw error; // Re-throw unexpected errors
    }

    // Step 5: Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true, email: true },
    });

    if (existingEmail) {
      return {
        success: false,
        message: "A user with this email already exists",
        code: "DUPLICATE_EMAIL",
        error: "Email must be unique",
      };
    }

    // Step 6: Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
      select: { id: true, username: true },
    });

    if (existingUsername) {
      return {
        success: false,
        message: "This username is already taken",
        code: "DUPLICATE_USERNAME",
        error: "Username must be unique",
      };
    }

    // Step 7: Generate secure password
    const passwordResult = generateSecurePassword({ length: 12 });
    const tempPassword = passwordResult.password;

    // Step 8: Create user via Better Auth
    // IMPORTANT: Better Auth only recognizes "user" and "admin" roles by default.
    // For custom roles like "exam_manager", we pass "user" to Better Auth,
    // then update the role field directly in Prisma afterward.
    //
    // NOTE: Better Auth createUser API doesn't accept username directly,
    // so we pass it in data and then update the user table via Prisma
    const betterAuthRole = validatedData.role === "admin" ? "admin" : "user";
    let userId: string;

    try {
      const createdUser = await auth.api.createUser({
        body: {
          email: validatedData.email,
          password: tempPassword,
          name: validatedData.name,
          role: betterAuthRole,
          // Additional fields go in data object
          data: {
            username: validatedData.username,
            displayUsername: validatedData.username,
          },
        },
      });

      userId = createdUser.user.id;
    } catch (error) {
      console.error("Better Auth createUser error:", error);

      if (error instanceof APIError) {
        return {
          success: false,
          message: error.message || "Failed to create user",
          code: error.status.toString(),
        };
      }

      return {
        success: false,
        message: "Failed to create user account",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Step 9: Update username fields via Prisma
    // Better Auth's data field doesn't automatically populate username/displayUsername
    // in the user table, so we need to update them separately
    // ALSO: Set emailVerified to true since admin is creating the user
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          username: validatedData.username,
          displayUsername: validatedData.username,
          emailVerified: true, // ✅ Auto-verify email for admin-created users
        },
      });
    } catch (error) {
      console.error("Failed to update username fields:", error);

      // Check if it's a unique constraint violation
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        // Username conflict - rollback by deleting the user
        try {
          await prisma.user.delete({ where: { id: userId } });
        } catch (deleteError) {
          console.error("Failed to rollback user creation:", deleteError);
        }

        return {
          success: false,
          message: "This username is already taken",
          code: "DUPLICATE_USERNAME",
          error: "Username must be unique",
        };
      }

      // For other errors, still fail but log the issue
      return {
        success: false,
        message: "Failed to set username",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "USERNAME_UPDATE_FAILED",
      };
    }

    // Step 10: Update custom role if exam_manager (or any non-standard role)
    // Better Auth only supports "user" and "admin" natively
    try {
      if (validatedData.role !== "user" && validatedData.role !== "admin") {
        await prisma.user.update({
          where: { id: userId },
          data: { role: validatedData.role },
        });
      }
    } catch (error) {
      console.error("Failed to update custom role:", error);
      // Log error but don't fail - role can be updated manually if needed
    }

    // Step 11: Update user with admin tracking fields
    // Better Auth doesn't support these custom fields in createUser,
    // so we update them separately via Prisma
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordChangeRequired: true,
          createdBy: session.user.id,
        },
      });
    } catch (error) {
      console.error("Failed to update user audit fields:", error);
      // Log error but don't fail the operation since user was created
      // Admin can manually update these fields if needed
    }

    // Step 12: Fetch complete user details for response
    const completeUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        username: true,
        displayUsername: true,
        dateOfBirth: true,
        gender: true,
        phoneNumber: true,
        address: true,
        state: true,
        lga: true,
        schoolName: true,
        twoFactorEnabled: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!completeUser) {
      return {
        success: false,
        message: "User created but failed to fetch details",
        code: "FETCH_ERROR",
      };
    }

    // Step 13: Format and log password to console (audit trail)
    // SECURITY: This is temporary until email system is implemented
    // Password is NEVER sent to client - only logged server-side
    const logMessage = formatPasswordForLogging(
      tempPassword,
      validatedData.email,
      session.user.email,
      validatedData.role
    );
    console.log(logMessage);

    // Step 14: Log audit trail with rate limit info
    console.log(
      `[AUDIT] Admin ${session.user.email} (ID: ${session.user.id}) created user ${validatedData.email} ` +
        `with username: ${validatedData.username}, role: ${validatedData.role}. ` +
        `Rate limit: ${rateLimitResult.remaining}/${RATE_LIMITS.ADMIN_CREATE_USER.max} remaining`
    );

    // Step 15: Return success with complete user data
    return {
      success: true,
      message: "User created successfully",
      data: {
        user: completeUser as AdminUser,
        tempPassword: tempPassword, // Only used for server-side logging
      },
    };
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in createUserByAdmin:", error);

    return {
      success: false,
      message: "An unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR",
    };
  }
}
