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
  displayUsername: string; // ✅ ADDED: Original username with preserved casing
  dateOfBirth: Date;
  gender: Gender;
  phoneNumber: string | null;
  address: string | null;
  state: string;
  lga: string;
  schoolName: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  displayUsername: string; // ✅ ADDED: For displaying username with original casing
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
    | "UNKNOWN_ERROR";
  errors?: Record<string, string>;
  retryAfter?: number; // Seconds to wait before retry
  redirectTo?: string;
  userEmail?: string; // For resend verification
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
