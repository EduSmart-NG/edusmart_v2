import { Gender } from "@/generated/prisma";
import { DeviceInfo } from "@/lib/utils/device-parser";

/**
 * Session data structure from Better Auth
 */
export interface SessionData {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  user: {
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
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Detailed session information for device management
 */
export interface DeviceSession {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
  deviceInfo?: DeviceInfo; // Changed from the old type to DeviceInfo
}
/**
 * User profile update input
 */
export interface UpdateUserProfileInput {
  name?: string;
  phoneNumber?: string;
  address?: string;
  state?: string;
  lga?: string;
  schoolName?: string;
  image?: string;
  dateOfBirth?: Date;
  gender?: Gender;
}

/**
 * Change email input with verification
 */
export interface ChangeEmailInput {
  newEmail: string;
  callbackURL?: string;
}

/**
 * Change password input
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}

/**
 * Delete account input with verification options
 */
export interface DeleteAccountInput {
  password?: string;
  token?: string;
  callbackURL?: string;
}
/**
 * Account linking input
 */
export interface LinkAccountInput {
  provider: "google" | "facebook" | "tiktok";
  callbackURL?: string;
  scopes?: string[];
  idToken?: {
    token: string;
    nonce?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

/**
 * Account unlinking input
 */
export interface UnlinkAccountInput {
  providerId: string;
  accountId?: string;
}

/**
 * User account information
 */
export interface UserAccount {
  id: string;
  providerId: string;
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  createdAt: Date;
}

/**
 * Action result with success status
 */
export interface ActionResult<T = void> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Session revocation result
 */
export interface SessionRevocationResult extends ActionResult {
  revokedCount?: number;
}

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  EMAIL_CHANGED = "EMAIL_CHANGED",
  PROFILE_UPDATED = "PROFILE_UPDATED",
  SESSION_REVOKED = "SESSION_REVOKED",
  ACCOUNT_LINKED = "ACCOUNT_LINKED",
  ACCOUNT_UNLINKED = "ACCOUNT_UNLINKED",
  ACCOUNT_DELETED = "ACCOUNT_DELETED",
  FAILED_LOGIN = "FAILED_LOGIN",
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
}

/**
 * Security event for audit trail
 */
export interface SecurityEvent {
  userId: string;
  type: SecurityEventType;
  ipAddress: string | null;
  userAgent: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * User management hook state
 */
export interface UserManagementState {
  session: SessionData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

/**
 * User management hook return type
 */
export interface UseUserManagementReturn extends UserManagementState {
  // Session management
  refreshSession: () => Promise<void>;
  clearSession: () => void;

  // Profile management
  updateProfile: (
    data: UpdateUserProfileInput
  ) => Promise<ActionResult<SessionData>>;
  changeEmail: (data: ChangeEmailInput) => Promise<ActionResult>;
  changePassword: (data: ChangePasswordInput) => Promise<ActionResult>;
  deleteAccount: (data: DeleteAccountInput) => Promise<ActionResult>;

  // Session management
  listSessions: () => Promise<ActionResult<DeviceSession[]>>;
  revokeSession: (token: string) => Promise<SessionRevocationResult>;
  revokeOtherSessions: () => Promise<SessionRevocationResult>;
  revokeAllSessions: () => Promise<SessionRevocationResult>;

  // Account management
  listAccounts: () => Promise<ActionResult<UserAccount[]>>;
  linkAccount: (data: LinkAccountInput) => Promise<ActionResult>;
  unlinkAccount: (data: UnlinkAccountInput) => Promise<ActionResult>;
}

/**
 * User management context value
 */
export interface UserManagementContextValue extends UseUserManagementReturn {
  // Additional context-specific properties
  isFreshSession: boolean;
  sessionExpiresAt: Date | null;
}
