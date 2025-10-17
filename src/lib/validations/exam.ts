/**
 * Exam Upload Validation Schema
 *
 * Zod schemas for validating exam upload data with comprehensive
 * security measures including input sanitization and business logic validation.
 *
 * @module lib/validations/exam
 */

import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

// ============================================
// CONSTANTS
// ============================================

export const EXAM_TYPES = [
  "WAEC",
  "JAMB",
  "NECO",
  "GCE",
  "NABTEB",
  "POST_UTME",
] as const;

export const EXAM_STATUS = ["draft", "published", "archived"] as const;

export const EXAM_CATEGORIES = [
  "practice",
  "challenge",
  "recruitment",
  "test",
] as const;

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Exam upload schema
 *
 * Validates all exam fields with:
 * - Type validation
 * - Range validation
 * - Sanitization (XSS prevention)
 * - Business logic validation
 */
export const examUploadSchema = z
  .object({
    // Exam identification
    exam_type: z.enum(EXAM_TYPES, {
      message: "Invalid exam type",
    }),

    subject: z
      .string()
      .min(1, "Subject is required")
      .max(100, "Subject must not exceed 100 characters")
      .transform((val) => DOMPurify.sanitize(val.trim())),

    year: z
      .number()
      .int("Year must be an integer")
      .min(1990, "Year must be 1990 or later")
      .max(
        new Date().getFullYear() + 1,
        `Year must not exceed ${new Date().getFullYear() + 1}`
      ),

    // Exam details
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must not exceed 200 characters")
      .transform((val) => DOMPurify.sanitize(val.trim())),

    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional()
      .or(z.literal(""))
      .transform((val) =>
        val && val.trim() ? DOMPurify.sanitize(val.trim()) : undefined
      ),

    // Exam settings
    duration: z
      .number()
      .int("Duration must be an integer")
      .positive("Duration must be positive")
      .max(600, "Duration must not exceed 600 minutes (10 hours)"),

    passing_score: z
      .number()
      .min(0, "Passing score must be at least 0")
      .max(100, "Passing score must not exceed 100")
      .nullable()
      .optional(),

    max_attempts: z
      .number()
      .int("Max attempts must be an integer")
      .positive("Max attempts must be positive")
      .max(10, "Max attempts must not exceed 10")
      .nullable()
      .optional(),

    shuffle_questions: z.boolean().default(false),

    randomize_options: z.boolean().default(false),

    is_public: z.boolean().default(false),

    is_free: z.boolean().default(true),

    status: z.enum(EXAM_STATUS).default("draft"),

    category: z
      .enum(EXAM_CATEGORIES)
      .optional()
      .nullable()
      .transform((val) => val || null),

    start_date: z
      .string()
      .datetime({ message: "Invalid start date format" })
      .optional()
      .nullable()
      .transform((val) => val || null),

    end_date: z
      .string()
      .datetime({ message: "Invalid end date format" })
      .optional()
      .nullable()
      .transform((val) => val || null),

    // Question IDs
    question_ids: z
      .array(z.string().cuid({ message: "Invalid question ID format" }))
      .min(1, "At least 1 question is required")
      .max(200, "Maximum 200 questions allowed"),
  })
  .refine(
    (data) => {
      // End date must be after start date
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) > new Date(data.start_date);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      // Ensure no duplicate question IDs
      const uniqueIds = new Set(data.question_ids);
      return uniqueIds.size === data.question_ids.length;
    },
    {
      message: "Duplicate questions are not allowed",
      path: ["question_ids"],
    }
  );

/**
 * Question search schema
 */
export const questionSearchSchema = z.object({
  exam_type: z
    .enum(EXAM_TYPES)
    .optional()
    .transform((val) => val || undefined),

  year: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1)
    .optional(),

  subject: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val ? DOMPurify.sanitize(val.trim()) : undefined)),

  difficulty_level: z
    .enum(["easy", "medium", "hard"])
    .optional()
    .transform((val) => val || undefined),

  limit: z.number().int().min(1).max(100).default(20),

  offset: z.number().int().min(0).default(0),
});

/**
 * Exam update schema (allows partial updates)
 */
export const examUpdateSchema = examUploadSchema.partial().refine(
  (data) => {
    // At least one field must be provided for update
    return Object.keys(data).length > 0;
  },
  {
    message: "At least one field must be provided for update",
  }
);

// ============================================
// TYPE EXPORTS
// ============================================

export type ExamUploadInput = z.infer<typeof examUploadSchema>;
export type QuestionSearchInput = z.infer<typeof questionSearchSchema>;
export type ExamUpdateInput = z.infer<typeof examUpdateSchema>;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate and sanitize exam upload data
 *
 * @param data - Raw exam upload data
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateExamUpload(data: unknown): ExamUploadInput {
  return examUploadSchema.parse(data);
}

/**
 * Safe validation that returns result object
 *
 * @param data - Raw exam upload data
 * @returns Validation result with data or errors
 */
export function safeValidateExamUpload(data: unknown): {
  success: boolean;
  data?: ExamUploadInput;
  error?: z.ZodError;
} {
  const result = examUploadSchema.safeParse(data);

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
 * Validate question search parameters
 *
 * @param data - Raw search parameters
 * @returns Validated search parameters
 * @throws ZodError if validation fails
 */
export function validateQuestionSearch(data: unknown): QuestionSearchInput {
  return questionSearchSchema.parse(data);
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
