/**
 * Two-Factor Authentication Types
 *
 * Type definitions for 2FA functionality including TOTP, OTP, and backup codes
 */

/**
 * Input for enabling 2FA
 */
export interface Enable2FAInput {
  password: string;
  issuer?: string;
}

/**
 * Result from enabling 2FA
 * Contains TOTP URI for QR code and backup codes for recovery
 *
 * Note: backupCodes is returned as string[] from the API
 * even though it's stored as an encrypted string in the database
 */
export interface Enable2FAResult {
  totpURI: string;
  backupCodes: string[];
}

/**
 * Input for verifying 2FA code (TOTP only)
 * Better Auth 2FA plugin only uses TOTP verification
 */
export interface Verify2FAInput {
  code: string;
  trustDevice?: boolean;
}

/**
 * Input for verifying backup code
 */
export interface VerifyBackupCodeInput {
  code: string;
  trustDevice?: boolean;
  disableSession?: boolean;
}

/**
 * Input for generating new backup codes
 */
export interface GenerateBackupCodesInput {
  password: string;
}

/**
 * Result from generating backup codes
 */
export interface GenerateBackupCodesResult {
  backupCodes: string[];
}

/**
 * Input for viewing existing backup codes
 */
export interface ViewBackupCodesInput {
  password: string;
}

/**
 * Result from viewing backup codes
 */
export interface ViewBackupCodesResult {
  backupCodes: string[];
}

/**
 * Input for getting TOTP URI
 */
export interface GetTOTPUriInput {
  password: string;
}

/**
 * Result from getting TOTP URI
 */
export interface GetTOTPUriResult {
  totpURI: string;
}

/**
 * Input for disabling 2FA
 */
export interface Disable2FAInput {
  password: string;
}

/**
 * 2FA status information
 */
export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
  trustedDevicesCount: number;
  enabledAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Trusted device information
 */
export interface TrustedDevice {
  id: string;
  deviceInfo: {
    browser?: string;
    os?: string;
    device?: string;
  };
  ipAddress: string | null;
  trustedAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

/**
 * 2FA method types
 */
export enum TwoFactorMethod {
  TOTP = "TOTP",
  OTP = "OTP",
  BACKUP_CODE = "BACKUP_CODE",
}

/**
 * 2FA verification result
 */
export interface TwoFactorVerificationResult {
  success: boolean;
  message: string;
  method?: TwoFactorMethod;
  deviceTrusted?: boolean;
}

/**
 * Action result for 2FA operations
 */
export interface TwoFactorActionResult<T = void> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * 2FA setup step
 */
export enum TwoFactorSetupStep {
  PASSWORD_VERIFICATION = 1,
  SETUP_TOTP = 2,
  VERIFY_TOTP = 3,
  SAVE_BACKUP_CODES = 4,
  COMPLETE = 5,
}

/**
 * 2FA setup state
 */
export interface TwoFactorSetupState {
  step: TwoFactorSetupStep;
  totpURI?: string;
  backupCodes?: string[];
  verificationAttempts: number;
  maxAttempts: number;
}

/**
 * Password strength for 2FA setup
 */
export interface PasswordStrength {
  score: number; // 0-4
  label: "weak" | "fair" | "good" | "strong";
  feedback: string[];
}

/**
 * 2FA configuration options
 */
export interface TwoFactorConfig {
  totpPeriod: number; // seconds
  totpDigits: number;
  otpPeriod: number; // minutes
  backupCodesAmount: number;
  backupCodesLength: number;
  trustedDeviceDuration: number; // days
}
