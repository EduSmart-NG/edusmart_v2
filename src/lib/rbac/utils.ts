/**
 * RBAC Utility Functions
 *
 * Reusable utilities for permission checking in server and client code.
 * Provides type-safe, consistent permission validation throughout the app.
 *
 * @module lib/rbac/utils
 */

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";
import type { Permission, RoleName } from "./permissions";

// ============================================
// TYPE HELPERS
// ============================================

/**
 * Mutable permission type for Better Auth API
 * Better Auth requires non-readonly arrays
 */
type MutablePermission = {
  [key: string]: string[];
};

/**
 * Convert readonly Permission to mutable for Better Auth API
 * Better Auth API doesn't accept readonly arrays, so we need to create mutable copies
 */
function convertToMutablePermissions(
  permissions: Permission
): MutablePermission {
  const mutable: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(permissions)) {
    if (value) {
      // Create mutable copy of the readonly array
      mutable[key] = Array.from(value);
    }
  }

  return mutable;
}

// ============================================
// SERVER-SIDE UTILITIES
// ============================================

/**
 * Check if current user has specific permission
 *
 * SERVER-SIDE ONLY - Use in Server Components and Server Actions
 *
 * @param permissions - Permissions to check (e.g., { question: ["upload"] })
 * @returns Promise<boolean> - True if user has permission
 *
 * @example
 * ```typescript
 * // In a Server Action
 * "use server";
 *
 * export async function uploadQuestion() {
 *   const canUpload = await hasPermission({ question: ["upload"] });
 *   if (!canUpload) {
 *     throw new Error("Unauthorized");
 *   }
 *   // ... upload logic
 * }
 * ```
 */
export async function hasPermission(permissions: Permission): Promise<boolean> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return false;
    }

    // Convert readonly arrays to mutable arrays for Better Auth API
    const mutablePermissions = convertToMutablePermissions(permissions);

    // Use Better Auth's userHasPermission API
    const result = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permissions: mutablePermissions,
      },
    });

    // Better Auth returns { success: boolean, error: null | Error }
    return result?.success === true;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Require specific permission or throw error
 *
 * SERVER-SIDE ONLY - Use in Server Actions when permission is mandatory
 *
 * @param permissions - Required permissions
 * @param errorMessage - Custom error message
 * @throws Error if user doesn't have permission
 *
 * @example
 * ```typescript
 * "use server";
 *
 * export async function deleteUser(userId: string) {
 *   await requirePermission(
 *     { user: ["delete"] },
 *     "You don't have permission to delete users"
 *   );
 *   // ... delete logic
 * }
 * ```
 */
export async function requirePermission(
  permissions: Permission,
  errorMessage = "Insufficient permissions"
): Promise<void> {
  const hasAccess = await hasPermission(permissions);

  if (!hasAccess) {
    throw new Error(errorMessage);
  }
}

/**
 * Check if current user has specific role
 *
 * SERVER-SIDE ONLY - Use for simple role checks
 * Note: Prefer permission checks over role checks for better granularity
 *
 * @param role - Role name to check
 * @returns Promise<boolean> - True if user has the role
 *
 * @example
 * ```typescript
 * const isAdmin = await hasRole("admin");
 * if (isAdmin) {
 *   // Show admin dashboard
 * }
 * ```
 */
export async function hasRole(role: RoleName): Promise<boolean> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !user.role) {
      return false;
    }

    // Handle multiple roles (comma-separated)
    const userRoles = user.role.split(",").map((r) => r.trim());
    return userRoles.includes(role);
  } catch (error) {
    console.error("Role check error:", error);
    return false;
  }
}

/**
 * Get current user's role
 *
 * SERVER-SIDE ONLY
 *
 * @returns Promise<RoleName | null> - User's role or null if not authenticated
 *
 * @example
 * ```typescript
 * const role = await getCurrentUserRole();
 * if (role === "admin") {
 *   // Admin-specific logic
 * }
 * ```
 */
export async function getCurrentUserRole(): Promise<RoleName | null> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    return (user?.role as RoleName) || "user";
  } catch (error) {
    console.error("Get role error:", error);
    return null;
  }
}

/**
 * Verify user has admin access
 *
 * Comprehensive check for admin permissions including:
 * - Session validity
 * - Admin role
 * - Not banned
 *
 * @returns Object with success status and error message
 *
 * @example
 * ```typescript
 * export async function adminOnlyAction() {
 *   const accessCheck = await verifyAdminAccess();
 *
 *   if (!accessCheck.success) {
 *     return {
 *       success: false,
 *       message: accessCheck.message,
 *     };
 *   }
 *
 *   // ... admin action logic
 * }
 * ```
 */
export async function verifyAdminAccess(): Promise<{
  success: boolean;
  message?: string;
  userId?: string;
}> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return {
        success: false,
        message: "No active session found. Please sign in.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, banned: true },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    if (user.banned) {
      return {
        success: false,
        message: "Your account has been banned",
      };
    }

    if (user.role !== "admin") {
      return {
        success: false,
        message: "You do not have the permission to perform this operation",
      };
    }

    return {
      success: true,
      userId: session.user.id,
    };
  } catch (error) {
    console.error("Admin verification error:", error);
    return {
      success: false,
      message: "Failed to verify admin access",
    };
  }
}

/**
 * Check if current user has multiple permissions
 *
 * SERVER-SIDE ONLY
 *
 * @param permissionsList - Array of permissions to check
 * @returns Promise<boolean> - True if user has ALL permissions
 *
 * @example
 * ```typescript
 * const hasAll = await hasAllPermissions([
 *   { question: ["upload"] },
 *   { question: ["edit"] },
 * ]);
 * ```
 */
export async function hasAllPermissions(
  permissionsList: Permission[]
): Promise<boolean> {
  try {
    const results = await Promise.all(
      permissionsList.map((permissions) => hasPermission(permissions))
    );
    return results.every((result) => result === true);
  } catch (error) {
    console.error("Multiple permission check error:", error);
    return false;
  }
}

/**
 * Check if current user has any of the specified permissions
 *
 * SERVER-SIDE ONLY
 *
 * @param permissionsList - Array of permissions to check
 * @returns Promise<boolean> - True if user has ANY of the permissions
 *
 * @example
 * ```typescript
 * const hasAny = await hasAnyPermission([
 *   { question: ["upload"] },
 *   { question: ["edit"] },
 * ]);
 * ```
 */
export async function hasAnyPermission(
  permissionsList: Permission[]
): Promise<boolean> {
  try {
    const results = await Promise.all(
      permissionsList.map((permissions) => hasPermission(permissions))
    );
    return results.some((result) => result === true);
  } catch (error) {
    console.error("Any permission check error:", error);
    return false;
  }
}

// ============================================
// CLIENT-SIDE UTILITIES
// ============================================

/**
 * Check permission on client side (for UI only)
 *
 * CLIENT-SIDE ONLY - Use in Client Components
 * WARNING: This is for UI display only. Always verify server-side.
 *
 * @param permissions - Permissions to check
 * @returns Promise<boolean>
 *
 * @example
 * ```typescript
 * "use client";
 *
 * export function UploadButton() {
 *   const [canUpload, setCanUpload] = useState(false);
 *
 *   useEffect(() => {
 *     checkPermissionClient({ question: ["upload"] })
 *       .then(setCanUpload);
 *   }, []);
 *
 *   if (!canUpload) return null;
 *   return <button>Upload</button>;
 * }
 * ```
 */
export async function checkPermissionClient(
  permissions: Permission
): Promise<boolean> {
  try {
    const session = await authClient.getSession();

    if (!session?.data?.user?.id) {
      return false;
    }

    // Convert readonly arrays to mutable arrays for Better Auth API
    const mutablePermissions = convertToMutablePermissions(permissions);

    const result = await authClient.admin.hasPermission({
      userId: session.data.user.id,
      permissions: mutablePermissions,
    });

    // Client API returns { data: { success: boolean } | null, error: ... }
    return result?.data?.success === true;
  } catch (error) {
    console.error("Client permission check error:", error);
    return false;
  }
}

/**
 * Check role on client side (for UI only)
 *
 * CLIENT-SIDE ONLY
 * WARNING: This is for UI display only. Always verify server-side.
 *
 * @param role - Role name to check
 * @returns Promise<boolean>
 *
 * @example
 * ```typescript
 * "use client";
 *
 * export function AdminButton() {
 *   const [isAdmin, setIsAdmin] = useState(false);
 *
 *   useEffect(() => {
 *     checkRoleClient("admin").then(setIsAdmin);
 *   }, []);
 *
 *   if (!isAdmin) return null;
 *   return <button>Admin Panel</button>;
 * }
 * ```
 */
export async function checkRoleClient(role: RoleName): Promise<boolean> {
  try {
    const session = await authClient.getSession();

    if (!session?.data?.user) {
      return false;
    }

    // Better Auth session includes role
    const userRole = (session.data.user as { role?: string }).role;

    if (!userRole) {
      return role === "user"; // Default role
    }

    // Handle multiple roles
    const userRoles = userRole.split(",").map((r) => r.trim());
    return userRoles.includes(role);
  } catch (error) {
    console.error("Client role check error:", error);
    return false;
  }
}

/**
 * Get current user's role on client side
 *
 * CLIENT-SIDE ONLY
 *
 * @returns Promise<RoleName | null>
 *
 * @example
 * ```typescript
 * "use client";
 *
 * export function UserInfo() {
 *   const [role, setRole] = useState<RoleName | null>(null);
 *
 *   useEffect(() => {
 *     getCurrentUserRoleClient().then(setRole);
 *   }, []);
 *
 *   return <p>Your role: {role}</p>;
 * }
 * ```
 */
export async function getCurrentUserRoleClient(): Promise<RoleName | null> {
  try {
    const session = await authClient.getSession();

    if (!session?.data?.user) {
      return null;
    }

    const userRole = (session.data.user as { role?: string }).role;
    return (userRole as RoleName) || "user";
  } catch (error) {
    console.error("Get client role error:", error);
    return null;
  }
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Permission check result for server actions
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Create a permission check result
 *
 * @param allowed - Whether permission is allowed
 * @param reason - Optional reason for denial
 * @returns PermissionCheckResult
 *
 * @example
 * ```typescript
 * return createPermissionResult(false, "User is banned");
 * ```
 */
export function createPermissionResult(
  allowed: boolean,
  reason?: string
): PermissionCheckResult {
  return { allowed, reason };
}
