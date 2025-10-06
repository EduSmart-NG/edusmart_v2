import { Gender } from "@/generated/prisma";
import type { RegisterInput } from "@/lib/validations/auth";

/**
 * User profile interface with all user fields
 * Includes both username (normalized) and displayUsername (original casing)
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string; // Normalized (lowercase) username
  displayUsername: string; // Original username with preserved casing
  dateOfBirth: Date;
  gender: Gender;
  phoneNumber: string | null;
  address: string | null;
  state: string;
  lga: string;
  schoolName: string | null;
  createdAt: Date;
  updatedAt: Date;
  twoFactorEnabled: boolean;
}

/**
 * Registration form data with confirm password field
 */
export interface RegistrationFormData extends RegisterInput {
  confirmPassword?: string;
}

/**
 * Registration response from server action
 */
export interface RegistrationResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  redirectTo?: string;
}

/**
 * Form validation errors
 */
export interface FormErrors {
  [key: string]: string | undefined;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  id: "google" | "facebook" | "tiktok";
  name: string;
  icon: string;
}

/**
 * Available OAuth providers
 */
export const oAuthProviders: OAuthProvider[] = [
  { id: "google", name: "Google", icon: "google" },
  { id: "facebook", name: "Facebook", icon: "facebook" },
  { id: "tiktok", name: "TikTok", icon: "tiktok" },
];

/**
 * Location data for Nigerian states and LGAs
 */
export interface LocationData {
  state: string;
  lgas: string[];
}

/**
 * Registration step configuration
 */
export interface RegistrationStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
}

/**
 * Username availability check result
 */
export interface UsernameAvailability {
  available: boolean;
  message?: string;
}

/**
 * Session user data
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string;
  displayUsername: string;
  twoFactorEnabled: boolean; // Added for 2FA support
}

/**
 * Auth context state
 */
export interface AuthContextState {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Login form data structure
 */
export interface LoginFormData {
  identifier: string; // Email or username
  password: string;
  rememberMe: boolean;
}

/**
 * Login error structure
 */
export interface LoginError {
  field?: string;
  message: string;
}

/**
 * Login result from server action
 */
export interface LoginResult {
  success: boolean;
  message: string;
  code?:
    | "UNVERIFIED_EMAIL"
    | "INVALID_CREDENTIALS"
    | "RATE_LIMITED"
    | "ACCOUNT_LOCKED"
    | "CAPTCHA_FAILED"
    | "UNKNOWN_ERROR";
  errors?: Record<string, string>;
  retryAfter?: number; // Seconds to wait before retry
  redirectTo?: string;
  userEmail?: string; // For resend verification
  twoFactorRedirect?: boolean; // NEW: Indicates 2FA verification is required
}

/**
 * Account lockout data stored in Redis
 */
export interface AccountLockoutData {
  attempts: number;
  lastAttempt: string; // ISO timestamp
  lockedUntil?: string; // ISO timestamp
  isLocked: boolean;
}

/**
 * Resend verification result
 */
export interface ResendVerificationResult {
  success: boolean;
  message: string;
}

/**
 * Password reset request result from server action
 */
export interface PasswordResetRequestResult {
  success: boolean;
  message: string;
  code?: "EMAIL_SENT" | "RATE_LIMITED" | "INVALID_EMAIL" | "UNKNOWN_ERROR";
  retryAfter?: number; // Seconds to wait before retry (for rate limiting)
}

/**
 * Password reset result from server action
 */
export interface PasswordResetResult {
  success: boolean;
  message: string;
  code?:
    | "PASSWORD_RESET"
    | "INVALID_TOKEN"
    | "EXPIRED_TOKEN"
    | "WEAK_PASSWORD"
    | "UNKNOWN_ERROR";
  redirectTo?: string; // URL to redirect after successful reset
}

/**
 * Password reset rate limit data stored in Redis
 */
export interface PasswordResetRateLimitData {
  attempts: number;
  firstAttempt: string; // ISO timestamp
  blockedUntil?: string; // ISO timestamp
  isBlocked: boolean;
}

/**
 * Two-factor authentication verification result
 */
export interface TwoFactorVerifyResult {
  success: boolean;
  message: string;
  code?:
    | "VERIFIED"
    | "INVALID_CODE"
    | "EXPIRED_CODE"
    | "NO_SESSION"
    | "UNKNOWN_ERROR";
  redirectTo?: string;
}

/**
 * Two-factor authentication enable result
 */
export interface TwoFactorEnableResult {
  success: boolean;
  message: string;
  totpURI?: string; // For QR code generation
  backupCodes?: string[]; // Recovery codes
  code?: "ENABLED" | "INVALID_PASSWORD" | "ALREADY_ENABLED" | "UNKNOWN_ERROR";
}

/**
 * Two-factor authentication disable result
 */
export interface TwoFactorDisableResult {
  success: boolean;
  message: string;
  code?: "DISABLED" | "INVALID_PASSWORD" | "NOT_ENABLED" | "UNKNOWN_ERROR";
}

/**
 * Backup codes view result
 */
export interface BackupCodesViewResult {
  success: boolean;
  message: string;
  backupCodes?: string[];
  code?: "SUCCESS" | "NO_CODES" | "UNAUTHORIZED" | "UNKNOWN_ERROR";
}

/**
 * Backup codes regenerate result
 */
export interface BackupCodesRegenerateResult {
  success: boolean;
  message: string;
  backupCodes?: string[];
  code?: "REGENERATED" | "INVALID_PASSWORD" | "UNAUTHORIZED" | "UNKNOWN_ERROR";
}
