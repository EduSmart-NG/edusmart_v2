"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import type {
  AdminActionResult,
  UserListQuery,
  UserListResponse,
  AdminUser,
  BanUserInput,
  SetUserRoleInput,
  SetUserPasswordInput,
  CreateUserInput,
  UpdateUserInput,
  ImpersonateUserInput,
  RemoveUserInput,
  ListUserSessionsInput,
  RevokeUserSessionInput,
  RevokeUserSessionsInput,
  UserSession,
} from "@/types/admin";

/**
 * Check if current user has admin role
 * @returns AdminActionResult with boolean data
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
 * List users with filtering, searching, and pagination
 * Audit: Logs admin viewing user list
 */
export async function listUsers(
  query?: UserListQuery
): Promise<AdminActionResult<UserListResponse>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        message: accessCheck.message,
        code: accessCheck.code,
        error: accessCheck.error,
      };
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Use Better Auth admin API - query parameter is required, use empty object if not provided
    const result = await auth.api.listUsers({
      query: query || {},
      headers: headersList,
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} listed users with query:`,
      JSON.stringify(query)
    );

    // Handle both return types - with or without pagination metadata
    const responseData: UserListResponse = {
      users: result.users as AdminUser[],
      total: result.total,
      limit: "limit" in result ? result.limit : undefined,
      offset: "offset" in result ? result.offset : undefined,
    };

    return {
      success: true,
      message: "Users retrieved successfully",
      data: responseData,
    };
  } catch (error) {
    console.error("List users error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to list users",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new user (admin only)
 * Audit: Logs admin creating user
 */
export async function createUser(
  data: CreateUserInput
): Promise<AdminActionResult<AdminUser>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        message: accessCheck.message,
        code: accessCheck.code,
        error: accessCheck.error,
      };
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Use Better Auth admin API - type assertion for role
    const newUser = await auth.api.createUser({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role as "user" | "admin" | ("user" | "admin")[],
        data: data.data,
      },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} created user: ${data.email}`
    );

    return {
      success: true,
      message: "User created successfully",
      data: newUser.user as unknown as AdminUser,
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

    return {
      success: false,
      message: "Failed to create user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Set user role
 * Prevents admin from removing their own admin role
 * Audit: Logs role changes
 */
export async function setUserRole(
  data: SetUserRoleInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Prevent admin from removing their own admin role
    if (session!.user.id === data.userId) {
      const newRole = Array.isArray(data.role) ? data.role : [data.role];
      if (!newRole.includes("admin")) {
        return {
          success: false,
          message: "You cannot remove your own admin role",
          code: "SELF_ROLE_REMOVAL",
        };
      }
    }

    // Use Better Auth admin API - type assertion for role
    await auth.api.setRole({
      body: {
        userId: data.userId,
        role: data.role as "user" | "admin" | ("user" | "admin")[],
      },
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} changed role for user ${
        targetUser?.email
      } to: ${JSON.stringify(data.role)}`
    );

    return {
      success: true,
      message: "User role updated successfully",
    };
  } catch (error) {
    console.error("Set user role error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to set user role",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Ban a user
 * Prevents admin from banning themselves
 * Audit: Logs ban actions
 */
export async function banUser(
  data: BanUserInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Prevent admin from banning themselves
    if (session!.user.id === data.userId) {
      return {
        success: false,
        message: "You cannot ban yourself",
        code: "SELF_BAN",
      };
    }

    // Use Better Auth admin API
    await auth.api.banUser({
      body: data,
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} banned user ${
        targetUser?.email
      }. Reason: ${data.banReason || "No reason provided"}. Expires: ${
        data.banExpiresIn ? `${data.banExpiresIn} seconds` : "Never"
      }`
    );

    return {
      success: true,
      message: "User banned successfully",
    };
  } catch (error) {
    console.error("Ban user error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to ban user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Unban a user
 * Audit: Logs unban actions
 */
export async function unbanUser(
  userId: string
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Use Better Auth admin API
    await auth.api.unbanUser({
      body: { userId },
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} unbanned user ${targetUser?.email}`
    );

    return {
      success: true,
      message: "User unbanned successfully",
    };
  } catch (error) {
    console.error("Unban user error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to unban user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Impersonate a user
 * Creates a session as the target user
 * Audit: Logs impersonation actions
 */
export async function impersonateUser(
  data: ImpersonateUserInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Prevent admin from impersonating themselves
    if (session!.user.id === data.userId) {
      return {
        success: false,
        message: "You cannot impersonate yourself",
        code: "SELF_IMPERSONATE",
      };
    }

    // Use Better Auth admin API
    await auth.api.impersonateUser({
      body: data,
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} started impersonating user ${
        targetUser?.email
      }`
    );

    return {
      success: true,
      message: "User impersonation started successfully",
    };
  } catch (error) {
    console.error("Impersonate user error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to impersonate user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Stop impersonating user
 * Returns to admin session
 * Audit: Logs end of impersonation
 */
export async function stopImpersonating(): Promise<AdminActionResult<void>> {
  try {
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

    // Use Better Auth admin API
    await auth.api.stopImpersonating({
      headers: headersList,
    });

    // Audit log
    console.log(
      `[AUDIT] Admin stopped impersonating and returned to own session`
    );

    return {
      success: true,
      message: "Impersonation stopped successfully",
    };
  } catch (error) {
    console.error("Stop impersonating error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to stop impersonating",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Set user password (admin override)
 * Audit: Logs password resets
 */
export async function setUserPassword(
  data: SetUserPasswordInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Use Better Auth admin API
    await auth.api.setUserPassword({
      body: data,
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} reset password for user ${
        targetUser?.email
      }`
    );

    return {
      success: true,
      message: "User password updated successfully",
    };
  } catch (error) {
    console.error("Set user password error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to set user password",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update user details (admin)
 * Audit: Logs user updates
 */
export async function updateUser(
  data: UpdateUserInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Use Better Auth admin API
    await auth.api.adminUpdateUser({
      body: data,
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} updated user ${
        targetUser?.email
      }. Fields: ${Object.keys(data.data).join(", ")}`
    );

    return {
      success: true,
      message: "User updated successfully",
    };
  } catch (error) {
    console.error("Update user error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to update user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Remove user (hard delete)
 * Prevents deletion of last admin
 * Prevents admin from deleting themselves
 * Audit: Logs user deletions
 */
export async function removeUser(
  data: RemoveUserInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Prevent admin from deleting themselves
    if (session!.user.id === data.userId) {
      return {
        success: false,
        message: "You cannot delete your own account",
        code: "SELF_DELETE",
      };
    }

    // Check if target user is admin
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, role: true },
    });

    if (targetUser?.role === "admin") {
      // Count total admins
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });

      if (adminCount <= 1) {
        return {
          success: false,
          message: "Cannot delete the last admin account",
          code: "LAST_ADMIN",
        };
      }
    }

    // Use Better Auth admin API
    await auth.api.removeUser({
      body: data,
      headers: headersList,
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} deleted user ${targetUser?.email}`
    );

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Remove user error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to remove user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all sessions for a user
 * Audit: Logs session viewing
 */
export async function listUserSessions(
  data: ListUserSessionsInput
): Promise<AdminActionResult<UserSession[]>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return {
        success: false,
        message: accessCheck.message,
        code: accessCheck.code,
        error: accessCheck.error,
      };
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Use Better Auth admin API
    const result = await auth.api.listUserSessions({
      body: data,
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} viewed sessions for user ${
        targetUser?.email
      }`
    );

    return {
      success: true,
      message: "User sessions retrieved successfully",
      data: result.sessions as UserSession[],
    };
  } catch (error) {
    console.error("List user sessions error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to list user sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Revoke a specific user session
 * Audit: Logs session revocations
 */
export async function revokeUserSession(
  data: RevokeUserSessionInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Get session details for audit log
    const targetSession = await prisma.session.findUnique({
      where: { token: data.sessionToken },
      include: { user: { select: { email: true } } },
    });

    // Use Better Auth admin API
    await auth.api.revokeUserSession({
      body: data,
      headers: headersList,
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} revoked session for user ${
        targetSession?.user.email
      }`
    );

    return {
      success: true,
      message: "User session revoked successfully",
    };
  } catch (error) {
    console.error("Revoke user session error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to revoke user session",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Revoke all sessions for a user
 * Audit: Logs bulk session revocations
 */
export async function revokeUserSessions(
  data: RevokeUserSessionsInput
): Promise<AdminActionResult<void>> {
  try {
    // Verify admin access
    const accessCheck = await verifyAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Get target user for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    // Use Better Auth admin API
    await auth.api.revokeUserSessions({
      body: data,
      headers: headersList,
    });

    // Audit log
    console.log(
      `[AUDIT] Admin ${session!.user.email} revoked all sessions for user ${
        targetUser?.email
      }`
    );

    return {
      success: true,
      message: "All user sessions revoked successfully",
    };
  } catch (error) {
    console.error("Revoke user sessions error:", error);

    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: error.status.toString(),
      };
    }

    return {
      success: false,
      message: "Failed to revoke user sessions",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
