import { Gender } from "@/generated/prisma";

/**
 * Admin user with full profile including admin fields
 */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string;
  displayUsername: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  phoneNumber: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
  schoolName: string | null;
  twoFactorEnabled: boolean;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User list query parameters for filtering, searching, and pagination
 * Based on Better Auth admin plugin listUsers API
 */
export interface UserListQuery {
  searchValue?: string;
  searchField?: "email" | "name"; // Better Auth only supports email and name
  searchOperator?: "contains" | "starts_with" | "ends_with";
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterField?: string;
  filterValue?: string | number | boolean;
  filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte";
}

/**
 * User list response with pagination metadata
 */
export interface UserListResponse {
  users: AdminUser[];
  total: number;
  limit: number | undefined;
  offset: number | undefined;
}

/**
 * Ban user input with reason and expiration
 */
export interface BanUserInput {
  userId: string;
  banReason?: string;
  banExpiresIn?: number; // seconds until ban expires
}

/**
 * Unban user input
 */
export interface UnbanUserInput {
  userId: string;
}

/**
 * Set user role input
 */
export interface SetUserRoleInput {
  userId: string;
  role: string | string[];
}

/**
 * Set user password input (admin override)
 */
export interface SetUserPasswordInput {
  userId: string;
  newPassword: string;
}

/**
 * Additional user data for create user
 * Includes all optional user fields from the schema
 */
export interface CreateUserData {
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE";
  phoneNumber?: string;
  address?: string;
  state?: string;
  lga?: string;
  schoolName?: string;
  [key: string]: string | boolean | number | undefined;
}

/**
 * Create user input (admin)
 */
export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: string | string[];
  data?: CreateUserData;
}

/**
 * Update user data
 * Allows updating any user field
 */
export interface UpdateUserData {
  name?: string;
  email?: string;
  image?: string | null;
  dateOfBirth?: Date | string;
  gender?: "MALE" | "FEMALE";
  phoneNumber?: string | null;
  address?: string | null;
  state?: string | null;
  lga?: string | null;
  schoolName?: string | null;
  role?: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  [key: string]: string | boolean | number | Date | null | undefined;
}

/**
 * Update user input (admin)
 */
export interface UpdateUserInput {
  userId: string;
  data: UpdateUserData;
}

/**
 * Impersonate user input
 */
export interface ImpersonateUserInput {
  userId: string;
}

/**
 * Remove user input (hard delete)
 */
export interface RemoveUserInput {
  userId: string;
}

/**
 * List user sessions input
 */
export interface ListUserSessionsInput {
  userId: string;
}

/**
 * Revoke user session input
 */
export interface RevokeUserSessionInput {
  sessionToken: string;
}

/**
 * Revoke all user sessions input
 */
export interface RevokeUserSessionsInput {
  userId: string;
}

/**
 * User session information
 */
export interface UserSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  impersonatedBy: string | null;
}

/**
 * Generic admin action result
 */
export interface AdminActionResult<T = void> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Admin statistics for dashboard
 */
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

/**
 * Audit log details type
 */
export interface AuditLogDetails {
  action: string;
  fields?: string[];
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  reason?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Audit log entry for admin actions
 */
export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: AdminAction;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: AuditLogDetails;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

/**
 * Admin action types for audit logging
 */
export type AdminAction =
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "BAN_USER"
  | "UNBAN_USER"
  | "SET_ROLE"
  | "SET_PASSWORD"
  | "IMPERSONATE_USER"
  | "REVOKE_SESSION"
  | "REVOKE_ALL_SESSIONS"
  | "LIST_USERS"
  | "VIEW_USER_SESSIONS";

/**
 * Admin permission check result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
}

/**
 * Result of admin user creation
 * Contains created user details and temporary password for logging
 *
 * SECURITY: tempPassword should ONLY be used for server-side logging
 * and NEVER sent to the client or stored in plaintext
 */
export interface CreateUserAdminResult {
  /**
   * The newly created user object
   */
  user: AdminUser;

  /**
   * Temporary password generated for the user
   *
   * CRITICAL SECURITY NOTES:
   * - This password is for server-side audit logging ONLY
   * - NEVER send this to the client in API responses
   * - NEVER store this in database (Better Auth handles hashing)
   * - Must be communicated to user via secure channel (email, when implemented)
   */
  tempPassword: string;
}
