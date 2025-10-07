import { z } from "zod";
import type {
  UserListQuery,
  BanUserInput,
  SetUserRoleInput,
  SetUserPasswordInput,
  CreateUserInput,
  UpdateUserInput,
  UpdateUserData,
  CreateUserData,
} from "@/types/admin";

/**
 * User list query validation schema
 * Validates search, filter, sort, and pagination parameters
 * Based on Better Auth admin plugin API specifications
 */
export const userListQuerySchema = z.object({
  searchValue: z
    .string()
    .trim()
    .max(100, "Search value too long")
    .optional()
    .transform((val) => val?.replace(/[<>]/g, "")), // Sanitize HTML chars
  searchField: z.enum(["email", "name"]).optional(), // Better Auth only supports email and name
  searchOperator: z
    .enum(["contains", "starts_with", "ends_with"])
    .optional()
    .default("contains"),
  limit: z
    .number()
    .int()
    .positive()
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z_]+$/, "Invalid sort field")
    .optional()
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
  filterField: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z_]+$/, "Invalid filter field")
    .optional(),
  filterValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  filterOperator: z
    .enum(["eq", "ne", "lt", "lte", "gt", "gte"])
    .optional()
    .default("eq"),
});

/**
 * Validate and sanitize user list query
 */
export function validateAndSanitizeUserListQuery(
  input: Partial<UserListQuery>
): UserListQuery {
  return userListQuerySchema.parse(input);
}

/**
 * Create user validation schema
 * Enforces strong password and email requirements
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(255, "Email too long")
    .transform((val) => val.replace(/[<>]/g, "")), // Sanitize
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .transform((val) => val.replace(/[<>]/g, "")), // Sanitize
  role: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .default("user")
    .transform((val) => {
      if (Array.isArray(val)) {
        return val.map((v) => v.trim().toLowerCase());
      }
      return val.trim().toLowerCase();
    }),
  data: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.date(),
        z.null(),
        z.undefined(),
      ])
    )
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      // Sanitize string values in the record
      const sanitized: Record<
        string,
        string | number | boolean | Date | null | undefined
      > = {};
      for (const key in val) {
        const value = val[key];
        if (typeof value === "string") {
          sanitized[key] = value.replace(/[<>]/g, "");
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }),
});

/**
 * Validate and sanitize create user input
 */
export function validateAndSanitizeCreateUser(
  input: Partial<CreateUserInput>
): CreateUserInput {
  const validated = createUserSchema.parse(input);

  return {
    email: validated.email,
    password: validated.password,
    name: validated.name,
    role: validated.role,
    data: validated.data as CreateUserData | undefined,
  };
}

/**
 * Ban user validation schema
 */
export const banUserSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, "User ID is required")
    .max(255, "User ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format"),
  banReason: z
    .string()
    .trim()
    .max(500, "Ban reason too long")
    .optional()
    .transform((val) => val?.replace(/[<>]/g, "")), // Sanitize
  banExpiresIn: z
    .number()
    .int()
    .positive("Ban duration must be positive")
    .max(31536000, "Ban duration cannot exceed 1 year") // Max 1 year in seconds
    .optional(),
});

/**
 * Validate and sanitize ban user input
 */
export function validateAndSanitizeBanUser(
  input: Partial<BanUserInput>
): BanUserInput {
  return banUserSchema.parse(input);
}

/**
 * Set user role validation schema
 */
export const setUserRoleSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, "User ID is required")
    .max(255, "User ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format"),
  role: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (Array.isArray(val)) {
        return val.map((v) => v.trim().toLowerCase());
      }
      return val.trim().toLowerCase();
    })
    .refine(
      (val) => {
        const validRoles = ["user", "admin", "moderator"];
        if (Array.isArray(val)) {
          return val.every((r) => validRoles.includes(r));
        }
        return validRoles.includes(val);
      },
      { message: "Invalid role specified" }
    ),
});

/**
 * Validate and sanitize set user role input
 */
export function validateAndSanitizeSetUserRole(
  input: Partial<SetUserRoleInput>
): SetUserRoleInput {
  return setUserRoleSchema.parse(input);
}

/**
 * Set user password validation schema
 */
export const setUserPasswordSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, "User ID is required")
    .max(255, "User ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
});

/**
 * Validate and sanitize set user password input
 */
export function validateAndSanitizeSetUserPassword(
  input: Partial<SetUserPasswordInput>
): SetUserPasswordInput {
  return setUserPasswordSchema.parse(input);
}

/**
 * Update user validation schema
 */
export const updateUserSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, "User ID is required")
    .max(255, "User ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format"),
  data: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.date(),
        z.null(),
        z.undefined(),
      ])
    )
    .transform((data) => {
      // Sanitize string values
      const sanitized: Record<
        string,
        string | number | boolean | Date | null | undefined
      > = {};
      for (const key in data) {
        const value = data[key];
        if (typeof value === "string") {
          sanitized[key] = value.replace(/[<>]/g, "");
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }),
});

/**
 * Validate and sanitize update user input
 */
export function validateAndSanitizeUpdateUser(
  input: Partial<UpdateUserInput>
): UpdateUserInput {
  const validated = updateUserSchema.parse(input);

  return {
    userId: validated.userId,
    data: validated.data as UpdateUserData,
  };
}

/**
 * User ID validation schema (for single user operations)
 */
export const userIdSchema = z
  .string()
  .trim()
  .min(1, "User ID is required")
  .max(255, "User ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format");

/**
 * Validate and sanitize user ID
 */
export function validateAndSanitizeUserId(input: string): string {
  return userIdSchema.parse(input);
}

/**
 * Session token validation schema
 */
export const sessionTokenSchema = z
  .string()
  .trim()
  .min(1, "Session token is required")
  .max(500, "Session token too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid session token format");

/**
 * Validate and sanitize session token
 */
export function validateAndSanitizeSessionToken(input: string): string {
  return sessionTokenSchema.parse(input);
}

/**
 * Pagination validation helpers
 */
export const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Sort validation schema
 */
export const sortSchema = z.object({
  sortBy: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z_]+$/, "Invalid sort field")
    .optional()
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Search validation schema
 */
export const searchSchema = z.object({
  searchValue: z
    .string()
    .trim()
    .max(100, "Search value too long")
    .optional()
    .transform((val) => val?.replace(/[<>]/g, "")),
  searchField: z.enum(["email", "name", "username"]).optional(),
  searchOperator: z
    .enum(["contains", "starts_with", "ends_with"])
    .optional()
    .default("contains"),
});

/**
 * Filter validation schema
 */
export const filterSchema = z.object({
  filterField: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z_]+$/, "Invalid filter field")
    .optional(),
  filterValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  filterOperator: z
    .enum(["eq", "ne", "lt", "lte", "gt", "gte"])
    .optional()
    .default("eq"),
});
