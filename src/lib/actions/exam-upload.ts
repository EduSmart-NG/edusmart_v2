/**
 * Exam Upload Server Actions
 *
 * Secure server actions for exam CRUD operations.
 * Handles authentication, authorization, validation, and database transactions.
 *
 * Security Features:
 * - Session validation via Better Auth
 * - Admin-only access control
 * - Rate limiting (10 creates/5 minutes per admin, 100 list/minute)
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
import { generateSlugFromTitle } from "../utils/exam-detail-slug";
import type {
  ExamUploadResponse,
  ExamDeleteResponse,
  QuestionSearchResponse,
  QuestionDecrypted,
} from "@/types/exam-api";
import type {
  AdminActionResult,
  ExamListQuery,
  ExamListResponse,
  AdminExam,
  ExamStats,
} from "@/types/admin";
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
// LIST EXAMS (ENHANCED FOR ADMIN LISTING PAGE)
// ============================================

/**
 * List exams with filtering, searching, and pagination
 *
 * ✅ SECURED: RBAC + Rate limiting (100 requests per minute)
 * ✅ Audit: Logs admin viewing exam list
 *
 * @param query - Optional filtering and pagination parameters
 * @returns Exam list with metadata
 */
export async function listExams(
  query?: ExamListQuery & { search?: string }
): Promise<AdminActionResult<ExamListResponse>> {
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

    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // STEP 2: Check rate limit (100 requests per minute)
    const rateLimitResult = await checkRateLimit(
      "admin:list-exams",
      {
        max: 100,
        windowSeconds: 60,
      },
      session!.user.id
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Retry in ${rateLimitResult.retryAfter}s`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // STEP 3: Build WHERE clause with filters and search
    interface WhereClause {
      deletedAt: null;
      status?: string;
      examType?: string;
      subject?: string;
      year?: number;
      OR?: Array<{
        title?: { contains: string };
        subject?: { contains: string };
        examType?: { contains: string };
        year?: number;
      }>;
    }

    const where: WhereClause = {
      deletedAt: null, // CRITICAL: Only show non-deleted exams
    };

    // Apply filters from query
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.exam_type) {
      where.examType = query.exam_type;
    }
    if (query?.subject) {
      where.subject = query.subject;
    }
    if (query?.year) {
      where.year = query.year;
    }

    // Apply search (searches across title, subject, examType, year)
    // Note: MySQL is case-insensitive by default
    if (query?.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        {
          title: {
            contains: searchTerm,
          },
        },
        {
          subject: {
            contains: searchTerm,
          },
        },
        {
          examType: {
            contains: searchTerm,
          },
        },
        // Search by year if it's a number
        ...(isNaN(Number(searchTerm))
          ? []
          : [
              {
                year: Number(searchTerm),
              },
            ]),
      ];
    }

    // STEP 4: Build ORDER BY clause
    const sortBy = query?.sortBy || "createdAt";
    const sortOrder = query?.sortOrder || "desc";
    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    // STEP 5: Calculate pagination
    const limit = query?.limit || 20; // Default 20 exams per page
    const offset = query?.offset || 0;

    // STEP 6: Query exams with stats
    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
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
        orderBy,
        take: limit,
        skip: offset,
      }),
      // Get total count for pagination
      prisma.exam.count({ where }),
    ]);

    // STEP 7: Add computed fields and stats
    const examsWithStats: AdminExam[] = await Promise.all(
      exams.map(async (exam) => {
        // Get creator name
        const creator = await prisma.user.findUnique({
          where: { id: exam.createdBy },
          select: { name: true },
        });

        // Calculate stats
        const questionCount = exam.questions.length;
        const totalPoints = exam.questions.reduce(
          (sum, q) => sum + q.question.questionPoint,
          0
        );

        // Check if exam is currently active
        const now = new Date();
        const isActive =
          exam.status === "published" &&
          (!exam.endDate || exam.endDate > now) &&
          (!exam.startDate || exam.startDate <= now);

        return {
          ...exam,
          questionCount,
          totalPoints,
          creatorName: creator?.name || "Unknown",
          isActive,
        };
      })
    );

    // STEP 8: Audit log
    await logAuditEntry(adminContext, "LIST_EXAMS", {
      totalExams: total,
      filters: query || {},
      limit,
      offset,
    });

    // STEP 9: Return response
    return {
      success: true,
      message: "Exams retrieved successfully",
      data: {
        exams: examsWithStats,
        total,
        limit,
        offset,
      },
    };
  } catch (error) {
    console.error("List exams error:", error);

    return {
      success: false,
      message: "Failed to list exams",
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// GET EXAM STATISTICS
// ============================================

/**
 * Get exam statistics for admin dashboard
 *
 * ✅ SECURED: Admin-only access
 *
 * @returns Exam statistics
 */
export async function getExamStats(): Promise<AdminActionResult<ExamStats>> {
  try {
    // Verify admin access
    const adminContext = await verifyAdminAccess();
    if (!adminContext) {
      return {
        success: false,
        message: "Admin access required",
        code: "FORBIDDEN",
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Query all stats in parallel
    const [
      totalExams,
      publishedExams,
      draftExams,
      archivedExams,
      totalQuestions,
      examsCreatedToday,
      examsCreatedThisWeek,
      examsCreatedThisMonth,
    ] = await Promise.all([
      prisma.exam.count({ where: { deletedAt: null } }),
      prisma.exam.count({
        where: { deletedAt: null, status: "published" },
      }),
      prisma.exam.count({ where: { deletedAt: null, status: "draft" } }),
      prisma.exam.count({ where: { deletedAt: null, status: "archived" } }),
      prisma.examQuestion.count({
        where: { exam: { deletedAt: null } },
      }),
      prisma.exam.count({
        where: { deletedAt: null, createdAt: { gte: today } },
      }),
      prisma.exam.count({
        where: { deletedAt: null, createdAt: { gte: weekAgo } },
      }),
      prisma.exam.count({
        where: { deletedAt: null, createdAt: { gte: monthAgo } },
      }),
    ]);

    const avgQuestionsPerExam =
      totalExams > 0 ? totalQuestions / totalExams : 0;

    return {
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        totalExams,
        publishedExams,
        draftExams,
        archivedExams,
        totalQuestions,
        avgQuestionsPerExam: Math.round(avgQuestionsPerExam * 10) / 10,
        examsCreatedToday,
        examsCreatedThisWeek,
        examsCreatedThisMonth,
      },
    };
  } catch (error) {
    console.error("Get exam stats error:", error);
    return {
      success: false,
      message: "Failed to retrieve statistics",
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// GET EXAM BY SLUG (FOR EDITING)
// ============================================

/**
 * Get exam by slug for editing (admin only)
 *
 * Fetches complete exam details including decrypted questions.
 * The slug is generated from the exam title for SEO-friendly URLs.
 *
 * ✅ SECURED: Admin-only access
 * ✅ Audit: Logs admin viewing exam details
 *
 * @param slug - URL-safe slug generated from exam title (e.g., "waec-mathematics-2024")
 * @returns Exam data with decrypted questions or error
 */
export async function getExamBySlug(slug: string): Promise<
  AdminActionResult<{
    exam: {
      id: string;
      examType: string;
      subject: string;
      year: number;
      title: string;
      description: string | null;
      duration: number;
      passingScore: number | null;
      maxAttempts: number | null;
      shuffleQuestions: boolean;
      randomizeOptions: boolean;
      isPublic: boolean;
      isFree: boolean;
      status: string;
      category: string | null;
      startDate: Date | null;
      endDate: Date | null;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
      questions: QuestionDecrypted[];
    };
  }>
> {
  try {
    // STEP 1: Verify admin access
    const adminContext = await verifyAdminAccess();
    if (!adminContext) {
      return {
        success: false,
        message: "Admin access required",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Fetch all non-deleted exams
    // We need to fetch all exams to match slugs since slugs are generated on-the-fly
    const exams = await prisma.exam.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    // STEP 3: Find matching exam by comparing slugified titles
    // MySQL is case-insensitive by default, so slug matching will be case-insensitive
    const exam = exams.find((e) => generateSlugFromTitle(e.title) === slug);

    if (!exam) {
      return {
        success: false,
        message: "Exam not found",
        code: "EXAM_NOT_FOUND",
      };
    }

    // STEP 4: Decrypt questions
    const decryptedQuestions: QuestionDecrypted[] = exam.questions
      .map((eq) => {
        try {
          const decrypted = decryptQuestion(eq.question);
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
          console.error(`Failed to decrypt question ${eq.question.id}:`, error);
          return null;
        }
      })
      .filter((q): q is QuestionDecrypted => q !== null);

    // STEP 5: Prepare response data
    const examData = {
      id: exam.id,
      examType: exam.examType,
      subject: exam.subject,
      year: exam.year,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      passingScore: exam.passingScore,
      maxAttempts: exam.maxAttempts,
      shuffleQuestions: exam.shuffleQuestions,
      randomizeOptions: exam.randomizeOptions,
      isPublic: exam.isPublic,
      isFree: exam.isFree,
      status: exam.status,
      category: exam.category,
      startDate: exam.startDate,
      endDate: exam.endDate,
      createdBy: exam.createdBy,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      questions: decryptedQuestions,
    };

    // STEP 6: Audit log
    await logAuditEntry(adminContext, "VIEW_EXAM", {
      examId: exam.id,
      examTitle: exam.title,
      slug,
    });

    return {
      success: true,
      message: "Exam retrieved successfully",
      data: { exam: examData },
    };
  } catch (error) {
    console.error("Get exam by slug error:", error);
    return {
      success: false,
      message: "Failed to retrieve exam",
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR",
    };
  }
}
