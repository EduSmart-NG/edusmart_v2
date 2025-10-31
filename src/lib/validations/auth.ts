import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { isValidPhoneNumber } from "libphonenumber-js";

/**
 * Registration validation schema with enhanced username validation
 *
 * Username rules:
 * - 3-30 characters
 * - Only alphanumeric, underscores, and dots
 * - Reserved usernames blocked
 * - Case-insensitive (will be normalized to lowercase)
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),

  email: z.string().email("Invalid email address").toLowerCase().trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),

  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Username can only contain letters, numbers, underscores, and dots"
    )
    .refine(
      (val) => {
        // Prevent reserved usernames
        const reserved = ["admin", "root", "system", "support", "moderator"];
        return !reserved.includes(val.toLowerCase());
      },
      { message: "This username is reserved and cannot be used" }
    )
    .trim(),

  dateOfBirth: z.string().refine(
    (val) => {
      const date = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age >= 5 && age <= 100; // Reasonable age range for educational platform
    },
    { message: "You must be between 5 and 100 years old" }
  ),

  gender: z
    .enum(["MALE", "FEMALE", ""], {
      message: "Please select a gender",
    })
    .refine((val) => val !== "", {
      message: "Please select your gender",
    }),

  phoneNumber: z
    .string()
    .refine(
      (val) => {
        // Empty string is valid (optional field)
        if (!val || val === "") return true;

        // Validate using libphonenumber-js
        try {
          return isValidPhoneNumber(val);
        } catch {
          return false;
        }
      },
      { message: "Invalid phone number format" }
    )
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional()
    .or(z.literal("")),

  state: z.string().min(1, "State is required"),

  lga: z.string().min(1, "LGA is required"),

  schoolName: z
    .string()
    .max(200, "School name must not exceed 200 characters")
    .optional()
    .or(z.literal("")),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Validate and sanitize registration input
 *
 * - Validates all fields against schema
 * - Sanitizes text inputs to prevent XSS attacks
 * - Trims whitespace
 *
 * @param data - Raw registration input
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateAndSanitizeRegistration(
  data: RegisterInput
): RegisterInput {
  // Validate with Zod schema
  const validated = registerSchema.parse(data);

  // Sanitize text fields to prevent XSS
  return {
    ...validated,
    name: DOMPurify.sanitize(validated.name.trim()),
    email: validated.email.toLowerCase().trim(),
    username: DOMPurify.sanitize(validated.username.trim()),
    address: validated.address
      ? DOMPurify.sanitize(validated.address.trim())
      : undefined,
    schoolName: validated.schoolName
      ? DOMPurify.sanitize(validated.schoolName.trim())
      : undefined,
    phoneNumber: validated.phoneNumber || undefined,
  };
}

/**
 * Enhanced login validation schema
 * Supports both email and username authentication
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or username is required")
    .refine(
      (val) => {
        // Valid if it's an email OR a valid username
        const isEmail = z.string().email().safeParse(val).success;
        const isUsername = /^[a-zA-Z0-9_.]+$/.test(val) && val.length >= 3;
        return isEmail || isUsername;
      },
      {
        message: "Please enter a valid email or username",
      }
    )
    .transform((val) => val.toLowerCase().trim()),

  password: z.string().min(1, "Password is required"),

  rememberMe: z.boolean().optional().default(true),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validate and sanitize login input
 *
 * - Validates identifier (email or username)
 * - Sanitizes identifier to prevent XSS
 * - Does NOT sanitize password (preserve exact input)
 * - Trims whitespace
 *
 * @param data - Raw login input
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateAndSanitizeLogin(data: LoginInput): LoginInput {
  // Validate with Zod schema
  const validated = loginSchema.parse(data);

  // Sanitize identifier (email/username) to prevent XSS
  // Do NOT sanitize password - preserve exact input for authentication
  return {
    identifier: DOMPurify.sanitize(validated.identifier),
    password: validated.password,
    rememberMe: validated.rememberMe,
  };
}

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;

/**
 * Password reset schema
 */
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must not exceed 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

/**
 * Validate and sanitize password reset request input
 *
 * - Validates email format
 * - Sanitizes email to prevent XSS
 * - Normalizes to lowercase
 *
 * @param data - Raw password reset request input
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateAndSanitizePasswordResetRequest(
  data: PasswordResetRequestInput
): PasswordResetRequestInput {
  // Validate with Zod schema
  const validated = passwordResetRequestSchema.parse(data);

  // Sanitize email to prevent XSS
  return {
    email: DOMPurify.sanitize(validated.email),
  };
}

/**
 * Validate and sanitize password reset input
 *
 * - Validates token format
 * - Validates password complexity
 * - Validates password confirmation match
 * - Does NOT sanitize password (preserve exact input)
 * - Sanitizes token
 *
 * @param data - Raw password reset input
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateAndSanitizePasswordReset(
  data: PasswordResetInput
): PasswordResetInput {
  // Validate with Zod schema
  const validated = passwordResetSchema.parse(data);

  // Sanitize token to prevent XSS
  // Do NOT sanitize password - preserve exact input for authentication
  return {
    token: DOMPurify.sanitize(validated.token),
    password: validated.password,
    confirmPassword: validated.confirmPassword,
  };
}
