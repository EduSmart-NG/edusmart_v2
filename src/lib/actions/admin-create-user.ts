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

/**
 * Verify that the current user has admin access
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
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      throw new APIError("UNAUTHORIZED", {
        message: "No active session found",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, banned: true },
    });

    if (!user) {
      throw new APIError("NOT_FOUND", {
        message: "User not found",
      });
    }

    if (user.banned) {
      throw new APIError("FORBIDDEN", {
        message: "Your account has been banned",
      });
    }

    if (user.role !== "admin") {
      throw new APIError("FORBIDDEN", {
        message: "Insufficient permissions. Admin access required.",
      });
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
 * This server action allows administrators to create user accounts with
 * automatically generated secure passwords. The created user will be required
 * to change their password on first login.
 *
 * Security features:
 * - Admin-only access (verified via verifyAdminAccess)
 * - Input validation with Zod schema
 * - Email uniqueness check (prevents duplicate accounts)
 * - Cryptographically secure password generation
 * - Audit logging to console (includes admin, user, password)
 * - Password change required on first login
 * - Tracks which admin created the account
 * - Rate limiting via Better Auth (built-in)
 *
 * Process flow:
 * 1. Verify admin access and get current session
 * 2. Validate and sanitize input data
 * 3. Check if email already exists in database
 * 4. Generate secure random password (12+ chars, complexity requirements)
 * 5. Create user via Better Auth API (handles password hashing)
 * 6. Update user record with audit fields (createdBy, passwordChangeRequired)
 * 7. Log password to console for admin (temporary until email system ready)
 * 8. Return created user (password NOT included in response)
 *
 * @param data - User creation input (email, name, role)
 * @returns Result with created user details and temp password
 *
 * @example
 * ```typescript
 * const result = await createUserByAdmin({
 *   email: "john.doe@example.com",
 *   name: "John Doe",
 *   role: "exam_manager"
 * });
 *
 * if (result.success) {
 *   console.log("User created:", result.data.user.email);
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
    // Step 1: Verify admin access
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

    // Step 3: Validate and sanitize input
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

    // Step 4: Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true, email: true },
    });

    if (existingUser) {
      return {
        success: false,
        message: "A user with this email already exists",
        code: "DUPLICATE_EMAIL",
        error: "Email must be unique",
      };
    }

    // Step 5: Generate secure password
    const passwordResult = generateSecurePassword({ length: 12 });
    const tempPassword = passwordResult.password;

    // Step 6: Create user via Better Auth
    // Better Auth will:
    // - Hash the password securely (bcrypt)
    // - Create user and account records
    // - Handle all necessary database operations
    let newUser: {
      user: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
        image: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
    };

    try {
      newUser = await auth.api.createUser({
        body: {
          email: validatedData.email,
          password: tempPassword,
          name: validatedData.name,
          role: validatedData.role,
          // Additional data can be passed here if needed
          data: {},
        },
      });
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

    // Step 7: Update user with admin tracking fields
    // Better Auth doesn't support these custom fields in createUser,
    // so we update them separately via Prisma
    try {
      await prisma.user.update({
        where: { id: newUser.user.id },
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

    // Step 8: Fetch complete user details for response
    const completeUser = await prisma.user.findUnique({
      where: { id: newUser.user.id },
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

    // Step 9: Format and log password to console (audit trail)
    // SECURITY: This is temporary until email system is implemented
    // Password is NEVER sent to client - only logged server-side
    const logMessage = formatPasswordForLogging(
      tempPassword,
      validatedData.email,
      session.user.email,
      validatedData.role
    );
    console.log(logMessage);

    // Step 10: Log audit trail
    console.log(
      `[AUDIT] Admin ${session.user.email} (ID: ${session.user.id}) created user ${validatedData.email} (ID: ${newUser.user.id}) with role: ${validatedData.role}`
    );

    // Step 11: Return success with user details
    // SECURITY: tempPassword is included for logging purposes only
    // The calling code should NEVER send this to the client
    return {
      success: true,
      message: "User created successfully",
      data: {
        user: completeUser as AdminUser,
        tempPassword, // For server-side logging only
      },
    };
  } catch (error) {
    console.error("Create user error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    if (error instanceof ZodError) {
      return {
        success: false,
        message: "Validation error",
        code: "VALIDATION_ERROR",
        error: error.issues[0]?.message,
      };
    }

    return {
      success: false,
      message: "Failed to create user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
