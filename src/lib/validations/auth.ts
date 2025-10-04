import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

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

  gender: z.enum(["MALE", "FEMALE"], {
    error: "Gender must be either MALE or FEMALE",
  }),

  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
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
    username: DOMPurify.sanitize(validated.username.trim()), // Preserve original casing
    address: validated.address
      ? DOMPurify.sanitize(validated.address.trim())
      : undefined,
    schoolName: validated.schoolName
      ? DOMPurify.sanitize(validated.schoolName.trim())
      : undefined,
  };
}

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

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
