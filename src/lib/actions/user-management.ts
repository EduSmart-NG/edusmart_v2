"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { parseUserAgent } from "@/lib/utils/device-parser";
import type {
  SessionData,
  UpdateUserProfileInput,
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteAccountInput,
  LinkAccountInput,
  UnlinkAccountInput,
  ActionResult,
  SessionRevocationResult,
  DeviceSession,
  UserAccount,
} from "@/types/user-management";
import { APIError } from "better-auth/api";

/**
 * Get current session with Better Auth cookie cache support
 *
 * @param disableCookieCache - Force fetch from database
 * @returns Current session data or null
 */
export async function getSessionUser(
  disableCookieCache = false
): Promise<ActionResult<SessionData>> {
  try {
    const headersList = await headers();

    const session = await auth.api.getSession({
      headers: headersList,
      query: {
        disableCookieCache,
      },
    });

    if (!session) {
      return {
        success: false,
        message: "No active session found",
        code: "NO_SESSION",
      };
    }

    return {
      success: true,
      message: "Session retrieved successfully",
      data: session as SessionData,
    };
  } catch (error) {
    console.error("Get session error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to retrieve session",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update user profile information
 * Validates input and uses Better Auth updateUser
 *
 * @param data - Profile update data
 * @returns Action result with updated data
 */
export async function updateUserProfile(
  data: UpdateUserProfileInput
): Promise<ActionResult<SessionData>> {
  try {
    // Validate input
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional()
        .nullable(),
      address: z.string().max(500).optional().nullable(),
      state: z.string().max(100).optional().nullable(),
      lga: z.string().max(100).optional().nullable(),
      schoolName: z.string().max(200).optional().nullable(),
      image: z.string().url().optional().nullable(),
    });

    const validatedData = schema.parse(data);

    const headersList = await headers();

    // Convert Date to string for Better Auth compatibility
    const bodyData: Record<string, unknown> = {
      ...validatedData,
    };

    // Better Auth expects dateOfBirth as Date object
    if (data.dateOfBirth) {
      // Convert to full DateTime by adding midnight UTC time
      bodyData.dateOfBirth = new Date(
        data.dateOfBirth.toISOString().split("T")[0] + "T00:00:00.000Z"
      );
    }

    // Gender is already a string
    if (data.gender) {
      bodyData.gender = data.gender;
    }

    // Update user via Better Auth
    await auth.api.updateUser({
      headers: headersList,
      body: bodyData,
    });

    // Get updated session
    const updatedSession = await auth.api.getSession({
      headers: headersList,
      query: { disableCookieCache: true },
    });

    return {
      success: true,
      message: "Profile updated successfully",
      data: updatedSession as SessionData,
    };
  } catch (error) {
    console.error("Update profile error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input data",
        error: error.issues[0]?.message || "Validation failed",
      };
    }

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to update profile",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Change user email with verification flow
 * Requires fresh session for security
 *
 * @param data - New email and callback URL
 * @returns Action result
 */
export async function changeUserEmail(
  data: ChangeEmailInput
): Promise<ActionResult> {
  try {
    const schema = z.object({
      newEmail: z.string().email("Invalid email address"),
      callbackURL: z.string().url().optional(),
    });

    const validatedData = schema.parse(data);

    const headersList = await headers();

    await auth.api.changeEmail({
      headers: headersList,
      body: {
        newEmail: validatedData.newEmail,
        callbackURL: validatedData.callbackURL || "/dashboard",
      },
    });

    return {
      success: true,
      message:
        "Verification email sent. Please check your current email inbox.",
    };
  } catch (error) {
    console.error("Change email error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid email address",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to change email",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Change user password with session revocation option
 * Requires current password for security
 *
 * @param data - Password change data
 * @returns Action result
 */
export async function changeUserPassword(
  data: ChangePasswordInput
): Promise<ActionResult> {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          "Password must contain uppercase, lowercase, number, and special character"
        ),
      revokeOtherSessions: z.boolean().optional().default(true),
    });

    const validatedData = schema.parse(data);

    const headersList = await headers();

    await auth.api.changePassword({
      headers: headersList,
      body: {
        currentPassword: validatedData.currentPassword,
        newPassword: validatedData.newPassword,
        revokeOtherSessions: validatedData.revokeOtherSessions,
      },
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    console.error("Change password error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid password format",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("incorrect") ||
        errorMessage.includes("invalid")
      ) {
        return {
          success: false,
          message: "Current password is incorrect",
          code: "INVALID_PASSWORD",
        };
      }

      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to change password",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete user account with multi-factor verification
 * Supports password, token, or fresh session verification
 *
 * @param data - Account deletion data
 * @returns Action result
 */
export async function deleteUserAccount(
  data: DeleteAccountInput
): Promise<ActionResult<void>> {
  // ✅ Keep as void
  try {
    const schema = z.object({
      password: z.string().optional(),
      token: z.string().optional(),
      callbackURL: z.string().optional(),
    });

    const validatedData = schema.parse(data);
    const headersList = await headers();

    // Construct full URL on server
    let callbackURL = validatedData.callbackURL || "/goodbye";
    if (!callbackURL.startsWith("http")) {
      const host = headersList.get("host") || "";
      const protocol = headersList.get("x-forwarded-proto") || "https";
      callbackURL = `${protocol}://${host}${callbackURL}`;
    }

    await auth.api.deleteUser({
      headers: headersList,
      body: {
        password: validatedData.password,
        token: validatedData.token,
        callbackURL,
      },
    });

    // Better Auth handles the logic internally:
    // - If password provided: deletes immediately
    // - If no password: sends verification email

    return {
      success: true,
      message: validatedData.password
        ? "Account deleted successfully"
        : "Verification email sent. Check your email to confirm deletion.",
    };
  } catch (error) {
    console.error("Delete account error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input data",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to delete account",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all active sessions for the current user
 * Used for device management
 *
 * @returns List of active sessions
 */
export async function listUserSessions(): Promise<
  ActionResult<DeviceSession[]>
> {
  try {
    const headersList = await headers();

    const sessions = await auth.api.listSessions({
      headers: headersList,
    });

    if (!sessions || sessions.length === 0) {
      return {
        success: true,
        message: "No active sessions found",
        data: [],
      };
    }

    // Get current session token for comparison
    const currentSession = await auth.api.getSession({
      headers: headersList,
    });

    const deviceSessions: DeviceSession[] = sessions.map((session) => ({
      id: session.id,
      token: session.token,
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(session.expiresAt),
      isCurrent: session.token === currentSession?.session.token,
      deviceInfo: parseUserAgent(session.userAgent ?? null),
    }));

    return {
      success: true,
      message: "Sessions retrieved successfully",
      data: deviceSessions,
    };
  } catch (error) {
    console.error("List sessions error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to list sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Revoke a specific session by token
 *
 * @param token - Session token to revoke
 * @returns Revocation result
 */
export async function revokeUserSession(
  token: string
): Promise<SessionRevocationResult> {
  try {
    const headersList = await headers();

    await auth.api.revokeSession({
      headers: headersList,
      body: { token },
    });

    return {
      success: true,
      message: "Session revoked successfully",
      revokedCount: 1,
    };
  } catch (error) {
    console.error("Revoke session error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to revoke session",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Revoke all sessions except the current one
 * Useful for "log out other devices"
 *
 * @returns Revocation result
 */
export async function revokeOtherUserSessions(): Promise<SessionRevocationResult> {
  try {
    const headersList = await headers();

    await auth.api.revokeOtherSessions({
      headers: headersList,
    });

    return {
      success: true,
      message: "Other sessions revoked successfully",
    };
  } catch (error) {
    console.error("Revoke other sessions error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to revoke sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Revoke all sessions including current
 * User will be logged out
 *
 * @returns Revocation result
 */
export async function revokeAllUserSessions(): Promise<SessionRevocationResult> {
  try {
    const headersList = await headers();

    await auth.api.revokeSessions({
      headers: headersList,
    });

    return {
      success: true,
      message: "All sessions revoked successfully",
    };
  } catch (error) {
    console.error("Revoke all sessions error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to revoke sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all linked accounts for the user
 *
 * @returns List of linked accounts
 */
export async function listUserAccounts(): Promise<ActionResult<UserAccount[]>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: "No active session",
        code: "NO_SESSION",
      };
    }

    // Use Prisma to fetch accounts
    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        providerId: true,
        accountId: true,
        accessToken: true,
        refreshToken: true,
        createdAt: true,
      },
    });

    const userAccounts: UserAccount[] = accounts.map((account) => ({
      id: account.id,
      providerId: account.providerId,
      accountId: account.accountId,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      createdAt: account.createdAt,
    }));

    return {
      success: true,
      message: "Accounts retrieved successfully",
      data: userAccounts,
    };
  } catch (error) {
    console.error("List accounts error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to list accounts",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Link a social account to the user's profile
 *
 * @param data - Account linking data
 * @returns Action result
 */
export async function linkUserAccount(
  data: LinkAccountInput
): Promise<ActionResult> {
  try {
    const schema = z.object({
      provider: z.enum(["google", "facebook", "tiktok"]),
      callbackURL: z.string().url().optional(),
      scopes: z.array(z.string()).optional(),
      idToken: z
        .object({
          token: z.string(),
          nonce: z.string().optional(),
          accessToken: z.string().optional(),
          refreshToken: z.string().optional(),
        })
        .optional(),
    });

    const validatedData = schema.parse(data);

    const headersList = await headers();

    await auth.api.linkSocialAccount({
      headers: headersList,
      body: {
        provider: validatedData.provider,
        callbackURL: validatedData.callbackURL || "/dashboard",
      },
    });

    return {
      success: true,
      message: "Account linking initiated. Please complete the OAuth flow.",
    };
  } catch (error) {
    console.error("Link account error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input data",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to link account",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Unlink a social account from the user's profile
 *
 * @param data - Account unlinking data
 * @returns Action result
 */
export async function unlinkUserAccount(
  data: UnlinkAccountInput
): Promise<ActionResult> {
  try {
    const schema = z.object({
      providerId: z.string().min(1, "Provider ID is required"),
      accountId: z.string().optional(),
    });

    const validatedData = schema.parse(data);

    const headersList = await headers();

    await auth.api.unlinkAccount({
      headers: headersList,
      body: {
        providerId: validatedData.providerId,
        accountId: validatedData.accountId,
      },
    });

    return {
      success: true,
      message: "Account unlinked successfully",
    };
  } catch (error) {
    console.error("Unlink account error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input data",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("only account") ||
        errorMessage.includes("last account")
      ) {
        return {
          success: false,
          message:
            "Cannot unlink your only account. Link another account first.",
          code: "LAST_ACCOUNT",
        };
      }

      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to unlink account",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if user has a password (credential account)
 * OAuth-only users don't have passwords
 *
 * @param userId - User ID to check
 * @returns Whether user has a password set
 */
export async function userHasPassword(
  userId?: string
): Promise<ActionResult<boolean>> {
  try {
    let targetUserId = userId;

    // If no userId provided, get from current session
    if (!targetUserId) {
      const headersList = await headers();
      const session = await auth.api.getSession({
        headers: headersList,
      });

      if (!session) {
        return {
          success: false,
          message: "No active session found",
          code: "NO_SESSION",
        };
      }

      targetUserId = session.user.id;
    }

    // Check if user has a credential account (with password)
    const credentialAccount = await prisma.account.findFirst({
      where: {
        userId: targetUserId,
        providerId: "credential",
      },
      select: {
        id: true,
        password: true,
      },
    });

    const hasPassword = !!(credentialAccount && credentialAccount.password);

    return {
      success: true,
      message: hasPassword
        ? "User has password"
        : "User does not have password",
      data: hasPassword,
    };
  } catch (error) {
    console.error("Check password error:", error);

    return {
      success: false,
      message: "Failed to check password status",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
