/**
 * Exam Session Plugin - FIXED
 *
 * Better Auth plugin for secure exam session management with:
 * - Triple authentication (session + API key + reCAPTCHA)
 * - Server-side timing to prevent manipulation
 * - Rate limiting
 * - Anti-cheat tracking
 * - Support for Practice, Test, Recruitment, Competition, and Challenge modes
 *
 * @module lib/plugins/exam-session/server
 */

import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { sessionMiddleware } from "better-auth/api";
import { APIError } from "better-auth/api";
import { z } from "zod";
import type {
  Exam,
  ExamSession,
  ExamAnswer,
  Question,
  QuestionOption,
  ExamQuestion,
  ExamInvitation,
  User,
} from "@/types/exam-session";

// ============================================
// CONFIGURATION
// ============================================

const PLUGIN_ID = "exam-session";
const API_KEY_HEADER = "x-exam-api-key";
const RECAPTCHA_HEADER = "x-captcha-token";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const examIdSchema = z.string().cuid();

const answerSchema = z.object({
  questionId: z.string().cuid(),
  selectedOptionId: z.string().cuid().nullable(),
  textAnswer: z.string().optional(),
  timeSpent: z.number().int().positive(),
});

const violationSchema = z.object({
  type: z.enum([
    "tab_switch",
    "window_blur",
    "copy_attempt",
    "paste_attempt",
    "fullscreen_exit",
  ]),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// PLUGIN OPTIONS
// ============================================

export interface ExamPluginOptions {
  /**
   * API key for additional security
   * Should be stored in environment variable
   */
  apiKey: string;

  /**
   * reCAPTCHA secret key
   * Required for reCAPTCHA validation
   */
  recaptchaSecretKey?: string;

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

  /**
   * Maximum concurrent sessions per user
   * @default 1
   */
  maxConcurrentSessions?: number;

  /**
   * Violation limit before auto-submit
   * @default 10
   */
  violationLimit?: number;

  /**
   * Auto-submit exam when violation limit is reached
   * @default true
   */
  autoSubmitOnViolationLimit?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verify reCAPTCHA token
 */
async function verifyRecaptcha(
  token: string,
  secretKey: string
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data = await response.json();
    return data.success === true && data.score >= 0.5; // Adjust score threshold as needed
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}

/**
 * Calculate remaining time for exam session
 */
function calculateRemainingTime(
  session: ExamSession,
  serverTime: Date
): number | null {
  if (!session.timeLimit) return null;

  const startedAt = new Date(session.startedAt);
  const elapsedSeconds = Math.floor(
    (serverTime.getTime() - startedAt.getTime()) / 1000
  );
  const remainingSeconds = session.timeLimit * 60 - elapsedSeconds;

  return Math.max(0, remainingSeconds);
}

/**
 * Check if exam session has expired
 */
function isSessionExpired(session: ExamSession, serverTime: Date): boolean {
  if (!session.timeLimit) return false;

  const remainingTime = calculateRemainingTime(session, serverTime);
  return remainingTime !== null && remainingTime <= 0;
}

// ============================================
// PLUGIN FACTORY
// ============================================

export const examPlugin = (options: ExamPluginOptions): BetterAuthPlugin => {
  const maxSessions = options.maxConcurrentSessions ?? 1;
  const violationLimit = options.violationLimit ?? 10;
  const autoSubmit = options.autoSubmitOnViolationLimit ?? true;
  const rateLimitConfig = options.rateLimit || {
    window: 300, // 5 minutes
    max: 50,
  };

  return {
    id: PLUGIN_ID,

    // ============================================
    // SCHEMA DEFINITION
    // ============================================
    schema: {
      examSession: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
              onDelete: "cascade",
            },
          },
          examId: { type: "string", required: true },
          examType: { type: "string", required: true },
          startedAt: { type: "date", required: true },
          completedAt: { type: "date", required: false },
          timeLimit: { type: "number", required: false },
          configuredQuestions: { type: "number", required: true },
          shuffleQuestions: {
            type: "boolean",
            required: false,
            defaultValue: false,
          },
          shuffleOptions: {
            type: "boolean",
            required: false,
            defaultValue: false,
          },
          status: { type: "string", required: false, defaultValue: "active" },
          score: { type: "number", required: false },
          totalQuestions: { type: "number", required: true },
          answeredQuestions: {
            type: "number",
            required: false,
            defaultValue: 0,
          },
          violationCount: { type: "number", required: false, defaultValue: 0 },
          questionOrder: { type: "string", required: true },
          serverStartTime: { type: "date", required: true },
          serverEndTime: { type: "date", required: false },
        },
      },
      examAnswer: {
        fields: {
          sessionId: {
            type: "string",
            required: true,
            references: {
              model: "examSession",
              field: "id",
              onDelete: "cascade",
            },
          },
          questionId: { type: "string", required: true },
          selectedOptionId: { type: "string", required: false },
          textAnswer: { type: "string", required: false },
          isCorrect: { type: "boolean", required: false },
          timeSpent: { type: "number", required: true },
          answeredAt: { type: "date", required: true },
        },
      },
      examViolation: {
        fields: {
          sessionId: {
            type: "string",
            required: true,
            references: {
              model: "examSession",
              field: "id",
              onDelete: "cascade",
            },
          },
          type: { type: "string", required: true },
          timestamp: { type: "date", required: true },
          metadata: { type: "string", required: false },
        },
      },
      examInvitation: {
        fields: {
          examId: { type: "string", required: true },
          userId: { type: "string", required: false },
          email: { type: "string", required: false },
          token: { type: "string", required: true, unique: true },
          expiresAt: { type: "date", required: false },
          usedAt: { type: "date", required: false },
          createdBy: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
              onDelete: "cascade",
            },
          },
        },
      },
    },

    // ============================================
    // RATE LIMITING
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
      // CHECK EXAM ACCESS
      // ============================================
      checkExamAccess: createAuthEndpoint(
        "/exam/access-check",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // STEP 1: Validate session
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "Authentication required",
              });
            }

            // STEP 2: Validate API key
            const apiKey = ctx.headers?.get(API_KEY_HEADER);
            if (!apiKey || apiKey !== options.apiKey) {
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid API key",
              });
            }

            // STEP 3: Validate reCAPTCHA (if configured)
            if (options.recaptchaSecretKey) {
              const recaptchaToken = ctx.headers?.get(RECAPTCHA_HEADER);
              if (!recaptchaToken) {
                throw new APIError("BAD_REQUEST", {
                  message: "reCAPTCHA token required",
                });
              }

              const isValid = await verifyRecaptcha(
                recaptchaToken,
                options.recaptchaSecretKey
              );
              if (!isValid) {
                throw new APIError("FORBIDDEN", {
                  message: "reCAPTCHA verification failed",
                });
              }
            }

            // STEP 4: Parse request body
            const bodySchema = z.object({
              examId: examIdSchema,
              invitationToken: z.string().optional(),
            });
            const body = bodySchema.parse(await ctx.body);

            // STEP 5: Fetch exam
            const exam = await ctx.context.adapter.findOne<Exam>({
              model: "exam",
              where: [{ field: "id", value: body.examId }],
            });

            if (!exam) {
              throw new APIError("NOT_FOUND", { message: "Exam not found" });
            }

            if (exam.deletedAt) {
              throw new APIError("NOT_FOUND", {
                message: "Exam not available",
              });
            }

            if (exam.status !== "published") {
              throw new APIError("FORBIDDEN", {
                message: "Exam not published",
              });
            }

            // STEP 6: Check exam date constraints
            const now = new Date();
            if (exam.startDate && new Date(exam.startDate) > now) {
              throw new APIError("FORBIDDEN", {
                message: "Exam not started yet",
              });
            }
            if (exam.endDate && new Date(exam.endDate) < now) {
              throw new APIError("FORBIDDEN", {
                message: "Exam has ended",
              });
            }

            // STEP 7: Fetch user
            const user = await ctx.context.adapter.findOne<User>({
              model: "user",
              where: [{ field: "id", value: session.user.id }],
            });

            if (!user) {
              throw new APIError("UNAUTHORIZED", {
                message: "User not found",
              });
            }

            // STEP 8: Validate access based on exam type
            const examType = exam.category?.toLowerCase() || "practice";

            if (examType === "recruitment" || examType === "competition") {
              const isAdmin =
                user.role === "admin" || exam.createdBy === session.user.id;

              if (!isAdmin) {
                if (!body.invitationToken) {
                  throw new APIError("FORBIDDEN", {
                    message: "Invitation required",
                  });
                }

                const invitation =
                  await ctx.context.adapter.findOne<ExamInvitation>({
                    model: "examInvitation",
                    where: [
                      { field: "token", value: body.invitationToken },
                      { field: "examId", value: body.examId },
                    ],
                  });

                if (!invitation) {
                  throw new APIError("FORBIDDEN", {
                    message: "Invalid invitation",
                  });
                }

                if (
                  invitation.expiresAt &&
                  new Date(invitation.expiresAt) < now
                ) {
                  throw new APIError("FORBIDDEN", {
                    message: "Invitation expired",
                  });
                }

                if (invitation.usedAt) {
                  throw new APIError("FORBIDDEN", {
                    message: "Invitation already used",
                  });
                }

                if (
                  invitation.userId &&
                  invitation.userId !== session.user.id
                ) {
                  throw new APIError("FORBIDDEN", {
                    message: "Invitation not for this user",
                  });
                }

                if (invitation.email && user.email !== invitation.email) {
                  throw new APIError("FORBIDDEN", {
                    message: "Invitation not for this email",
                  });
                }
              }
            } else if (examType === "challenge") {
              if (!body.invitationToken) {
                throw new APIError("FORBIDDEN", {
                  message: "Challenge link required",
                });
              }

              const invitation =
                await ctx.context.adapter.findOne<ExamInvitation>({
                  model: "examInvitation",
                  where: [
                    { field: "token", value: body.invitationToken },
                    { field: "examId", value: body.examId },
                  ],
                });

              if (!invitation) {
                throw new APIError("FORBIDDEN", {
                  message: "Invalid challenge link",
                });
              }

              if (
                invitation.expiresAt &&
                new Date(invitation.expiresAt) < now
              ) {
                throw new APIError("FORBIDDEN", {
                  message: "Challenge link expired",
                });
              }
            }

            return ctx.json({
              success: true,
              hasAccess: true,
              exam: {
                id: exam.id,
                title: exam.title,
                examType: exam.examType,
                subject: exam.subject,
                year: exam.year,
                duration: exam.duration,
                shuffleQuestions: exam.shuffleQuestions,
                randomizeOptions: exam.randomizeOptions,
                category: exam.category,
              },
            });
          } catch (error) {
            if (error instanceof APIError) {
              return ctx.json(
                {
                  success: false,
                  hasAccess: false,
                  message: error.message,
                },
                { status: error.status as number }
              );
            }

            console.error("Access check error:", error);
            return ctx.json(
              {
                success: false,
                hasAccess: false,
                message: "Internal server error",
              },
              { status: 500 }
            );
          }
        }
      ),

      // ============================================
      // START EXAM SESSION
      // ============================================
      startExamSession: createAuthEndpoint(
        "/exam/start",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // STEP 1: Validate session
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "Authentication required",
              });
            }

            // STEP 2: Validate API key
            const apiKey = ctx.headers?.get(API_KEY_HEADER);
            if (!apiKey || apiKey !== options.apiKey) {
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid API key",
              });
            }

            // STEP 3: Validate reCAPTCHA (if configured)
            if (options.recaptchaSecretKey) {
              const recaptchaToken = ctx.headers?.get(RECAPTCHA_HEADER);
              if (!recaptchaToken) {
                throw new APIError("BAD_REQUEST", {
                  message: "reCAPTCHA token required",
                });
              }

              const isValid = await verifyRecaptcha(
                recaptchaToken,
                options.recaptchaSecretKey
              );
              if (!isValid) {
                throw new APIError("FORBIDDEN", {
                  message: "reCAPTCHA verification failed",
                });
              }
            }

            // STEP 4: Parse request body
            const bodySchema = z.object({
              examId: examIdSchema,
              configuredQuestions: z.number().int().positive().optional(),
              timeLimit: z.number().int().positive().optional(),
              shuffleQuestions: z.boolean().default(false),
              shuffleOptions: z.boolean().default(false),
              invitationToken: z.string().optional(),
            });
            const body = bodySchema.parse(await ctx.body);

            // STEP 5: Check concurrent sessions
            const activeSessions =
              await ctx.context.adapter.findMany<ExamSession>({
                model: "examSession",
                where: [
                  { field: "userId", value: session.user.id },
                  { field: "status", value: "active" },
                ],
              });

            if (activeSessions.length >= maxSessions) {
              throw new APIError("FORBIDDEN", {
                message: `Maximum ${maxSessions} concurrent session(s) allowed`,
              });
            }

            // STEP 6: Fetch exam with questions
            const exam = await ctx.context.adapter.findOne<Exam>({
              model: "exam",
              where: [{ field: "id", value: body.examId }],
            });

            if (!exam) {
              throw new APIError("NOT_FOUND", { message: "Exam not found" });
            }

            // STEP 7: Get exam questions
            const examQuestions =
              await ctx.context.adapter.findMany<ExamQuestion>({
                model: "examQuestion",
                where: [{ field: "examId", value: body.examId }],
              });

            if (examQuestions.length === 0) {
              throw new APIError("BAD_REQUEST", {
                message: "Exam has no questions",
              });
            }

            // STEP 8: Determine question selection
            const totalAvailable = examQuestions.length;
            const configuredQuestions =
              body.configuredQuestions || totalAvailable;
            const actualQuestions = Math.min(
              configuredQuestions,
              totalAvailable
            );

            // STEP 9: Generate question order
            let questionOrder: string[];
            if (body.shuffleQuestions) {
              // Shuffle and take the configured number
              const shuffled = [...examQuestions].sort(
                () => Math.random() - 0.5
              );
              questionOrder = shuffled
                .slice(0, actualQuestions)
                .map((eq) => eq.questionId);
            } else {
              // Take first N questions in order
              questionOrder = examQuestions
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .slice(0, actualQuestions)
                .map((eq) => eq.questionId);
            }

            // STEP 10: Mark invitation as used (if applicable)
            if (body.invitationToken) {
              const invitation =
                await ctx.context.adapter.findOne<ExamInvitation>({
                  model: "examInvitation",
                  where: [
                    { field: "token", value: body.invitationToken },
                    { field: "examId", value: body.examId },
                  ],
                });

              if (invitation && !invitation.usedAt) {
                await ctx.context.adapter.update({
                  model: "examInvitation",
                  where: [{ field: "id", value: invitation.id }],
                  update: {
                    usedAt: new Date(),
                    updatedAt: new Date(),
                  },
                });
              }
            }

            // STEP 11: Create exam session with SERVER-SIDE TIMING
            const serverTime = new Date();
            const sessionId = ctx.context.generateId({ model: "examSession" });

            await ctx.context.adapter.create({
              model: "examSession",
              data: {
                id: sessionId,
                userId: session.user.id,
                examId: body.examId,
                examType: exam.category || "practice",
                startedAt: serverTime,
                serverStartTime: serverTime, // Server-controlled start time
                timeLimit: body.timeLimit,
                configuredQuestions: actualQuestions,
                shuffleQuestions: body.shuffleQuestions,
                shuffleOptions: body.shuffleOptions,
                status: "active",
                totalQuestions: actualQuestions,
                answeredQuestions: 0,
                violationCount: 0,
                questionOrder: JSON.stringify(questionOrder),
                createdAt: serverTime,
                updatedAt: serverTime,
              },
            });

            // STEP 12: Return session with server time
            return ctx.json({
              sessionId,
              examId: body.examId,
              totalQuestions: actualQuestions,
              timeLimit: body.timeLimit,
              serverStartTime: serverTime.toISOString(),
              questionOrder,
            });
          } catch (error) {
            if (error instanceof APIError) {
              return ctx.json(
                { success: false, message: error.message },
                { status: error.status as number }
              );
            }

            console.error("Start exam error:", error);
            return ctx.json(
              { success: false, message: "Internal server error" },
              { status: 500 }
            );
          }
        }
      ),

      // ============================================
      // GET SESSION STATUS (SERVER-SIDE TIME CHECK)
      // ============================================
      getSessionStatus: createAuthEndpoint(
        "/exam/status",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "Authentication required",
              });
            }

            const bodySchema = z.object({
              sessionId: z.string().cuid(),
            });
            const body = bodySchema.parse(await ctx.body);

            const examSession = await ctx.context.adapter.findOne<ExamSession>({
              model: "examSession",
              where: [{ field: "id", value: body.sessionId }],
            });

            if (!examSession || examSession.userId !== session.user.id) {
              throw new APIError("FORBIDDEN", { message: "Invalid session" });
            }

            // SERVER-SIDE TIME CALCULATION
            const serverTime = new Date();
            const remainingTime = calculateRemainingTime(
              examSession,
              serverTime
            );
            const isExpired = isSessionExpired(examSession, serverTime);

            // Auto-complete if time expired
            if (isExpired && examSession.status === "active") {
              const answers = await ctx.context.adapter.findMany<ExamAnswer>({
                model: "examAnswer",
                where: [{ field: "sessionId", value: body.sessionId }],
              });

              const correctAnswers = answers.filter(
                (a) => a.isCorrect === true
              ).length;
              const score = (correctAnswers / examSession.totalQuestions) * 100;

              await ctx.context.adapter.update({
                model: "examSession",
                where: [{ field: "id", value: body.sessionId }],
                update: {
                  status: "completed",
                  completedAt: serverTime,
                  serverEndTime: serverTime,
                  score,
                  updatedAt: serverTime,
                },
              });

              return ctx.json({
                status: "expired",
                message: "Exam time expired",
                remainingTime: 0,
                serverTime: serverTime.toISOString(),
              });
            }

            return ctx.json({
              status: examSession.status,
              remainingTime,
              serverTime: serverTime.toISOString(),
              answeredQuestions: examSession.answeredQuestions,
              totalQuestions: examSession.totalQuestions,
              violationCount: examSession.violationCount,
            });
          } catch (error) {
            if (error instanceof APIError) {
              return ctx.json(
                { success: false, message: error.message },
                { status: error.status as number }
              );
            }

            console.error("Session status error:", error);
            return ctx.json(
              { success: false, message: "Internal server error" },
              { status: 500 }
            );
          }
        }
      ),

      // ============================================
      // SUBMIT ANSWER
      // ============================================
      submitAnswer: createAuthEndpoint(
        "/exam/submit-answer",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "Authentication required",
              });
            }

            const bodySchema = z.object({
              sessionId: z.string().cuid(),
              answer: answerSchema,
            });
            const body = bodySchema.parse(await ctx.body);

            const examSession = await ctx.context.adapter.findOne<ExamSession>({
              model: "examSession",
              where: [{ field: "id", value: body.sessionId }],
            });

            if (!examSession || examSession.userId !== session.user.id) {
              throw new APIError("FORBIDDEN", { message: "Invalid session" });
            }

            if (examSession.status !== "active") {
              throw new APIError("FORBIDDEN", {
                message: "Session not active",
              });
            }

            // Check if time expired (server-side)
            const serverTime = new Date();
            if (isSessionExpired(examSession, serverTime)) {
              throw new APIError("FORBIDDEN", {
                message: "Exam time expired",
              });
            }

            // Check if already answered
            const existingAnswer =
              await ctx.context.adapter.findOne<ExamAnswer>({
                model: "examAnswer",
                where: [
                  { field: "sessionId", value: body.sessionId },
                  { field: "questionId", value: body.answer.questionId },
                ],
              });

            if (existingAnswer) {
              throw new APIError("BAD_REQUEST", {
                message: "Question already answered",
              });
            }

            // Get question to determine correctness
            const question = await ctx.context.adapter.findOne<Question>({
              model: "question",
              where: [{ field: "id", value: body.answer.questionId }],
            });

            let isCorrect: boolean | null = null;

            if (question && body.answer.selectedOptionId) {
              const option = await ctx.context.adapter.findOne<QuestionOption>({
                model: "questionOption",
                where: [
                  { field: "id", value: body.answer.selectedOptionId },
                  { field: "questionId", value: body.answer.questionId },
                ],
              });

              if (option) {
                isCorrect = option.isCorrect;
              }
            }

            // Create answer record - FIX: Pass options object to generateId
            const answerId = ctx.context.generateId({ model: "examAnswer" });
            const now = new Date();

            await ctx.context.adapter.create({
              model: "examAnswer",
              data: {
                id: answerId,
                sessionId: body.sessionId,
                questionId: body.answer.questionId,
                selectedOptionId: body.answer.selectedOptionId,
                textAnswer: body.answer.textAnswer,
                isCorrect,
                timeSpent: body.answer.timeSpent,
                answeredAt: now,
                createdAt: now,
              },
            });

            // Update session
            await ctx.context.adapter.update({
              model: "examSession",
              where: [{ field: "id", value: body.sessionId }],
              update: {
                answeredQuestions: examSession.answeredQuestions + 1,
                updatedAt: now,
              },
            });

            // Prepare feedback (only for practice mode)
            let feedback = null;
            if (examSession.examType === "practice" && isCorrect !== null) {
              feedback = {
                isCorrect,
                correctAnswer: isCorrect ? null : body.answer.selectedOptionId,
                explanation: question?.answerExplanation || null,
              };
            }

            return ctx.json({
              success: true,
              feedback,
            });
          } catch (error) {
            if (error instanceof APIError) {
              return ctx.json(
                { success: false, message: error.message },
                { status: error.status as number }
              );
            }

            console.error("Submit answer error:", error);
            return ctx.json(
              { success: false, message: "Internal server error" },
              { status: 500 }
            );
          }
        }
      ),

      // ============================================
      // COMPLETE EXAM
      // ============================================
      completeExam: createAuthEndpoint(
        "/exam/complete",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "Authentication required",
              });
            }

            const bodySchema = z.object({
              sessionId: z.string().cuid(),
            });
            const body = bodySchema.parse(await ctx.body);

            const examSession = await ctx.context.adapter.findOne<ExamSession>({
              model: "examSession",
              where: [{ field: "id", value: body.sessionId }],
            });

            if (!examSession || examSession.userId !== session.user.id) {
              throw new APIError("FORBIDDEN", { message: "Invalid session" });
            }

            if (examSession.status !== "active") {
              throw new APIError("BAD_REQUEST", {
                message: "Session already completed",
              });
            }

            const answers = await ctx.context.adapter.findMany<ExamAnswer>({
              model: "examAnswer",
              where: [{ field: "sessionId", value: body.sessionId }],
            });

            const correctAnswers = answers.filter(
              (a) => a.isCorrect === true
            ).length;
            const score = (correctAnswers / examSession.totalQuestions) * 100;

            const now = new Date();

            await ctx.context.adapter.update({
              model: "examSession",
              where: [{ field: "id", value: body.sessionId }],
              update: {
                status: "completed",
                completedAt: now,
                serverEndTime: now, // Server-controlled end time
                score,
                updatedAt: now,
              },
            });

            return ctx.json({
              sessionId: body.sessionId,
              score,
              correctAnswers,
              totalQuestions: examSession.totalQuestions,
              completedAt: now.toISOString(),
            });
          } catch (error) {
            if (error instanceof APIError) {
              return ctx.json(
                { success: false, message: error.message },
                { status: error.status as number }
              );
            }

            console.error("Complete exam error:", error);
            return ctx.json(
              { success: false, message: "Internal server error" },
              { status: 500 }
            );
          }
        }
      ),

      // ============================================
      // TRACK VIOLATION
      // ============================================
      trackViolation: createAuthEndpoint(
        "/exam/track-violation",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "Authentication required",
              });
            }

            const bodySchema = z.object({
              sessionId: z.string().cuid(),
              violation: violationSchema,
            });
            const body = bodySchema.parse(await ctx.body);

            const examSession = await ctx.context.adapter.findOne<ExamSession>({
              model: "examSession",
              where: [{ field: "id", value: body.sessionId }],
            });

            if (!examSession || examSession.userId !== session.user.id) {
              throw new APIError("FORBIDDEN", { message: "Invalid session" });
            }

            if (examSession.status !== "active") {
              return ctx.json({ recorded: false });
            }

            // Create violation record - FIX: Pass options object to generateId
            const violationId = ctx.context.generateId({
              model: "examViolation",
            });
            const now = new Date();

            await ctx.context.adapter.create({
              model: "examViolation",
              data: {
                id: violationId,
                sessionId: body.sessionId,
                type: body.violation.type,
                timestamp: new Date(body.violation.timestamp),
                metadata: body.violation.metadata
                  ? JSON.stringify(body.violation.metadata)
                  : null,
                createdAt: now,
              },
            });

            const newViolationCount = examSession.violationCount + 1;

            await ctx.context.adapter.update({
              model: "examSession",
              where: [{ field: "id", value: body.sessionId }],
              update: {
                violationCount: newViolationCount,
                updatedAt: now,
              },
            });

            // Auto-submit if violation limit reached
            let autoSubmitted = false;
            if (autoSubmit && newViolationCount >= violationLimit) {
              const answers = await ctx.context.adapter.findMany<ExamAnswer>({
                model: "examAnswer",
                where: [{ field: "sessionId", value: body.sessionId }],
              });

              const correctAnswers = answers.filter(
                (a) => a.isCorrect === true
              ).length;
              const score = (correctAnswers / examSession.totalQuestions) * 100;

              await ctx.context.adapter.update({
                model: "examSession",
                where: [{ field: "id", value: body.sessionId }],
                update: {
                  status: "completed",
                  completedAt: now,
                  serverEndTime: now,
                  score,
                  updatedAt: now,
                },
              });
              autoSubmitted = true;
            }

            return ctx.json({
              recorded: true,
              violationCount: newViolationCount,
              autoSubmitted,
            });
          } catch (error) {
            if (error instanceof APIError) {
              return ctx.json(
                { success: false, message: error.message },
                { status: error.status as number }
              );
            }

            console.error("Track violation error:", error);
            return ctx.json(
              { success: false, message: "Internal server error" },
              { status: 500 }
            );
          }
        }
      ),
    },
  } satisfies BetterAuthPlugin;
};
