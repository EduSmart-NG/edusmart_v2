/**
 * Exam Upload Server Actions
 *
 * Secure server actions for exam CRUD operations.
 * Handles authentication, authorization, validation, and database transactions.
 *
 * Security Features:
 * - Session validation via Better Auth
 * - Admin-only access control
 * - Rate limiting (10 creates/5 minutes per admin)
 * - Input sanitization (Zod + DOMPurify)
 * - reCAPTCHA validation
 * - SQL injection prevention (Prisma parameterized queries)
 *
 * @module lib/actions/exam-upload
 */

"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import {
  validateExamUpload,
  validateQuestionSearch,
  formatValidationErrors,
} from "@/lib/validations/exam";
import { decryptQuestion } from "@/lib/utils/question-decrypt";
import type {
  ExamUploadResponse,
  ExamDeleteResponse,
  ExamListResponse,
  QuestionSearchResponse,
  QuestionDecrypted,
  ExamWithStats,
} from "@/types/exam-api";
import { ZodError } from "zod";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

// ============================================
// TYPES
// ============================================

interface AdminContext {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verify admin access
 *
 * @returns Admin context or null if unauthorized
 */
async function verifyAdminAccess(): Promise<AdminContext | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        banned: true,
      },
    });

    if (!user || user.banned) {
      return null;
    }

    // CRITICAL: Only admin role allowed
    if (user.role !== "admin") {
      return null;
    }

    return {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
    };
  } catch (error) {
    console.error("Admin verification error:", error);
    return null;
  }
}

/**
 * Log audit entry
 *
 * @param context - Admin context
 * @param action - Action performed
 * @param details - Additional details
 */
async function logAuditEntry(
  context: AdminContext,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      null;
    const userAgent = headersList.get("user-agent") || null;

    console.log(
      `[AUDIT] ${action}:`,
      JSON.stringify(
        {
          timestamp: new Date(),
          userId: context.userId,
          userEmail: context.userEmail,
          userName: context.userName,
          userRole: context.userRole,
          action,
          ...details,
          ipAddress,
          userAgent,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
}

// ============================================
// CREATE EXAM
// ============================================

/**
 * Create a new exam (admin only)
 *
 * @param formData - Form data containing exam details
 * @param _recaptchaToken - reCAPTCHA v3 token (validated by Better Auth plugin)
 * @returns Exam creation result
 */
export async function createExam(
  formData: FormData,
  _recaptchaToken: string
): Promise<ExamUploadResponse> {
  try {
    // STEP 1: Verify admin access
    const adminContext = await verifyAdminAccess();
    if (!adminContext) {
      return {
        success: false,
        message: "Only administrators can create exams",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Check rate limit
    const rateLimitResult = await checkRateLimit(
      "exam:create",
      { max: 10, windowSeconds: 300 },
      adminContext.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // STEP 3: Parse FormData
    const passingScoreValue = formData.get("passing_score") as string;
    const maxAttemptsValue = formData.get("max_attempts") as string;
    const categoryValue = formData.get("category") as string;
    const startDateValue = formData.get("start_date") as string;
    const endDateValue = formData.get("end_date") as string;
    const descriptionValue = formData.get("description") as string;

    const data = {
      exam_type: formData.get("exam_type") as string,
      subject: formData.get("subject") as string,
      year: parseInt(formData.get("year") as string),
      title: formData.get("title") as string,
      description:
        descriptionValue && descriptionValue.trim()
          ? descriptionValue
          : undefined,
      duration: parseInt(formData.get("duration") as string),
      passing_score:
        passingScoreValue && passingScoreValue.trim()
          ? parseFloat(passingScoreValue)
          : null,
      max_attempts:
        maxAttemptsValue && maxAttemptsValue.trim()
          ? parseInt(maxAttemptsValue)
          : null,
      shuffle_questions: formData.get("shuffle_questions") === "true",
      randomize_options: formData.get("randomize_options") === "true",
      is_public: formData.get("is_public") === "true",
      is_free: formData.get("is_free") === "true",
      status: formData.get("status") as string,
      category:
        categoryValue && categoryValue.trim() ? categoryValue : undefined,
      start_date:
        startDateValue && startDateValue.trim() ? startDateValue : undefined,
      end_date: endDateValue && endDateValue.trim() ? endDateValue : undefined,
      question_ids: JSON.parse(
        formData.get("question_ids") as string
      ) as string[],
    };

    // Log parsed data for debugging
    console.log("Server received data:", data);

    // STEP 4: Validate data
    let validatedData;
    try {
      validatedData = validateExamUpload(data);
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: formatValidationErrors(error),
        };
      }
      throw error;
    }

    // STEP 5: Verify questions exist
    const questions = await prisma.question.findMany({
      where: {
        id: { in: validatedData.question_ids },
        deletedAt: null,
      },
      select: {
        id: true,
        questionPoint: true,
      },
    });

    if (questions.length !== validatedData.question_ids.length) {
      return {
        success: false,
        message: "Some questions do not exist or have been deleted",
        code: "INVALID_QUESTIONS",
      };
    }

    // STEP 6: Create exam in transaction
    const createdExam = await prisma.$transaction(async (tx) => {
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
          createdBy: adminContext.userId,
        },
      });

      await tx.examQuestion.createMany({
        data: validatedData.question_ids.map((qid, index) => ({
          examId: newExam.id,
          questionId: qid,
          orderIndex: index,
        })),
      });

      return await tx.exam.findUnique({
        where: { id: newExam.id },
        include: {
          questions: {
            include: {
              question: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
      });
    });

    // STEP 7: Log audit entry
    await logAuditEntry(adminContext, "EXAM_CREATE", {
      examId: createdExam!.id,
      examType: createdExam!.examType,
      subject: createdExam!.subject,
      year: createdExam!.year,
      questionCount: validatedData.question_ids.length,
    });

    return {
      success: true,
      message: "Exam created successfully",
      data: {
        examId: createdExam!.id,
        exam: createdExam!,
      },
    };
  } catch (error) {
    console.error("Exam creation error:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// UPDATE EXAM
// ============================================

/**
 * Update an existing exam (admin only)
 *
 * @param examId - Exam ID to update
 * @param formData - Form data with updated fields
 * @param _recaptchaToken - reCAPTCHA v3 token (validated by Better Auth plugin)
 * @returns Exam update result
 */
export async function updateExam(
  examId: string,
  formData: FormData,
  _recaptchaToken: string
): Promise<ExamUploadResponse> {
  try {
    // STEP 1: Verify admin access
    const adminContext = await verifyAdminAccess();
    if (!adminContext) {
      return {
        success: false,
        message: "Only administrators can update exams",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Verify exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id: examId, deletedAt: null },
    });

    if (!existingExam) {
      return {
        success: false,
        message: "Exam not found",
        code: "EXAM_NOT_FOUND",
      };
    }

    // STEP 3: Parse and validate data
    const passingScoreValue = formData.get("passing_score") as string;
    const maxAttemptsValue = formData.get("max_attempts") as string;
    const categoryValue = formData.get("category") as string;
    const startDateValue = formData.get("start_date") as string;
    const endDateValue = formData.get("end_date") as string;
    const descriptionValue = formData.get("description") as string;

    const data = {
      exam_type: formData.get("exam_type") as string,
      subject: formData.get("subject") as string,
      year: parseInt(formData.get("year") as string),
      title: formData.get("title") as string,
      description:
        descriptionValue && descriptionValue.trim()
          ? descriptionValue
          : undefined,
      duration: parseInt(formData.get("duration") as string),
      passing_score:
        passingScoreValue && passingScoreValue.trim()
          ? parseFloat(passingScoreValue)
          : null,
      max_attempts:
        maxAttemptsValue && maxAttemptsValue.trim()
          ? parseInt(maxAttemptsValue)
          : null,
      shuffle_questions: formData.get("shuffle_questions") === "true",
      randomize_options: formData.get("randomize_options") === "true",
      is_public: formData.get("is_public") === "true",
      is_free: formData.get("is_free") === "true",
      status: formData.get("status") as string,
      category:
        categoryValue && categoryValue.trim() ? categoryValue : undefined,
      start_date:
        startDateValue && startDateValue.trim() ? startDateValue : undefined,
      end_date: endDateValue && endDateValue.trim() ? endDateValue : undefined,
      question_ids: JSON.parse(
        formData.get("question_ids") as string
      ) as string[],
    };

    let validatedData;
    try {
      validatedData = validateExamUpload(data);
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: formatValidationErrors(error),
        };
      }
      throw error;
    }

    // STEP 4: Update in transaction
    const updatedExam = await prisma.$transaction(async (tx) => {
      const _exam = await tx.exam.update({
        where: { id: examId },
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
        },
      });

      await tx.examQuestion.deleteMany({
        where: { examId },
      });

      await tx.examQuestion.createMany({
        data: validatedData.question_ids.map((qid, index) => ({
          examId,
          questionId: qid,
          orderIndex: index,
        })),
      });

      return await tx.exam.findUnique({
        where: { id: examId },
        include: {
          questions: {
            include: {
              question: {
                include: {
                  options: true,
                },
              },
            },
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
      });
    });

    // STEP 5: Log audit entry
    await logAuditEntry(adminContext, "EXAM_UPDATE", {
      examId,
      questionCount: validatedData.question_ids.length,
    });

    return {
      success: true,
      message: "Exam updated successfully",
      data: {
        examId,
        exam: updatedExam!,
      },
    };
  } catch (error) {
    console.error("Exam update error:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// DELETE EXAM (SOFT DELETE)
// ============================================

/**
 * Soft delete an exam (admin only)
 *
 * @param examId - Exam ID to delete
 * @returns Delete result
 */
export async function deleteExam(examId: string): Promise<ExamDeleteResponse> {
  try {
    // STEP 1: Verify admin access
    const adminContext = await verifyAdminAccess();
    if (!adminContext) {
      return {
        success: false,
        message: "Only administrators can delete exams",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Soft delete
    await prisma.exam.update({
      where: { id: examId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // STEP 3: Log audit entry
    await logAuditEntry(adminContext, "EXAM_DELETE", {
      examId,
    });

    return {
      success: true,
      message: "Exam deleted successfully",
    };
  } catch (error) {
    console.error("Exam deletion error:", error);
    return {
      success: false,
      message: "Exam not found or already deleted",
      code: "EXAM_NOT_FOUND",
    };
  }
}

// ============================================
// SEARCH QUESTIONS
// ============================================

/**
 * Search questions for exam creation
 *
 * @param filters - Search filters
 * @returns Decrypted questions matching filters
 */
export async function searchQuestions(
  filters: Record<string, unknown>
): Promise<QuestionSearchResponse> {
  try {
    // STEP 1: Verify admin access
    const adminContext = await verifyAdminAccess();
    if (!adminContext) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    // STEP 2: Validate filters
    let validatedFilters;
    try {
      validatedFilters = validateQuestionSearch(filters);
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Invalid search parameters",
          code: "VALIDATION_ERROR",
        };
      }
      throw error;
    }

    // STEP 3: Build where clause
    const where: Record<string, unknown> = { deletedAt: null };
    if (validatedFilters.exam_type) where.examType = validatedFilters.exam_type;
    if (validatedFilters.year) where.year = validatedFilters.year;
    if (validatedFilters.subject) where.subject = validatedFilters.subject;
    if (validatedFilters.difficulty_level)
      where.difficultyLevel = validatedFilters.difficulty_level;

    // STEP 4: Query questions
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
          },
        },
        take: validatedFilters.limit,
        skip: validatedFilters.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.question.count({ where }),
    ]);

    // STEP 5: Decrypt questions
    const decryptedQuestions: QuestionDecrypted[] = questions
      .map((q) => {
        try {
          const decrypted = decryptQuestion(q);
          return {
            id: decrypted.id,
            examType: decrypted.examType,
            year: decrypted.year,
            subject: decrypted.subject,
            questionType: decrypted.questionType,
            questionText: decrypted.questionText,
            questionImage: decrypted.questionImage,
            questionPoint: decrypted.questionPoint,
            answerExplanation: decrypted.answerExplanation,
            difficultyLevel: decrypted.difficultyLevel,
            tags: Array.isArray(decrypted.tags)
              ? decrypted.tags
              : JSON.parse(decrypted.tags as string),
            timeLimit: decrypted.timeLimit,
            language: decrypted.language,
            createdBy: decrypted.createdBy,
            createdAt: decrypted.createdAt,
            updatedAt: decrypted.updatedAt,
            deletedAt: decrypted.deletedAt,
            options: decrypted.options.map((opt) => ({
              id: opt.id,
              questionId: opt.questionId,
              optionText: opt.optionText,
              optionImage: opt.optionImage,
              isCorrect: opt.isCorrect,
              orderIndex: opt.orderIndex,
            })),
          };
        } catch (error) {
          // Log decryption error but don't fail entire request
          console.error(`Failed to decrypt question ${q.id}:`, error);
          return null; // Return null for failed decryption
        }
      })
      .filter((q): q is QuestionDecrypted => q !== null); // Filter out null values

    return {
      success: true,
      data: {
        questions: decryptedQuestions,
        total,
        hasMore: validatedFilters.offset + validatedFilters.limit < total,
      },
    };
  } catch (error) {
    console.error("Question search error:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// LIST EXAMS
// ============================================

/**
 * List all exams with optional filters
 *
 * @param filters - Optional filters
 * @returns List of exams with stats
 */
export async function listExams(
  filters?: Record<string, unknown>
): Promise<ExamListResponse> {
  try {
    // STEP 1: Verify admin access
    const adminContext = await verifyAdminAccess();
    if (!adminContext) {
      return {
        success: false,
        message: "Only administrators can list exams",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Build where clause
    const where: Record<string, unknown> = { deletedAt: null };
    if (filters?.status) where.status = filters.status;
    if (filters?.exam_type) where.examType = filters.exam_type;

    // STEP 3: Query exams
    const exams = await prisma.exam.findMany({
      where,
      include: {
        questions: {
          include: {
            question: {
              select: {
                questionPoint: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // STEP 4: Add stats
    const examsWithStats: ExamWithStats[] = exams.map((exam) => ({
      ...exam,
      questionCount: exam.questions.length,
      totalPoints: exam.questions.reduce(
        (sum, q) => sum + q.question.questionPoint,
        0
      ),
    }));

    return {
      success: true,
      data: {
        exams: examsWithStats,
        total: examsWithStats.length,
        hasMore: false,
      },
    };
  } catch (error) {
    console.error("List exams error:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    };
  }
}
