/**
 * Question Upload Server Plugin
 *
 * UPDATED WITH RBAC PERMISSIONS
 *
 * Better Auth plugin for secure question upload with dual authentication:
 * 1. Session cookie (Better Auth session)
 * 2. API key (custom header validation)
 *
 * Features:
 * - Permission-based access (question upload permission required)
 * - Rate limiting (50 uploads/hour)
 * - File upload support (question + option images)
 * - Input validation and sanitization
 * - Database transactions with rollback
 * - Audit logging
 *
 * @module lib/plugins/question-upload/server
 */

import type { BetterAuthPlugin } from "better-auth";
import {
  createAuthEndpoint,
  sessionMiddleware,
  createAuthMiddleware,
} from "better-auth/api";
import { APIError } from "better-auth/api";
import prisma from "@/lib/prisma";
import {
  validateQuestionUpload,
  formatValidationErrors,
} from "@/lib/validations/question";
import {
  saveUploadedFile,
  deleteFiles,
  validateImageFile,
} from "@/lib/utils/file-upload";
import type { UploadedFileInfo } from "@/types/question-api";
import { ZodError } from "zod";
// ✅ NEW: Import auth instance for permission checking
import { auth } from "@/lib/auth";

// ============================================
// PLUGIN CONFIGURATION
// ============================================

const PLUGIN_ID = "question-upload";
const API_KEY_HEADER = "x-question-api-key";

export interface QuestionUploadPluginOptions {
  /**
   * API key for additional security
   * Should be stored in environment variable
   */
  apiKey: string;

  /**
   * Enable rate limiting
   * @default true
   */
  enableRateLimit?: boolean;

  /**
   * Rate limit configuration
   */
  rateLimit?: {
    window: number; // seconds
    max: number; // requests
  };
}

// ============================================
// PLUGIN FACTORY
// ============================================

export const questionUploadPlugin = (
  options: QuestionUploadPluginOptions
): BetterAuthPlugin => {
  const rateLimitConfig = options.rateLimit || {
    window: 3600, // 1 hour
    max: 50,
  };

  return {
    id: PLUGIN_ID,

    // ============================================
    // RATE LIMITING (Plugin Array Format)
    // ============================================
    rateLimit:
      options.enableRateLimit !== false
        ? [
            {
              pathMatcher: (path) => path === "/question/upload",
              window: rateLimitConfig.window,
              max: rateLimitConfig.max,
            },
          ]
        : undefined,

    // ============================================
    // ENDPOINTS
    // ============================================
    endpoints: {
      /**
       * Upload Question Endpoint
       *
       * POST /api/v1/auth/question/upload
       *
       * Authentication:
       * - Session cookie (via sessionMiddleware)
       * - API key (via custom header)
       *
       * Authorization:
       * - question:["upload"] permission required (admin or exam_manager)
       *
       * Request: multipart/form-data
       * - data: JSON stringified QuestionUploadInput
       * - question_image: File (optional)
       * - option_image_{index}: File (optional)
       */
      uploadQuestion: createAuthEndpoint(
        "/question/upload",
        {
          method: "POST",
          use: [sessionMiddleware], // Ensures valid session
        },
        async (ctx) => {
          const uploadedFiles: UploadedFileInfo[] = [];
          let questionId: string | undefined;

          try {
            // ============================================
            // STEP 1: VALIDATE API KEY
            // ============================================
            if (!ctx.request) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid request",
              });
            }

            const apiKey = ctx.request.headers.get(API_KEY_HEADER);

            if (!apiKey || apiKey !== options.apiKey) {
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid or missing API key",
              });
            }

            // ============================================
            // STEP 2: GET SESSION (already validated by sessionMiddleware)
            // ============================================
            const session = ctx.context.session;

            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // ============================================
            // STEP 3: VERIFY USER USING PRISMA
            // ============================================
            const user = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: {
                id: true,
                role: true,
                banned: true,
                email: true,
              },
            });

            if (!user) {
              throw new APIError("NOT_FOUND", {
                message: "User not found",
              });
            }

            if (user.banned) {
              throw new APIError("FORBIDDEN", {
                message: "Your account has been banned",
              });
            }

            // ✅ NEW: CHECK PERMISSION USING BETTER AUTH RBAC
            // Convert request headers to Headers object for Better Auth API
            const headersObject = new Headers();
            ctx.request.headers.forEach((value: string, key: string) => {
              headersObject.set(key, value);
            });

            const permissionCheck = await auth.api.userHasPermission({
              body: {
                userId: session.user.id,
                permissions: {
                  question: ["upload"],
                },
              },
            });

            if (!permissionCheck?.success) {
              throw new APIError("FORBIDDEN", {
                message: "You don't have permission to perform this operation.",
              });
            }

            // ============================================
            // STEP 4: PARSE FORMDATA
            // ============================================
            const formData = await ctx.request.formData();
            const dataString = formData.get("data");

            if (!dataString || typeof dataString !== "string") {
              throw new APIError("BAD_REQUEST", {
                message: "Missing or invalid 'data' field in request",
              });
            }

            let questionData: unknown;
            try {
              questionData = JSON.parse(dataString);
            } catch {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid JSON in 'data' field",
              });
            }

            // ============================================
            // STEP 5: VALIDATE QUESTION DATA
            // ============================================
            let validatedData: ReturnType<typeof validateQuestionUpload>;
            try {
              validatedData = validateQuestionUpload(questionData);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Validation failed",
                  details: formatValidationErrors(error),
                });
              }
              throw error;
            }

            // ============================================
            // STEP 6: PROCESS QUESTION IMAGE (if exists)
            // ============================================
            let questionImagePath: string | null = null;

            const questionImageFile = formData.get("question_image");

            if (
              questionImageFile &&
              questionImageFile instanceof File &&
              questionImageFile.size > 0
            ) {
              // Validate image
              const validation = await validateImageFile(questionImageFile);
              if (!validation.valid) {
                throw new APIError("BAD_REQUEST", {
                  message: validation.error || "Invalid question image",
                });
              }

              // Save image
              const saveResult = await saveUploadedFile(
                questionImageFile,
                validatedData.exam_type,
                validatedData.year,
                validatedData.subject
              );

              if (!saveResult.success) {
                throw new APIError("INTERNAL_SERVER_ERROR", {
                  message: saveResult.error || "Failed to save question image",
                });
              }

              questionImagePath = saveResult.filePath!;
              uploadedFiles.push({
                type: "question",
                relativePath: saveResult.filePath!,
                publicUrl: saveResult.publicUrl!,
              });
            }

            // ============================================
            // STEP 7: PROCESS OPTION IMAGES (if exist)
            // ============================================
            const optionImagePaths = new Map<number, string>();

            for (const option of validatedData.options) {
              const optionImageFile = formData.get(
                `option_image_${option.order_index}`
              );

              if (
                optionImageFile &&
                optionImageFile instanceof File &&
                optionImageFile.size > 0
              ) {
                // Validate image
                const validation = await validateImageFile(optionImageFile);
                if (!validation.valid) {
                  // Cleanup uploaded files
                  await deleteFiles(uploadedFiles.map((f) => f.relativePath));

                  throw new APIError("BAD_REQUEST", {
                    message: `Invalid option image at index ${option.order_index}: ${validation.error}`,
                  });
                }

                // Save image
                const saveResult = await saveUploadedFile(
                  optionImageFile,
                  validatedData.exam_type,
                  validatedData.year,
                  validatedData.subject
                );

                if (!saveResult.success) {
                  // Cleanup uploaded files
                  await deleteFiles(uploadedFiles.map((f) => f.relativePath));

                  throw new APIError("INTERNAL_SERVER_ERROR", {
                    message: `Failed to save option image at index ${option.order_index}`,
                  });
                }

                optionImagePaths.set(option.order_index, saveResult.filePath!);
                uploadedFiles.push({
                  type: "option",
                  orderIndex: option.order_index,
                  relativePath: saveResult.filePath!,
                  publicUrl: saveResult.publicUrl!,
                });
              }
            }

            // ============================================
            // STEP 8: SAVE TO DATABASE USING PRISMA
            // ============================================
            const question = await prisma.question.create({
              data: {
                examType: validatedData.exam_type,
                year: validatedData.year,
                subject: validatedData.subject,
                questionType: validatedData.question_type,
                questionText: validatedData.question_text,
                questionImage: questionImagePath,
                questionPoint: validatedData.question_point,
                answerExplanation: validatedData.answer_explanation || null,
                difficultyLevel: validatedData.difficulty_level,
                tags: JSON.stringify(validatedData.tags), // Store as JSON string
                timeLimit: validatedData.time_limit || null,
                language: validatedData.language,
                createdBy: session.user.id,
                options: {
                  create: validatedData.options.map((option) => ({
                    optionText: option.option_text,
                    optionImage:
                      optionImagePaths.get(option.order_index) || null,
                    isCorrect: option.is_correct,
                    orderIndex: option.order_index,
                  })),
                },
              },
              include: {
                options: true,
              },
            });

            questionId = question.id;

            // ============================================
            // STEP 9: AUDIT LOG
            // ============================================
            const ipAddress =
              ctx.request.headers.get("x-forwarded-for") ||
              ctx.request.headers.get("x-real-ip") ||
              null;
            const userAgent = ctx.request.headers.get("user-agent") || null;

            console.log(
              `[AUDIT] Question Upload Success:`,
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  userId: session.user.id,
                  userEmail: user.email,
                  userRole: user.role,
                  questionId: question.id,
                  examType: validatedData.exam_type,
                  year: validatedData.year,
                  subject: validatedData.subject,
                  hasQuestionImage: !!questionImagePath,
                  optionImagesCount: optionImagePaths.size,
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // ============================================
            // STEP 10: RETURN SUCCESS RESPONSE
            // ============================================
            return ctx.json(
              {
                success: true,
                message: "Question uploaded successfully",
                data: {
                  questionId: question.id,
                  question: question,
                },
              },
              { status: 201 }
            );
          } catch (error) {
            // ============================================
            // ERROR HANDLING & ROLLBACK
            // ============================================

            // Cleanup uploaded files
            if (uploadedFiles.length > 0) {
              await deleteFiles(uploadedFiles.map((f) => f.relativePath));
            }

            // Delete question from database if created
            if (questionId) {
              try {
                await prisma.question.delete({
                  where: { id: questionId },
                });
              } catch (deleteError) {
                console.error("Failed to rollback question:", deleteError);
              }
            }

            // Handle different error types
            if (error instanceof APIError) {
              return ctx.json(
                {
                  success: false,
                  message: error.message,
                  code: error.status,
                  errors: (error as { details?: Record<string, string> })
                    .details,
                },
                {
                  status: typeof error.status === "number" ? error.status : 500,
                }
              );
            }

            // Log unexpected errors
            console.error("Question upload error:", error);

            return ctx.json(
              {
                success: false,
                message: "Internal server error",
                code: "INTERNAL_ERROR",
              },
              { status: 500 }
            );
          }
        }
      ),
    },

    // ============================================
    // HOOKS FOR AUDIT LOGGING
    // ============================================
    hooks: {
      after: [
        {
          matcher: (context) => context.path === "/question/upload",
          handler: createAuthMiddleware(async (_ctx) => {
            // Additional post-upload processing can go here
            // e.g., trigger email notifications, webhooks, etc.
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};
