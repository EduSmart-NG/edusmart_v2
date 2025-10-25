/**
 * Subject Validation Schema
 *
 * Zod schemas for validating subject data with comprehensive
 * security measures including input sanitization and business logic validation.
 *
 * @module lib/validations/subject
 */

import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

// ============================================
// CONSTANTS
// ============================================

export const SORT_BY_OPTIONS = ["name", "createdAt", "updatedAt"] as const;
export const SORT_ORDER_OPTIONS = ["asc", "desc"] as const;

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Subject creation schema
 *
 * Validates all subject fields with:
 * - Type validation
 * - Range validation
 * - Sanitization (XSS prevention)
 * - Business logic validation
 */
export const subjectCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Subject name is required")
    .max(100, "Subject name must not exceed 100 characters")
    .transform((val) => DOMPurify.sanitize(val.trim())),

  code: z
    .string()
    .min(2, "Subject code must be at least 2 characters")
    .max(10, "Subject code must not exceed 10 characters")
    .regex(
      /^[A-Z0-9]+$/,
      "Subject code must contain only uppercase letters and numbers"
    )
    .optional()
    .nullable()
    .transform((val) => (val ? val.toUpperCase().trim() : null)),

  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .nullable()
    .transform((val) =>
      val && val.trim() ? DOMPurify.sanitize(val.trim()) : null
    ),

  isActive: z.boolean().default(true),
});

/**
 * Subject update schema (allows partial updates)
 */
export const subjectUpdateSchema = subjectCreateSchema.partial().refine(
  (data) => {
    // At least one field must be provided for update
    return Object.keys(data).length > 0;
  },
  {
    message: "At least one field must be provided for update",
  }
);

/**
 * Subject list/filter schema
 */
export const subjectListSchema = z.object({
  isActive: z
    .boolean()
    .optional()
    .transform((val) => val ?? undefined),

  search: z
    .string()
    .max(100, "Search term must not exceed 100 characters")
    .optional()
    .transform((val) =>
      val && val.trim() ? DOMPurify.sanitize(val.trim()) : undefined
    ),

  limit: z.number().int().min(1).max(100).default(50),

  offset: z.number().int().min(0).default(0),

  sortBy: z.enum(SORT_BY_OPTIONS).default("name"),

  sortOrder: z.enum(SORT_ORDER_OPTIONS).default("asc"),
});

/**
 * Subject delete schema
 */
export const subjectDeleteSchema = z.object({
  subjectId: z.string().cuid({ message: "Invalid subject ID format" }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
export type SubjectListInput = z.infer<typeof subjectListSchema>;
export type SubjectDeleteInput = z.infer<typeof subjectDeleteSchema>;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate and sanitize subject creation data
 *
 * @param data - Raw subject creation data
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateSubjectCreate(data: unknown): SubjectCreateInput {
  return subjectCreateSchema.parse(data);
}

/**
 * Safe validation for subject creation
 *
 * @param data - Raw subject creation data
 * @returns Validation result with data or errors
 */
export function safeValidateSubjectCreate(data: unknown): {
  success: boolean;
  data?: SubjectCreateInput;
  error?: z.ZodError;
} {
  const result = subjectCreateSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Validate and sanitize subject update data
 *
 * @param data - Raw subject update data
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateSubjectUpdate(data: unknown): SubjectUpdateInput {
  return subjectUpdateSchema.parse(data);
}

/**
 * Validate and sanitize subject list parameters
 *
 * @param data - Raw list parameters
 * @returns Validated parameters
 * @throws ZodError if validation fails
 */
export function validateSubjectList(data: unknown): SubjectListInput {
  return subjectListSchema.parse(data);
}

/**
 * Validate subject delete request
 *
 * @param data - Raw delete request data
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validateSubjectDelete(data: unknown): SubjectDeleteInput {
  return subjectDeleteSchema.parse(data);
}

/**
 * Format Zod errors for API response
 *
 * @param error - Zod validation error
 * @returns Formatted error object
 */
export function formatValidationErrors(
  error: z.ZodError
): Record<string, string> {
  const errors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });

  return errors;
}
