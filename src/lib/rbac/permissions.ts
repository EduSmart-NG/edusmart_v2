/**
 * RBAC Permissions Configuration
 *
 * Centralized permissions system using Better Auth's access control.
 * Defines resources, actions, and roles with granular permissions.
 *
 * Roles:
 * - admin: Full system access
 * - exam_manager: Question upload + regular user access
 * - user: Basic user access (default)
 *
 * @module lib/rbac/permissions
 */

import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// ============================================
// PERMISSIONS STATEMENT
// ============================================

/**
 * Define all available resources and their actions
 *
 * Resources:
 * - user: User management (Better Auth default)
 * - session: Session management (Better Auth default)
 * - question: Question bank operations (custom)
 * - exam: Exam operations (custom)
 * - profile: User profile operations (custom)
 */
export const statement = {
  // Merge Better Auth's default admin statements
  ...defaultStatements,

  // Custom resource: Question management
  question: ["upload", "view", "edit", "delete"] as const,

  // Custom resource: Exam operations
  exam: ["take", "view-results", "create", "manage"] as const,

  // Custom resource: Profile management
  profile: ["view", "update", "delete"] as const,
} as const;

// ============================================
// ACCESS CONTROLLER
// ============================================

/**
 * Create access controller with our statement
 * This provides type-safe role creation
 */
export const ac = createAccessControl(statement);

// ============================================
// ROLE DEFINITIONS
// ============================================

/**
 * Admin Role
 *
 * Full system access - can do everything
 * Includes all Better Auth default admin permissions
 */
export const admin = ac.newRole({
  // Better Auth defaults (user management)
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
});

/**
 * Exam Manager Role
 *
 * Can upload questions but otherwise acts as a regular user
 * No user management, no session management
 */
export const examManager = ac.newRole({
  // No Better Auth admin permissions
  user: [],
  session: [],

  // Can upload questions (special permission)
  question: ["upload", "view"],

  // Regular user exam permissions
  exam: ["take", "view-results"],

  // Regular user profile permissions
  profile: ["view", "update"],
});

/**
 * User Role (Default)
 *
 * Basic user access - can take exams and manage own profile
 * No question upload, no user management
 */
export const user = ac.newRole({
  // No Better Auth admin permissions
  user: [],
  session: [],

  // Can only view questions (during exam)
  question: ["view"],

  // Can take exams and view own results
  exam: ["take", "view-results"],

  // Can view and update own profile
  profile: ["view", "update"],
});

// ============================================
// ROLE MAPPING
// ============================================

/**
 * Map role names to role objects
 * Used by Better Auth admin plugin
 */
export const roles = {
  admin,
  exam_manager: examManager, // Database stores as "exam_manager"
  user,
} as const;

// ============================================
// TYPE EXPORTS
// ============================================

/**
 * Role names type
 */
export type RoleName = keyof typeof roles;

/**
 * Resource names type
 */
export type ResourceName = keyof typeof statement;

/**
 * Actions for a specific resource
 */
export type ActionsForResource<R extends ResourceName> =
  (typeof statement)[R][number];

/**
 * Permission type (resource + actions)
 */
export type Permission = {
  [K in ResourceName]?: readonly ActionsForResource<K>[];
};
