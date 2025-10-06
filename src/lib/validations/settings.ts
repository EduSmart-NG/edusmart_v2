import { z } from "zod";

/**
 * Email change validation schema
 */
export const emailChangeSchema = z.object({
  newEmail: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters")
    .transform((val) => val.toLowerCase().trim()),
  callbackURL: z.string().url("Invalid callback URL").optional(),
});

export type EmailChangeInput = z.infer<typeof emailChangeSchema>;

/**
 * Password strength validation
 */
const passwordStrengthRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

/**
 * Password change validation schema
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must not exceed 128 characters")
      .refine(
        (password) => passwordStrengthRegex.uppercase.test(password),
        "Password must contain at least one uppercase letter"
      )
      .refine(
        (password) => passwordStrengthRegex.lowercase.test(password),
        "Password must contain at least one lowercase letter"
      )
      .refine(
        (password) => passwordStrengthRegex.number.test(password),
        "Password must contain at least one number"
      )
      .refine(
        (password) => passwordStrengthRegex.special.test(password),
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
    revokeOtherSessions: z.boolean().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

/**
 * Calculate password strength score (0-4)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: "weak" | "fair" | "good" | "strong";
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  else feedback.push("Use at least 8 characters");

  if (password.length >= 12) score++;
  else if (password.length >= 8) feedback.push("12+ characters recommended");

  if (passwordStrengthRegex.uppercase.test(password)) score++;
  else feedback.push("Add uppercase letters");

  if (passwordStrengthRegex.lowercase.test(password)) score++;
  else feedback.push("Add lowercase letters");

  if (passwordStrengthRegex.number.test(password)) score++;
  else feedback.push("Add numbers");

  if (passwordStrengthRegex.special.test(password)) score++;
  else feedback.push("Add special characters");

  // Normalize score to 0-4
  const normalizedScore = Math.min(Math.floor(score / 1.5), 4);

  const labels: Record<number, "weak" | "fair" | "good" | "strong"> = {
    0: "weak",
    1: "weak",
    2: "fair",
    3: "good",
    4: "strong",
  };

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    feedback: feedback.slice(0, 3), // Show top 3 suggestions
  };
}

/**
 * 2FA enable/disable validation schema
 */
export const twoFactorToggleSchema = z.object({
  password: z.string().min(1, "Password is required"),
  issuer: z.string().optional(),
});

export type TwoFactorToggleInput = z.infer<typeof twoFactorToggleSchema>;

/**
 * 2FA verification code validation schema
 */
export const twoFactorVerifySchema = z.object({
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
  trustDevice: z.boolean().default(false),
});

export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;

/**
 * 2FA backup code validation schema
 */
export const backupCodeVerifySchema = z.object({
  code: z
    .string()
    .min(8, "Backup code must be at least 8 characters")
    .max(12, "Backup code must not exceed 12 characters")
    .regex(/^[A-Z0-9]+$/, "Backup code contains invalid characters"),
  trustDevice: z.boolean().default(false),
});

export type BackupCodeVerifyInput = z.infer<typeof backupCodeVerifySchema>;

/**
 * Account deletion validation schema
 */
export const accountDeletionSchema = z
  .object({
    password: z.string().optional(),
    token: z.string().optional(),
    confirmText: z.string().refine((val) => val === "DELETE", {
      message: "Please type DELETE to confirm",
    }),
    callbackURL: z.string().url("Invalid callback URL").optional(),
  })
  .refine((data) => data.password || data.token, {
    message: "Either password or token is required",
    path: ["password"],
  });

export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;

/**
 * Session revocation validation schema
 */
export const sessionRevocationSchema = z.object({
  token: z.string().min(1, "Session token is required"),
});

export type SessionRevocationInput = z.infer<typeof sessionRevocationSchema>;
