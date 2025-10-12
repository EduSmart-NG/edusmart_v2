import { z } from "zod";

/**
 * Supported user roles for admin user creation
 *
 * - `user`: Standard user with basic access
 * - `exam_manager`: User who can manage exams and questions
 * - `admin`: Administrator with full system access
 */
export const USER_ROLES = ["user", "exam_manager", "admin"] as const;

/**
 * User role type derived from USER_ROLES constant
 */
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Validation schema for admin user creation
 *
 * Security features:
 * - Email format validation and normalization
 * - Username format validation (lowercase, alphanumeric, underscores)
 * - Username length constraints (3-20 characters)
 * - Name length constraints (prevent DoS via large inputs)
 * - Role enum validation (prevent invalid role injection)
 * - All inputs sanitized by Zod
 *
 * @example
 * ```typescript
 * const result = createUserSchema.safeParse({
 *   email: "user@example.com",
 *   name: "John Doe",
 *   username: "john_doe",
 *   role: "exam_manager"
 * });
 * ```
 */
export const createUserSchema = z.object({
  /**
   * User's email address
   * - Must be valid email format
   * - Will be normalized to lowercase
   * - Must be unique (checked at database level)
   */
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters")
    .toLowerCase()
    .trim(),

  /**
   * User's full name
   * - Minimum 2 characters
   * - Maximum 100 characters
   * - Trimmed of whitespace
   */
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),

  /**
   * User's username
   * - Must be 3-20 characters
   * - Only lowercase letters, numbers, and underscores
   * - Cannot start or end with underscore
   * - No consecutive underscores
   * - Must be unique (checked at database level)
   */
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must not exceed 20 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores"
    )
    .refine(
      (val) => !val.startsWith("_") && !val.endsWith("_"),
      "Username cannot start or end with underscore"
    )
    .refine(
      (val) => !val.includes("__"),
      "Username cannot contain consecutive underscores"
    )
    .toLowerCase()
    .trim(),

  /**
   * User's role in the system
   * - Must be one of: user, exam_manager, admin
   * - Validated against USER_ROLES enum
   */
  role: z.enum(USER_ROLES, {
    message: "Please select a valid role",
  }),
});

/**
 * TypeScript type inferred from createUserSchema
 *
 * Use this type for function parameters and return types
 * to ensure type safety throughout the application.
 *
 * @example
 * ```typescript
 * async function createUser(data: CreateUserAdminInput) {
 *   // data is fully typed with email, name, username, and role
 * }
 * ```
 */
export type CreateUserAdminInput = z.infer<typeof createUserSchema>;

/**
 * Validates and sanitizes admin user creation input
 *
 * @param data - Raw input data to validate
 * @returns Validated and sanitized data
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const validData = validateCreateUserInput(rawInput);
 *   // Proceed with user creation
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     // Handle validation errors
 *   }
 * }
 * ```
 */
export function validateCreateUserInput(data: unknown): CreateUserAdminInput {
  return createUserSchema.parse(data);
}

/**
 * Role display names for UI rendering
 *
 * Maps internal role values to user-friendly display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  user: "User",
  exam_manager: "Exam Manager",
  admin: "Admin",
} as const;

/**
 * Role descriptions for UI tooltips/help text
 *
 * Provides context about what each role can do
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  user: "Standard user with access to take exams and view results",
  exam_manager: "Can create and manage exams, questions, and view analytics",
  admin: "Full system access including user management and system settings",
} as const;
