/**
 * Question Upload Validation Schema
 *
 * Zod schemas for validating question upload data with comprehensive
 * security measures including input sanitization and business logic validation.
 *
 * @module lib/validations/question
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

export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "essay",
  "fill_in_blank",
] as const;

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Question option schema
 */
export const questionOptionSchema = z.object({
  option_text: z
    .string()
    .min(1, "Option text is required")
    .max(1000, "Option text must not exceed 1000 characters")
    .transform((val) => DOMPurify.sanitize(val.trim())),

  is_correct: z.boolean(),

  order_index: z.number().int().min(0, "Order index must be non-negative"),

  has_image: z.boolean().optional().default(false),
});

/**
 * Main question upload schema
 *
 * Validates all question fields with:
 * - Type validation
 * - Range validation
 * - Sanitization (XSS prevention)
 * - Business logic validation
 */
export const questionUploadSchema = z
  .object({
    // Exam identification
    exam_type: z.enum(EXAM_TYPES, {
      message: "Invalid exam type",
    }),

    year: z
      .number()
      .int("Year must be an integer")
      .min(1990, "Year must be 1990 or later")
      .max(
        new Date().getFullYear() + 1,
        `Year must not exceed ${new Date().getFullYear() + 1}`
      ),

    subject: z
      .string()
      .min(1, "Subject is required")
      .max(100, "Subject must not exceed 100 characters")
      .transform((val) => DOMPurify.sanitize(val.trim())),

    // Question content
    question_type: z.enum(QUESTION_TYPES, {
      message: "Invalid question type",
    }),

    question_text: z
      .string()
      .min(1, "Question text is required")
      .max(5000, "Question text must not exceed 5000 characters")
      .transform((val) => DOMPurify.sanitize(val.trim())),

    question_point: z
      .number()
      .positive("Question point must be positive")
      .max(100, "Question point must not exceed 100"),

    answer_explanation: z
      .string()
      .max(2000, "Answer explanation must not exceed 2000 characters")
      .optional()
      .transform((val) => (val ? DOMPurify.sanitize(val.trim()) : val)),

    // Question metadata
    difficulty_level: z.enum(DIFFICULTY_LEVELS, {
      message: "Invalid difficulty level",
    }),

    tags: z
      .array(
        z
          .string()
          .max(50, "Each tag must not exceed 50 characters")
          .transform((val) => DOMPurify.sanitize(val.trim()))
      )
      .max(10, "Maximum 10 tags allowed")
      .default([]),

    time_limit: z
      .number()
      .int("Time limit must be an integer")
      .positive("Time limit must be positive")
      .max(3600, "Time limit must not exceed 1 hour (3600 seconds)")
      .nullable()
      .optional(),

    language: z
      .string()
      .length(2, "Language code must be 2 characters")
      .default("en"),

    // Answer options
    options: z
      .array(questionOptionSchema)
      .min(2, "At least 2 options are required")
      .max(10, "Maximum 10 options allowed"),

    // File metadata (not the actual files)
    has_question_image: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // At least one option must be correct
      return data.options.some((opt) => opt.is_correct);
    },
    {
      message: "At least one option must be marked as correct",
      path: ["options"],
    }
  )
  .refine(
    (data) => {
      // True/false questions must have exactly 2 options
      if (data.question_type === "true_false" && data.options.length !== 2) {
        return false;
      }
      return true;
    },
    {
      message: "True/false questions must have exactly 2 options",
      path: ["options"],
    }
  )
  .refine(
    (data) => {
      // Multiple choice must have at least 3 options
      if (data.question_type === "multiple_choice" && data.options.length < 3) {
        return false;
      }
      return true;
    },
    {
      message: "Multiple choice questions must have at least 3 options",
      path: ["options"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate option texts (case-insensitive)
      const texts = data.options.map((opt) => opt.option_text.toLowerCase());
      const uniqueTexts = new Set(texts);
      return texts.length === uniqueTexts.size;
    },
    {
      message: "Options must have unique text",
      path: ["options"],
    }
  );

// ============================================
// TYPE EXPORTS
// ============================================

export type QuestionUploadInput = z.infer<typeof questionUploadSchema>;
export type QuestionOptionInput = z.infer<typeof questionOptionSchema>;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate and sanitize question upload data
 *
 * @param data - Raw question upload data
 * @returns Validated and sanitized data
 * @throws ZodError if validation fails
 */
export function validateQuestionUpload(data: unknown): QuestionUploadInput {
  return questionUploadSchema.parse(data);
}

/**
 * Safe validation that returns result object
 *
 * @param data - Raw question upload data
 * @returns Validation result with data or errors
 */
export function safeValidateQuestionUpload(data: unknown): {
  success: boolean;
  data?: QuestionUploadInput;
  error?: z.ZodError;
} {
  const result = questionUploadSchema.safeParse(data);

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
