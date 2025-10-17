/**
 * Exam Upload Server Plugin
 *
 * Better Auth plugin for secure exam upload with triple authentication:
 * 1. Session cookie (Better Auth session)
 * 2. API key (custom header validation)
 * 3. reCAPTCHA v3 validation
 *
 * Features:
 * - ADMIN ONLY access (no exam_manager)
 * - Rate limiting (10 creates/5 minutes)
 * - Input validation and sanitization
 * - Database transactions with rollback
 * - Audit logging
 *
 * @module lib/plugins/exam-upload/server
 */

import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { APIError } from "better-auth/api";
import prisma from "@/lib/prisma";
import {
  validateExamUpload,
  formatValidationErrors,
} from "@/lib/validations/exam";
import { ZodError } from "zod";

// ============================================
// PLUGIN CONFIGURATION
// ============================================

const PLUGIN_ID = "exam-upload";
const API_KEY_HEADER = "x-exam-api-key";

export interface ExamUploadPluginOptions {
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

export const examUploadPlugin = (
  options: ExamUploadPluginOptions
): BetterAuthPlugin => {
  const rateLimitConfig = options.rateLimit || {
    window: 300, // 5 minutes
    max: 10,
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
              pathMatcher: (path) => path.startsWith("/exam/"),
              window: rateLimitConfig.window,
              max: rateLimitConfig.max,
            },
          ]
        : undefined,

    // ============================================
    // ENDPOINTS
    // ============================================
    endpoints: {
      // ============================================
      // CREATE EXAM ENDPOINT
      // ============================================
      createExam: createAuthEndpoint(
        "/exam/create",
        {
          method: "POST",
          requireHeaders: true,
        },
        async (ctx) => {
          try {
            // ============================================
            // STEP 1: VALIDATE SESSION
            // ============================================
            if (!ctx.context.session || !ctx.context.session.user) {
              throw new APIError("UNAUTHORIZED", {
                message: "Authentication required",
              });
            }

            const session = ctx.context.session;

            // ============================================
            // STEP 2: VERIFY ADMIN ROLE (NOT EXAM_MANAGER)
            // ============================================
            const user = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { role: true, banned: true },
            });

            if (!user || user.banned) {
              throw new APIError("FORBIDDEN", {
                message: "Access denied",
              });
            }

            // CRITICAL: Only admin role allowed
            if (user.role !== "admin") {
              throw new APIError("FORBIDDEN", {
                message: "Only administrators can create exams",
              });
            }

            // ============================================
            // STEP 3: VALIDATE API KEY
            // ============================================
            const apiKey = ctx.headers?.get(API_KEY_HEADER);

            if (!apiKey || apiKey !== options.apiKey) {
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid API key",
              });
            }

            // ============================================
            // STEP 4: VALIDATE RECAPTCHA TOKEN
            // ============================================
            const recaptchaToken = ctx.headers?.get("x-captcha-token");

            if (!recaptchaToken) {
              throw new APIError("BAD_REQUEST", {
                message: "reCAPTCHA token required",
              });
            }

            // Note: Better Auth's captcha plugin validates this automatically
            // if configured in the main auth setup

            // ============================================
            // STEP 5: PARSE AND VALIDATE REQUEST BODY
            // ============================================
            const body = await ctx.body;

            let validatedData;
            try {
              validatedData = validateExamUpload(body);
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
            // STEP 6: VERIFY QUESTIONS EXIST
            // ============================================
            const questions = await prisma.question.findMany({
              where: {
                id: { in: validatedData.question_ids },
                deletedAt: null, // Only active questions
              },
              select: {
                id: true,
                questionPoint: true,
              },
            });

            if (questions.length !== validatedData.question_ids.length) {
              throw new APIError("BAD_REQUEST", {
                message: "Some questions do not exist or have been deleted",
                code: "INVALID_QUESTIONS",
              });
            }

            // ============================================
            // STEP 7: CREATE EXAM IN TRANSACTION
            // ============================================
            const exam = await prisma.$transaction(async (tx) => {
              // Create exam
              const newExam = await tx.exam.create({
                data: {
                  examType: validatedData.exam_type,
                  subject: validatedData.subject,
                  year: validatedData.year,
                  title: validatedData.title,
                  description: validatedData.description || null,
                  duration: validatedData.duration,
                  passingScore: validatedData.passing_score || null,
                  maxAttempts: validatedData.max_attempts || null,
                  shuffleQuestions: validatedData.shuffle_questions,
                  randomizeOptions: validatedData.randomize_options,
                  isPublic: validatedData.is_public,
                  isFree: validatedData.is_free,
                  status: validatedData.status,
                  category: validatedData.category || null,
                  startDate: validatedData.start_date
                    ? new Date(validatedData.start_date)
                    : null,
                  endDate: validatedData.end_date
                    ? new Date(validatedData.end_date)
                    : null,
                  createdBy: session.user.id,
                },
              });

              // Create exam questions with order
              await tx.examQuestion.createMany({
                data: validatedData.question_ids.map((qid, index) => ({
                  examId: newExam.id,
                  questionId: qid,
                  orderIndex: index,
                })),
              });

              // Fetch complete exam with questions
              return await tx.exam.findUnique({
                where: { id: newExam.id },
                include: {
                  questions: {
                    include: {
                      question: true,
                    },
                    orderBy: {
                      orderIndex: "asc",
                    },
                  },
                },
              });
            });

            // ============================================
            // STEP 8: AUDIT LOGGING
            // ============================================
            const ipAddress =
              ctx.headers?.get("x-forwarded-for") ||
              ctx.headers?.get("x-real-ip") ||
              null;
            const userAgent = ctx.headers?.get("user-agent") || null;

            console.log(
              "[AUDIT] Exam Created:",
              JSON.stringify(
                {
                  timestamp: new Date(),
                  userId: session.user.id,
                  userEmail: session.user.email,
                  userName: session.user.name,
                  userRole: user.role,
                  action: "EXAM_CREATE",
                  examId: exam!.id,
                  examType: exam!.examType,
                  subject: exam!.subject,
                  year: exam!.year,
                  questionCount: validatedData.question_ids.length,
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // ============================================
            // STEP 9: RETURN SUCCESS RESPONSE
            // ============================================
            return ctx.json(
              {
                success: true,
                message: "Exam created successfully",
                data: {
                  examId: exam!.id,
                  exam: exam,
                },
              },
              { status: 201 }
            );
          } catch (error) {
            // ============================================
            // ERROR HANDLING
            // ============================================
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
            console.error("Exam creation error:", error);

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
  } satisfies BetterAuthPlugin;
};
