/**
 * Question Upload Server Action
 *
 * Secure server action for uploading questions with images.
 * Handles authentication, authorization, validation, file uploads,
 * and database transactions with automatic rollback on errors.
 *
 * Security Features:
 * - Session validation via Better Auth
 * - Role-based access control (admin/exam_manager only)
 * - Rate limiting (50 uploads/hour per user)
 * - Input sanitization (Zod + DOMPurify)
 * - File validation (type, size, MIME)
 * - SQL injection prevention (Prisma parameterized queries)
 * - Automatic file cleanup on errors
 *
 * @module lib/actions/question-upload
 */

"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";
import {
  validateQuestionUpload,
  formatValidationErrors,
} from "@/lib/validations/question";
import {
  saveUploadedFile,
  deleteFiles,
  validateImageFile,
} from "@/lib/utils/file-upload";
import type { QuestionUploadResponse } from "@/types/question-api";
import { ZodError } from "zod";

// ============================================
// CONSTANTS
// ============================================

/**
 * Allowed roles for question upload
 */
const ALLOWED_ROLES = ["admin", "exam_manager"] as const;

/**
 * Rate limiting configuration
 * 50 uploads per hour per user
 */
const RATE_LIMIT = {
  MAX_UPLOADS: 50,
  WINDOW_SECONDS: 3600, // 1 hour
} as const;

// ============================================
// TYPES
// ============================================

/**
 * User authorization context
 */
interface UserContext {
  userId: string;
  userEmail: string;
  userRole: string;
  userName: string;
}

/**
 * Rate limit check result
 */
interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  retryAfter?: number; // seconds until reset
}

/**
 * Parsed FormData result
 */
interface ParsedFormData {
  questionData: unknown;
  questionImageFile: File | null;
  optionImageFiles: Map<number, File>;
}

/**
 * File upload result
 */
interface FileUploadResult {
  questionImagePath: string | null;
  optionImagePaths: Map<number, string>;
  uploadedFiles: string[]; // For rollback
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check session and authorization
 *
 * Validates:
 * - Session exists and is valid
 * - User has required role (admin or exam_manager)
 *
 * @returns User context with session details
 * @throws Error if unauthorized
 */
async function checkAuthorizationAndSession(): Promise<UserContext> {
  try {
    // Get session from Better Auth
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Validate session exists
    if (!session) {
      throw new Error(
        JSON.stringify({
          code: "NO_SESSION",
          message: "Authentication required. Please sign in.",
        })
      );
    }

    // Validate user role
    const userRole = session.user.role || "user";

    if (!ALLOWED_ROLES.includes(userRole as (typeof ALLOWED_ROLES)[number])) {
      throw new Error(
        JSON.stringify({
          code: "FORBIDDEN",
          message: `Access denied. Required roles: ${ALLOWED_ROLES.join(", ")}`,
        })
      );
    }

    // Return user context
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      userRole,
      userName: session.user.name,
    };
  } catch (error) {
    // Re-throw with proper error structure
    if (error instanceof Error && error.message.startsWith("{")) {
      throw error;
    }
    throw new Error(
      JSON.stringify({
        code: "AUTH_ERROR",
        message: "Failed to validate session",
      })
    );
  }
}

/**
 * Rate limit data structure
 */
interface RateLimitData {
  uploads: number;
  firstUpload: string; // ISO timestamp
  windowExpires: string; // ISO timestamp
}

/**
 * Check rate limit for user
 *
 * Uses Redis/MySQL to track upload attempts per user.
 * Limit: 50 uploads per hour (3600 seconds).
 *
 * Pattern: Stores JSON data with upload count and timestamps,
 * similar to password reset rate limiting in the codebase.
 *
 * @param userId - User ID to check
 * @returns Rate limit result
 */
async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const key = `question_upload:${userId}`;
    const now = new Date();
    const data = await redis.get(key);

    let rateLimitData: RateLimitData;

    if (!data) {
      // First upload - create new record
      const windowExpires = new Date(
        now.getTime() + RATE_LIMIT.WINDOW_SECONDS * 1000
      );

      rateLimitData = {
        uploads: 1,
        firstUpload: now.toISOString(),
        windowExpires: windowExpires.toISOString(),
      };

      // Store with TTL
      await redis.set(
        key,
        JSON.stringify(rateLimitData),
        RATE_LIMIT.WINDOW_SECONDS
      );

      return {
        allowed: true,
        remaining: RATE_LIMIT.MAX_UPLOADS - 1,
      };
    }

    // Parse existing data
    rateLimitData = JSON.parse(data);
    const windowExpires = new Date(rateLimitData.windowExpires);

    // Check if window has expired
    if (now > windowExpires) {
      // Window expired - reset counter
      const newWindowExpires = new Date(
        now.getTime() + RATE_LIMIT.WINDOW_SECONDS * 1000
      );

      rateLimitData = {
        uploads: 1,
        firstUpload: now.toISOString(),
        windowExpires: newWindowExpires.toISOString(),
      };

      await redis.set(
        key,
        JSON.stringify(rateLimitData),
        RATE_LIMIT.WINDOW_SECONDS
      );

      return {
        allowed: true,
        remaining: RATE_LIMIT.MAX_UPLOADS - 1,
      };
    }

    // Window is active - check if limit exceeded
    if (rateLimitData.uploads >= RATE_LIMIT.MAX_UPLOADS) {
      const retryAfter = Math.ceil(
        (windowExpires.getTime() - now.getTime()) / 1000
      );

      return {
        allowed: false,
        retryAfter: retryAfter > 0 ? retryAfter : RATE_LIMIT.WINDOW_SECONDS,
      };
    }

    // Increment counter
    rateLimitData.uploads += 1;

    // Calculate remaining TTL
    const remainingTTL = Math.ceil(
      (windowExpires.getTime() - now.getTime()) / 1000
    );

    // Update data with remaining TTL
    await redis.set(
      key,
      JSON.stringify(rateLimitData),
      remainingTTL > 0 ? remainingTTL : RATE_LIMIT.WINDOW_SECONDS
    );

    return {
      allowed: true,
      remaining: RATE_LIMIT.MAX_UPLOADS - rateLimitData.uploads,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow upload if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Parse FormData from request
 *
 * Extracts:
 * - JSON question data from 'data' field
 * - Question image from 'question_image' field
 * - Option images from 'option_image_{index}' fields
 *
 * @param formData - FormData from request
 * @returns Parsed data and files
 * @throws Error if parsing fails
 */
async function parseFormData(formData: FormData): Promise<ParsedFormData> {
  try {
    // Extract and parse JSON data
    const dataString = formData.get("data");

    if (!dataString || typeof dataString !== "string") {
      throw new Error("Missing or invalid 'data' field in request");
    }

    let questionData: unknown;
    try {
      questionData = JSON.parse(dataString);
    } catch {
      throw new Error("Invalid JSON in 'data' field");
    }

    // Extract question image (if exists)
    let questionImageFile: File | null = null;
    const questionImage = formData.get("question_image");

    if (
      questionImage &&
      questionImage instanceof File &&
      questionImage.size > 0
    ) {
      questionImageFile = questionImage;
    }

    // Extract option images (if exist)
    const optionImageFiles = new Map<number, File>();

    // Parse all form entries to find option images
    for (const [key, value] of formData.entries()) {
      if (
        key.startsWith("option_image_") &&
        value instanceof File &&
        value.size > 0
      ) {
        const index = parseInt(key.replace("option_image_", ""));
        if (!isNaN(index)) {
          optionImageFiles.set(index, value);
        }
      }
    }

    return {
      questionData,
      questionImageFile,
      optionImageFiles,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to parse form data");
  }
}

/**
 * Process and upload files
 *
 * Validates and saves:
 * - Question image (if provided)
 * - Option images (if provided)
 *
 * On error, automatically cleans up any uploaded files.
 *
 * @param questionImageFile - Question image file (optional)
 * @param optionImageFiles - Map of option images by order_index
 * @param examType - Exam type for file organization
 * @param year - Year for file organization
 * @param subject - Subject for file organization
 * @returns Upload result with file paths
 * @throws Error if validation or upload fails
 */
async function processFileUploads(
  questionImageFile: File | null,
  optionImageFiles: Map<number, File>,
  examType: string,
  year: number,
  subject: string
): Promise<FileUploadResult> {
  const uploadedFiles: string[] = [];
  let questionImagePath: string | null = null;
  const optionImagePaths = new Map<number, string>();

  try {
    // ============================================
    // PROCESS QUESTION IMAGE
    // ============================================
    if (questionImageFile) {
      // Validate image
      const validation = await validateImageFile(questionImageFile);
      if (!validation.valid) {
        throw new Error(
          `Invalid question image: ${validation.error || "Unknown error"}`
        );
      }

      // Save image
      const saveResult = await saveUploadedFile(
        questionImageFile,
        examType,
        year,
        subject
      );

      if (!saveResult.success) {
        throw new Error(
          `Failed to save question image: ${saveResult.error || "Unknown error"}`
        );
      }

      questionImagePath = saveResult.filePath!;
      uploadedFiles.push(saveResult.filePath!);
    }

    // ============================================
    // PROCESS OPTION IMAGES
    // ============================================
    for (const [orderIndex, optionImageFile] of optionImageFiles.entries()) {
      // Validate image
      const validation = await validateImageFile(optionImageFile);
      if (!validation.valid) {
        throw new Error(
          `Invalid option image at index ${orderIndex}: ${validation.error || "Unknown error"}`
        );
      }

      // Save image
      const saveResult = await saveUploadedFile(
        optionImageFile,
        examType,
        year,
        subject
      );

      if (!saveResult.success) {
        throw new Error(
          `Failed to save option image at index ${orderIndex}: ${saveResult.error || "Unknown error"}`
        );
      }

      optionImagePaths.set(orderIndex, saveResult.filePath!);
      uploadedFiles.push(saveResult.filePath!);
    }

    return {
      questionImagePath,
      optionImagePaths,
      uploadedFiles,
    };
  } catch (error) {
    // Cleanup uploaded files on error
    if (uploadedFiles.length > 0) {
      await deleteFiles(uploadedFiles);
    }
    throw error;
  }
}

/**
 * Save question to database
 *
 * Creates Question record with nested QuestionOption records.
 * ALL SENSITIVE DATA IS ENCRYPTED AND STORED AS JSON - NO PLAINTEXT.
 * Field names remain unchanged for backwards compatibility.
 * Uses Prisma's implicit transaction via nested create.
 * Automatically rolls back on error.
 *
 * @param validatedData - Validated question data
 * @param questionImagePath - Path to question image (optional)
 * @param optionImagePaths - Map of option image paths by order_index
 * @param userId - User ID creating the question
 * @returns Created question with options
 * @throws Error if database operation fails
 */
async function saveQuestionToDatabase(
  validatedData: ReturnType<typeof validateQuestionUpload>,
  questionImagePath: string | null,
  optionImagePaths: Map<number, string>,
  userId: string
) {
  try {
    // Import encryption utility
    const { encrypt } = await import("@/lib/utils/encryption");

    // ============================================
    // ENCRYPT SENSITIVE DATA
    // ============================================

    // Encrypt question text (REQUIRED)
    const encryptedQuestionText = encrypt(validatedData.question_text);

    // Encrypt answer explanation (OPTIONAL)
    const encryptedExplanation = validatedData.answer_explanation
      ? encrypt(validatedData.answer_explanation)
      : null;

    // Encrypt each option text
    const encryptedOptions = validatedData.options.map((opt) => {
      const encryptedText = encrypt(opt.option_text);
      return {
        // Store encrypted data as JSON string in optionText field
        optionText: JSON.stringify({
          ciphertext: encryptedText.ciphertext,
          iv: encryptedText.iv,
          tag: encryptedText.tag,
          salt: encryptedText.salt,
        }),
        optionImage: optionImagePaths.get(opt.order_index) || null,
        isCorrect: opt.is_correct,
        orderIndex: opt.order_index,
      };
    });

    // ============================================
    // SAVE TO DATABASE (ENCRYPTED JSON IN EXISTING FIELDS)
    // ============================================

    // Prisma's nested create is already transactional
    const question = await prisma.question.create({
      data: {
        // Unencrypted metadata (for querying)
        examType: validatedData.exam_type,
        year: validatedData.year,
        subject: validatedData.subject,
        questionType: validatedData.question_type,
        questionImage: questionImagePath,
        questionPoint: validatedData.question_point,
        difficultyLevel: validatedData.difficulty_level,
        tags: validatedData.tags,
        timeLimit: validatedData.time_limit || null,
        language: validatedData.language,
        createdBy: userId,

        // Store encrypted question text as JSON string
        questionText: JSON.stringify({
          ciphertext: encryptedQuestionText.ciphertext,
          iv: encryptedQuestionText.iv,
          tag: encryptedQuestionText.tag,
          salt: encryptedQuestionText.salt,
        }),

        // Store encrypted answer explanation as JSON string (nullable)
        answerExplanation: encryptedExplanation
          ? JSON.stringify({
              ciphertext: encryptedExplanation.ciphertext,
              iv: encryptedExplanation.iv,
              tag: encryptedExplanation.tag,
              salt: encryptedExplanation.salt,
            })
          : null,

        // Create nested options with encrypted text as JSON
        options: {
          create: encryptedOptions,
        },
      },
      include: {
        options: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
    });

    return question;
  } catch (error) {
    console.error("Database save failed:", error);
    throw new Error("Failed to save question to database");
  }
}

/**
 * Log question upload audit entry
 *
 * Logs upload attempts (success and failure) for security auditing.
 * Currently logs to console, can be extended to database or external service.
 *
 * @param context - User context
 * @param questionId - Created question ID (if successful)
 * @param examType - Exam type
 * @param year - Year
 * @param subject - Subject
 * @param hasQuestionImage - Whether question image was uploaded
 * @param optionImagesCount - Number of option images uploaded
 * @param success - Whether upload was successful
 * @param errorMessage - Error message (if failed)
 */
async function logQuestionUpload(
  context: UserContext,
  questionId: string | null,
  examType: string,
  year: number,
  subject: string,
  hasQuestionImage: boolean,
  optionImagesCount: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      null;
    const userAgent = headersList.get("user-agent") || null;

    const auditLog = {
      timestamp: new Date(),
      userId: context.userId,
      userEmail: context.userEmail,
      userName: context.userName,
      action: "QUESTION_UPLOAD",
      questionId,
      examType,
      year,
      subject,
      hasQuestionImage,
      optionImagesCount,
      ipAddress,
      userAgent,
      success,
      errorMessage,
    };

    // Log to console (can be extended to database or external logging service)
    console.log("[AUDIT] Question Upload:", JSON.stringify(auditLog, null, 2));

    // TODO: Optional - Save to database audit log table
    // await prisma.auditLog.create({ data: auditLog });
  } catch (error) {
    console.error("Audit logging failed:", error);
    // Don't throw - audit logging failure shouldn't fail the upload
  }
}

// ============================================
// MAIN SERVER ACTION
// ============================================

/**
 * Upload Question Server Action
 *
 * Main entry point for question upload from Next.js client components.
 *
 * Process:
 * 1. Validate session and authorization
 * 2. Check rate limit
 * 3. Parse FormData (question data + files)
 * 4. Validate question data with Zod
 * 5. Process and upload files
 * 6. Save to database (transaction)
 * 7. Log audit entry
 * 8. Return success response
 *
 * Error Handling:
 * - Automatically cleans up uploaded files on error
 * - Database transaction automatically rolls back on error
 * - Returns typed error responses
 *
 * @param formData - FormData containing question data and images
 * @returns Typed response with success/error details
 *
 * @example
 * ```typescript
 * // Client usage:
 * const formData = new FormData();
 * formData.append("data", JSON.stringify(questionData));
 * formData.append("question_image", questionImageFile);
 * formData.append("option_image_0", optionImageFile);
 *
 * const result = await uploadQuestion(formData);
 *
 * if (result.success) {
 *   console.log("Question uploaded:", result.data.questionId);
 * } else {
 *   console.error("Upload failed:", result.message);
 * }
 * ```
 */
export async function uploadQuestion(
  formData: FormData
): Promise<QuestionUploadResponse> {
  const uploadedFiles: string[] = [];
  let userContext: UserContext | null = null;
  let examType = "";
  let year = 0;
  let subject = "";
  let hasQuestionImage = false;
  let optionImagesCount = 0;

  try {
    // ============================================
    // STEP 1: VALIDATE SESSION & AUTHORIZATION
    // ============================================
    try {
      userContext = await checkAuthorizationAndSession();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("{")) {
        const { code, message } = JSON.parse(error.message);
        return {
          success: false,
          message,
          code,
        };
      }
      return {
        success: false,
        message: "Authentication failed",
        code: "AUTH_ERROR",
      };
    }

    // ============================================
    // STEP 2: CHECK RATE LIMIT
    // ============================================
    const rateLimitResult = await checkRateLimit(userContext.userId);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // ============================================
    // STEP 3: PARSE FORMDATA
    // ============================================
    let parsedData: ParsedFormData;
    try {
      parsedData = await parseFormData(formData);
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to parse form data",
        code: "INVALID_REQUEST",
      };
    }

    // ============================================
    // STEP 4: VALIDATE QUESTION DATA
    // ============================================
    let validatedData: ReturnType<typeof validateQuestionUpload>;
    try {
      validatedData = validateQuestionUpload(parsedData.questionData);
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: formatValidationErrors(error),
        };
      }
      return {
        success: false,
        message: "Invalid question data",
        code: "VALIDATION_ERROR",
      };
    }

    // Extract metadata for audit logging
    examType = validatedData.exam_type;
    year = validatedData.year;
    subject = validatedData.subject;
    hasQuestionImage = parsedData.questionImageFile !== null;
    optionImagesCount = parsedData.optionImageFiles.size;

    // ============================================
    // STEP 5: PROCESS FILE UPLOADS
    // ============================================
    let fileUploadResult: FileUploadResult;
    try {
      fileUploadResult = await processFileUploads(
        parsedData.questionImageFile,
        parsedData.optionImageFiles,
        validatedData.exam_type,
        validatedData.year,
        validatedData.subject
      );
      uploadedFiles.push(...fileUploadResult.uploadedFiles);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "File upload failed",
        code: "UPLOAD_FAILED",
      };
    }

    // ============================================
    // STEP 6: SAVE TO DATABASE
    // ============================================
    let createdQuestion;
    try {
      createdQuestion = await saveQuestionToDatabase(
        validatedData,
        fileUploadResult.questionImagePath,
        fileUploadResult.optionImagePaths,
        userContext.userId
      );
    } catch (_error) {
      // Cleanup uploaded files
      if (uploadedFiles.length > 0) {
        await deleteFiles(uploadedFiles);
      }

      return {
        success: false,
        message: "Failed to save question to database",
        code: "DATABASE_ERROR",
      };
    }

    // ============================================
    // STEP 7: LOG AUDIT ENTRY
    // ============================================
    await logQuestionUpload(
      userContext,
      createdQuestion.id,
      examType,
      year,
      subject,
      hasQuestionImage,
      optionImagesCount,
      true // success
    );

    // ============================================
    // STEP 8: RETURN SUCCESS RESPONSE
    // ============================================
    return {
      success: true,
      message: "Question uploaded successfully",
      data: {
        questionId: createdQuestion.id,
        question: createdQuestion,
      },
    };
  } catch (error) {
    console.error("Unexpected error in uploadQuestion:", error);

    // Cleanup uploaded files on unexpected error
    if (uploadedFiles.length > 0) {
      await deleteFiles(uploadedFiles);
    }

    // Log failed attempt
    if (userContext) {
      await logQuestionUpload(
        userContext,
        null,
        examType,
        year,
        subject,
        hasQuestionImage,
        optionImagesCount,
        false, // failure
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
    };
  }
}
