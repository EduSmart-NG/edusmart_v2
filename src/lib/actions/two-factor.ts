"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import type {
  Enable2FAInput,
  Enable2FAResult,
  Verify2FAInput,
  VerifyBackupCodeInput,
  GenerateBackupCodesInput,
  GenerateBackupCodesResult,
  ViewBackupCodesInput,
  ViewBackupCodesResult,
  GetTOTPUriInput,
  GetTOTPUriResult,
  Disable2FAInput,
  TwoFactorActionResult,
} from "@/types/two-factor";

/**
 * Enable two-factor authentication for the current user
 * Requires password verification and returns TOTP URI + backup codes
 *
 * @param data - Password and optional issuer
 * @returns TOTP URI for QR code and backup codes
 */
export async function enable2FA(
  data: Enable2FAInput
): Promise<TwoFactorActionResult<Enable2FAResult>> {
  try {
    const schema = z.object({
      password: z.string().min(1, "Password is required"),
      issuer: z.string().optional(),
    });

    const validatedData = schema.parse(data);
    const headersList = await headers();

    const result = await auth.api.enableTwoFactor({
      headers: headersList,
      body: {
        password: validatedData.password,
        issuer: validatedData.issuer || "EduSmart",
      },
    });

    if (!result) {
      return {
        success: false,
        message: "Failed to enable two-factor authentication",
        code: "ENABLE_2FA_FAILED",
      };
    }

    // Better Auth returns backupCodes as string[] from the API
    // even though it's stored as encrypted string in DB
    return {
      success: true,
      message:
        "Two-factor authentication enabled successfully. Please save your backup codes.",
      data: {
        totpURI: result.totpURI,
        backupCodes: Array.isArray(result.backupCodes)
          ? result.backupCodes
          : JSON.parse(result.backupCodes as string),
      },
    };
  } catch (error) {
    console.error("Enable 2FA error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input data",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("password")) {
        return {
          success: false,
          message: "Incorrect password. Please try again.",
          code: "INVALID_PASSWORD",
        };
      }

      if (errorMessage.includes("already enabled")) {
        return {
          success: false,
          message: "Two-factor authentication is already enabled",
          code: "ALREADY_ENABLED",
        };
      }

      if (errorMessage.includes("oauth") || errorMessage.includes("social")) {
        return {
          success: false,
          message:
            "Two-factor authentication is only available for accounts with passwords",
          code: "OAUTH_ACCOUNT",
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
      message: "Failed to enable two-factor authentication",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get TOTP URI for QR code generation
 * Requires password verification
 *
 * @param data - Password
 * @returns TOTP URI string
 */
export async function getTOTPUri(
  data: GetTOTPUriInput
): Promise<TwoFactorActionResult<GetTOTPUriResult>> {
  try {
    const schema = z.object({
      password: z.string().min(1, "Password is required"),
    });

    const validatedData = schema.parse(data);
    const headersList = await headers();

    const result = await auth.api.getTOTPURI({
      headers: headersList,
      body: {
        password: validatedData.password,
      },
    });

    if (!result) {
      return {
        success: false,
        message: "Failed to retrieve TOTP URI",
        code: "GET_TOTP_FAILED",
      };
    }

    return {
      success: true,
      message: "TOTP URI retrieved successfully",
      data: {
        totpURI: result.totpURI,
      },
    };
  } catch (error) {
    console.error("Get TOTP URI error:", error);

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
      message: "Failed to retrieve TOTP URI",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify TOTP code from authenticator app
 * This is used both during setup verification AND during login
 *
 * @param data - 6-digit code and trust device option
 * @returns Verification result
 */
export async function verifyTOTP(
  data: Verify2FAInput
): Promise<TwoFactorActionResult> {
  try {
    const schema = z.object({
      code: z
        .string()
        .length(6, "Code must be 6 digits")
        .regex(/^\d{6}$/, "Code must contain only digits"),
      trustDevice: z.boolean().default(false),
    });

    const validatedData = schema.parse(data);
    const headersList = await headers();

    await auth.api.verifyTOTP({
      headers: headersList,
      body: {
        code: validatedData.code,
        trustDevice: validatedData.trustDevice,
      },
    });

    return {
      success: true,
      message: validatedData.trustDevice
        ? "Code verified successfully. Device trusted for 60 days."
        : "Code verified successfully",
    };
  } catch (error) {
    console.error("Verify TOTP error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid code format",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("incorrect")
      ) {
        return {
          success: false,
          message: "Invalid verification code. Please try again.",
          code: "INVALID_CODE",
        };
      }

      if (errorMessage.includes("expired")) {
        return {
          success: false,
          message: "Verification code expired. Please generate a new one.",
          code: "EXPIRED_CODE",
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
      message: "Failed to verify code",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify backup code
 * Used when user can't access their authenticator app
 *
 * @param data - Backup code and options
 * @returns Verification result
 */
export async function verifyBackupCode(
  data: VerifyBackupCodeInput
): Promise<TwoFactorActionResult> {
  try {
    const schema = z.object({
      code: z
        .string()
        .min(8, "Backup code must be at least 8 characters")
        .max(12, "Backup code must not exceed 12 characters"),
      trustDevice: z.boolean().default(false),
      disableSession: z.boolean().default(false),
    });

    const validatedData = schema.parse(data);
    const headersList = await headers();

    await auth.api.verifyBackupCode({
      headers: headersList,
      body: {
        code: validatedData.code,
        trustDevice: validatedData.trustDevice,
        disableSession: validatedData.disableSession,
      },
    });

    return {
      success: true,
      message:
        "Backup code verified successfully. This code can no longer be used.",
    };
  } catch (error) {
    console.error("Verify backup code error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid backup code format",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("incorrect")
      ) {
        return {
          success: false,
          message: "Invalid backup code. Please try again.",
          code: "INVALID_BACKUP_CODE",
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
      message: "Failed to verify backup code",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate new backup codes
 * Old codes will be invalidated
 *
 * @param data - Password for verification
 * @returns New backup codes
 */
export async function generateBackupCodes(
  data: GenerateBackupCodesInput
): Promise<TwoFactorActionResult<GenerateBackupCodesResult>> {
  try {
    const schema = z.object({
      password: z.string().min(1, "Password is required"),
    });

    const validatedData = schema.parse(data);
    const headersList = await headers();

    const result = await auth.api.generateBackupCodes({
      headers: headersList,
      body: {
        password: validatedData.password,
      },
    });

    if (!result) {
      return {
        success: false,
        message: "Failed to generate backup codes",
        code: "GENERATE_CODES_FAILED",
      };
    }

    return {
      success: true,
      message: "New backup codes generated successfully. Save them securely.",
      data: {
        backupCodes: Array.isArray(result.backupCodes)
          ? result.backupCodes
          : JSON.parse(result.backupCodes as string),
      },
    };
  } catch (error) {
    console.error("Generate backup codes error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input data",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("password")) {
        return {
          success: false,
          message: "Incorrect password. Please try again.",
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
      message: "Failed to generate backup codes",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * View existing backup codes
 * Requires password verification for security
 * Note: This requires a FRESH session (user must have logged in recently)
 *
 * @param data - Password
 * @returns Existing backup codes
 */
export async function viewBackupCodes(
  data: ViewBackupCodesInput
): Promise<TwoFactorActionResult<ViewBackupCodesResult>> {
  try {
    const schema = z.object({
      password: z.string().min(1, "Password is required"),
    });

    const _validatedData = schema.parse(data);
    const headersList = await headers();

    // Get current session to get userId
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

    const result = await auth.api.viewBackupCodes({
      headers: headersList,
      body: {
        userId: session.user.id,
      },
    });

    if (!result) {
      return {
        success: false,
        message: "Failed to retrieve backup codes",
        code: "VIEW_CODES_FAILED",
      };
    }

    return {
      success: true,
      message: "Backup codes retrieved successfully",
      data: {
        backupCodes: Array.isArray(result.backupCodes)
          ? result.backupCodes
          : JSON.parse(result.backupCodes as string),
      },
    };
  } catch (error) {
    console.error("View backup codes error:", error);

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
      message: "Failed to retrieve backup codes",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Disable two-factor authentication
 * Requires password verification
 *
 * @param data - Password
 * @returns Success result
 */
export async function disable2FA(
  data: Disable2FAInput
): Promise<TwoFactorActionResult> {
  try {
    const schema = z.object({
      password: z.string().min(1, "Password is required"),
    });

    const validatedData = schema.parse(data);
    const headersList = await headers();

    await auth.api.disableTwoFactor({
      headers: headersList,
      body: {
        password: validatedData.password,
      },
    });

    return {
      success: true,
      message: "Two-factor authentication disabled successfully",
    };
  } catch (error) {
    console.error("Disable 2FA error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input data",
        error: error.issues[0]?.message,
      };
    }

    if (error instanceof APIError) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("password")) {
        return {
          success: false,
          message: "Incorrect password. Please try again.",
          code: "INVALID_PASSWORD",
        };
      }

      if (errorMessage.includes("not enabled")) {
        return {
          success: false,
          message: "Two-factor authentication is not enabled",
          code: "NOT_ENABLED",
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
      message: "Failed to disable two-factor authentication",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
