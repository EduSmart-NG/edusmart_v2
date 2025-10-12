/**
 * RBAC Type Definitions
 *
 * Type-safe definitions for role-based access control throughout the app.
 *
 * @module types/rbac
 */

import type { RoleName, Permission } from "@/lib/rbac/permissions";

// ============================================
// PERMISSION TYPES
// ============================================

/**
 * Permission check context
 * Used when checking permissions in server actions
 */
export interface PermissionContext {
  userId: string;
  userRole: RoleName;
  userEmail: string;
}

/**
 * Permission requirement
 * Used to specify what permissions are needed for an action
 */
export interface PermissionRequirement {
  permission?: Permission;
  role?: RoleName;
  description?: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  userId?: string;
  userRole?: RoleName;
}

// ============================================
// ROLE TYPES
// ============================================

/**
 * Role information
 */
export interface RoleInfo {
  name: RoleName;
  displayName: string;
  description: string;
  permissions: Permission;
}

/**
 * All available roles with metadata
 */
export const ROLE_INFO: Record<RoleName, Omit<RoleInfo, "name">> = {
  admin: {
    displayName: "Administrator",
    description: "Full system access with all permissions",
    permissions: {
      // Better Auth admin permissions
      user: [
        "create",
        "list",
        "set-role",
        "ban",
        "impersonate",
        "delete",
        "set-password",
      ],
      session: ["list", "revoke", "delete"],
      // Custom permissions
      question: ["upload", "view", "edit", "delete"],
      exam: ["take", "view-results", "create", "manage"],
      profile: ["view", "update", "delete"],
    },
  },
  exam_manager: {
    displayName: "Exam Manager",
    description: "Can upload questions and take exams",
    permissions: {
      question: ["upload", "view"],
      exam: ["take", "view-results"],
      profile: ["view", "update"],
    },
  },
  user: {
    displayName: "User",
    description: "Basic user access to take exams",
    permissions: {
      question: ["view"],
      exam: ["take", "view-results"],
      profile: ["view", "update"],
    },
  },
};

// ============================================
// SERVER ACTION TYPES
// ============================================

/**
 * Standard server action result with permission context
 */
export interface ProtectedActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: string;
  permissionDenied?: boolean;
  requiredPermission?: Permission;
  userRole?: RoleName;
}

/**
 * Helper to create a permission denied result
 */
export function createPermissionDeniedResult(
  message: string,
  requiredPermission: Permission,
  userRole?: RoleName
): ProtectedActionResult {
  return {
    success: false,
    message,
    permissionDenied: true,
    requiredPermission,
    userRole,
    code: "PERMISSION_DENIED",
  };
}

/**
 * Helper to create a success result
 */
export function createSuccessResult<T>(
  message: string,
  data?: T
): ProtectedActionResult<T> {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Helper to create an error result
 */
export function createErrorResult(
  message: string,
  code?: string,
  error?: string
): ProtectedActionResult {
  return {
    success: false,
    message,
    code,
    error,
  };
}

// ============================================
// UI PERMISSION TYPES
// ============================================

/**
 * Permission guard props
 * Used by PermissionGuard component
 */
export interface PermissionGuardProps {
  permission?: Permission;
  role?: RoleName;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * Permission state for React hooks
 */
export interface PermissionState {
  isAllowed: boolean;
  isLoading: boolean;
  error: Error | null;
  userRole: RoleName | null;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

/**
 * Permission audit log entry
 * Used for tracking permission checks and violations
 */
export interface PermissionAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: RoleName;
  action: string;
  resource: string;
  permission: Permission;
  allowed: boolean;
  reason?: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Role validation result
 */
export interface RoleValidationResult {
  valid: boolean;
  role: RoleName | null;
  error?: string;
}

/**
 * Validate role string
 */
export function validateRole(
  role: string | null | undefined
): RoleValidationResult {
  if (!role) {
    return {
      valid: true,
      role: "user", // Default role
    };
  }

  const validRoles: RoleName[] = ["admin", "exam_manager", "user"];

  // Handle multiple roles (comma-separated)
  const roles = role.split(",").map((r) => r.trim());
  const primaryRole = roles[0];

  if (!validRoles.includes(primaryRole as RoleName)) {
    return {
      valid: false,
      role: null,
      error: `Invalid role: ${primaryRole}`,
    };
  }

  return {
    valid: true,
    role: primaryRole as RoleName,
  };
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Error messages for permission violations
 */
export const PERMISSION_ERRORS = {
  NO_SESSION: "Authentication required. Please sign in.",
  INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action.",
  INVALID_ROLE: "Invalid user role.",
  USER_BANNED: "Your account has been banned.",
  USER_NOT_FOUND: "User not found.",
  PERMISSION_CHECK_FAILED: "Failed to verify permissions.",
} as const;

/**
 * Success messages for permission operations
 */
export const PERMISSION_SUCCESS = {
  PERMISSION_GRANTED: "Permission granted.",
  ROLE_UPDATED: "User role updated successfully.",
  ACCESS_VERIFIED: "Access verified.",
} as const;
