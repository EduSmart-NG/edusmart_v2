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
import type {
  QuestionDecrypted,
  QuestionListQuery,
  QuestionListResponse,
  QuestionUploadResponse,
} from "@/types/question-api";
import { ZodError } from "zod";
import { hasPermission } from "@/lib/rbac/utils";
import { Prisma } from "@/generated/prisma";
import { decryptQuestion } from "../utils/question-decrypt";

// ============================================
// CONSTANTS
// ============================================

const RATE_LIMIT = {
  MAX_UPLOADS: 50,
  WINDOW_SECONDS: 3600,
} as const;

const LIST_RATE_LIMIT = {
  MAX_REQUESTS: 100,
  WINDOW_SECONDS: 60,
} as const;

// ============================================
// TYPES
// ============================================

interface UserContext {
  userId: string;
  userEmail: string;
  userRole: string;
  userName: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  retryAfter?: number;
}

interface ParsedFormData {
  questionData: unknown;
  questionImageFile: File | null;
  optionImageFiles: Map<number, File>;
}

interface FileUploadResult {
  questionImagePath: string | null;
  optionImagePaths: Map<number, string>;
  uploadedFiles: string[];
}

interface RateLimitData {
  uploads: number;
  firstUpload: string;
  windowExpires: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkAuthorizationAndSession(): Promise<UserContext> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      throw new Error(
        JSON.stringify({
          code: "NO_SESSION",
          message: "Authentication required. Please sign in.",
        })
      );
    }

    const canUpload = await hasPermission({ question: ["upload"] });

    if (!canUpload) {
      throw new Error(
        JSON.stringify({
          code: "FORBIDDEN",
          message: "You don't have permission to perform this operation.",
        })
      );
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

    if (!user) {
      throw new Error(
        JSON.stringify({
          code: "USER_NOT_FOUND",
          message: "User account not found.",
        })
      );
    }

    if (user.banned) {
      throw new Error(
        JSON.stringify({
          code: "USER_BANNED",
          message: "Your account has been banned.",
        })
      );
    }

    return {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role || "user",
      userName: user.name,
    };
  } catch (error) {
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

async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const key = `question_upload:${userId}`;
    const now = new Date();
    const data = await redis.get(key);

    let rateLimitData: RateLimitData;

    if (!data) {
      const windowExpires = new Date(
        now.getTime() + RATE_LIMIT.WINDOW_SECONDS * 1000
      );

      rateLimitData = {
        uploads: 1,
        firstUpload: now.toISOString(),
        windowExpires: windowExpires.toISOString(),
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

    rateLimitData = JSON.parse(data);
    const windowExpires = new Date(rateLimitData.windowExpires);

    if (now > windowExpires) {
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

    if (rateLimitData.uploads >= RATE_LIMIT.MAX_UPLOADS) {
      const retryAfter = Math.ceil(
        (windowExpires.getTime() - now.getTime()) / 1000
      );

      return {
        allowed: false,
        retryAfter: retryAfter > 0 ? retryAfter : RATE_LIMIT.WINDOW_SECONDS,
      };
    }

    rateLimitData.uploads += 1;

    const remainingTTL = Math.ceil(
      (windowExpires.getTime() - now.getTime()) / 1000
    );

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
    return { allowed: true };
  }
}

async function checkListRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const key = `question_list:${userId}`;
    const now = new Date();
    const data = await redis.get(key);

    let rateLimitData: RateLimitData;

    if (!data) {
      const windowExpires = new Date(
        now.getTime() + LIST_RATE_LIMIT.WINDOW_SECONDS * 1000
      );

      rateLimitData = {
        uploads: 1,
        firstUpload: now.toISOString(),
        windowExpires: windowExpires.toISOString(),
      };

      await redis.set(
        key,
        JSON.stringify(rateLimitData),
        LIST_RATE_LIMIT.WINDOW_SECONDS
      );

      return {
        allowed: true,
        remaining: LIST_RATE_LIMIT.MAX_REQUESTS - 1,
      };
    }

    rateLimitData = JSON.parse(data);
    const windowExpires = new Date(rateLimitData.windowExpires);

    if (now > windowExpires) {
      const newWindowExpires = new Date(
        now.getTime() + LIST_RATE_LIMIT.WINDOW_SECONDS * 1000
      );

      rateLimitData = {
        uploads: 1,
        firstUpload: now.toISOString(),
        windowExpires: newWindowExpires.toISOString(),
      };

      await redis.set(
        key,
        JSON.stringify(rateLimitData),
        LIST_RATE_LIMIT.WINDOW_SECONDS
      );

      return {
        allowed: true,
        remaining: LIST_RATE_LIMIT.MAX_REQUESTS - 1,
      };
    }

    if (rateLimitData.uploads >= LIST_RATE_LIMIT.MAX_REQUESTS) {
      const retryAfter = Math.ceil(
        (windowExpires.getTime() - now.getTime()) / 1000
      );

      return {
        allowed: false,
        retryAfter:
          retryAfter > 0 ? retryAfter : LIST_RATE_LIMIT.WINDOW_SECONDS,
      };
    }

    rateLimitData.uploads += 1;

    const remainingTTL = Math.ceil(
      (windowExpires.getTime() - now.getTime()) / 1000
    );

    await redis.set(
      key,
      JSON.stringify(rateLimitData),
      remainingTTL > 0 ? remainingTTL : LIST_RATE_LIMIT.WINDOW_SECONDS
    );

    return {
      allowed: true,
      remaining: LIST_RATE_LIMIT.MAX_REQUESTS - rateLimitData.uploads,
    };
  } catch (error) {
    console.error("List rate limit check failed:", error);
    return { allowed: true };
  }
}

async function parseFormData(formData: FormData): Promise<ParsedFormData> {
  try {
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

    let questionImageFile: File | null = null;
    const questionImage = formData.get("question_image");

    if (
      questionImage &&
      questionImage instanceof File &&
      questionImage.size > 0
    ) {
      questionImageFile = questionImage;
    }

    const optionImageFiles = new Map<number, File>();

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
    if (questionImageFile) {
      const validation = await validateImageFile(questionImageFile);
      if (!validation.valid) {
        throw new Error(
          `Invalid question image: ${validation.error || "Unknown error"}`
        );
      }

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

    for (const [orderIndex, optionImageFile] of optionImageFiles.entries()) {
      const validation = await validateImageFile(optionImageFile);
      if (!validation.valid) {
        throw new Error(
          `Invalid option image at index ${orderIndex}: ${validation.error || "Unknown error"}`
        );
      }

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
    if (uploadedFiles.length > 0) {
      await deleteFiles(uploadedFiles);
    }
    throw error;
  }
}

async function saveQuestionToDatabase(
  validatedData: ReturnType<typeof validateQuestionUpload>,
  questionImagePath: string | null,
  optionImagePaths: Map<number, string>,
  userId: string
) {
  try {
    const { encrypt } = await import("@/lib/utils/encryption");

    const encryptedQuestionText = encrypt(validatedData.question_text);

    const encryptedExplanation = validatedData.answer_explanation
      ? encrypt(validatedData.answer_explanation)
      : null;

    const encryptedOptions = validatedData.options.map((opt) => {
      const encryptedText = encrypt(opt.option_text);
      return {
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

    const question = await prisma.question.create({
      data: {
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
        questionText: JSON.stringify({
          ciphertext: encryptedQuestionText.ciphertext,
          iv: encryptedQuestionText.iv,
          tag: encryptedQuestionText.tag,
          salt: encryptedQuestionText.salt,
        }),
        answerExplanation: encryptedExplanation
          ? JSON.stringify({
              ciphertext: encryptedExplanation.ciphertext,
              iv: encryptedExplanation.iv,
              tag: encryptedExplanation.tag,
              salt: encryptedExplanation.salt,
            })
          : null,
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
      userRole: context.userRole,
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

    console.log("[AUDIT] Question Upload:", JSON.stringify(auditLog, null, 2));
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

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

    const rateLimitResult = await checkRateLimit(userContext.userId);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

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

    examType = validatedData.exam_type;
    year = validatedData.year;
    subject = validatedData.subject;
    hasQuestionImage = parsedData.questionImageFile !== null;
    optionImagesCount = parsedData.optionImageFiles.size;

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

    let createdQuestion;
    try {
      createdQuestion = await saveQuestionToDatabase(
        validatedData,
        fileUploadResult.questionImagePath,
        fileUploadResult.optionImagePaths,
        userContext.userId
      );
    } catch (_error) {
      if (uploadedFiles.length > 0) {
        await deleteFiles(uploadedFiles);
      }

      return {
        success: false,
        message: "Failed to save question to database",
        code: "DATABASE_ERROR",
      };
    }

    await logQuestionUpload(
      userContext,
      createdQuestion.id,
      examType,
      year,
      subject,
      hasQuestionImage,
      optionImagesCount,
      true
    );

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

    if (uploadedFiles.length > 0) {
      await deleteFiles(uploadedFiles);
    }

    if (userContext) {
      await logQuestionUpload(
        userContext,
        null,
        examType,
        year,
        subject,
        hasQuestionImage,
        optionImagesCount,
        false,
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

export async function listQuestions(
  query?: QuestionListQuery & { search?: string }
): Promise<QuestionListResponse> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const canView = await hasPermission({ question: ["view"] });

    if (!canView) {
      return {
        success: false,
        message: "You don't have permission to view questions",
        code: "FORBIDDEN",
      };
    }

    const rateLimitResult = await checkListRateLimit(session.user.id);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
    };

    if (query?.exam_type) {
      where.examType = query.exam_type;
    }
    if (query?.subject) {
      where.subject = query.subject;
    }
    if (query?.year) {
      where.year = query.year;
    }
    if (query?.difficulty_level) {
      where.difficultyLevel = query.difficulty_level;
    }
    if (query?.question_type) {
      where.questionType = query.question_type;
    }

    if (query?.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        {
          examType: {
            contains: searchTerm,
          },
        },
        {
          subject: {
            contains: searchTerm,
          },
        },
        {
          difficultyLevel: {
            contains: searchTerm,
          },
        },
        ...(isNaN(Number(searchTerm))
          ? []
          : [
              {
                year: Number(searchTerm),
              },
            ]),
      ];
    }

    const sortBy = query?.sortBy || "createdAt";
    const sortOrder = (query?.sortOrder || "desc") as Prisma.SortOrder;
    const orderBy: Prisma.QuestionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const limit = query?.limit || 20;
    const offset = query?.offset || 0;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.question.count({ where }),
    ]);

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
          console.error(`Failed to decrypt question ${q.id}:`, error);
          return null;
        }
      })
      .filter((q): q is QuestionDecrypted => q !== null);

    console.log(
      `[AUDIT] User ${session.user.email} listed questions:`,
      JSON.stringify({
        total,
        filters: query || {},
        limit,
        offset,
      })
    );

    return {
      success: true,
      data: {
        questions: decryptedQuestions,
        total,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    console.error("List questions error:", error);

    return {
      success: false,
      message: "Failed to list questions",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getQuestionById(questionId: string): Promise<{
  success: boolean;
  message: string;
  code?: string;
  data?: {
    question: {
      id: string;
      examType: string;
      year: number;
      subject: string;
      questionType: string;
      questionText: string;
      questionImage: string | null;
      questionPoint: number;
      answerExplanation: string | null;
      difficultyLevel: string;
      tags: string[];
      timeLimit: number | null;
      language: string;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      options: {
        id: string;
        questionId: string;
        optionText: string;
        optionImage: string | null;
        isCorrect: boolean;
        orderIndex: number;
      }[];
    };
  };
}> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const canView = await hasPermission({ question: ["view", "edit"] });

    if (!canView) {
      return {
        success: false,
        message: "You don't have permission to view this question",
        code: "FORBIDDEN",
      };
    }

    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
        deletedAt: null,
      },
      include: {
        options: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!question) {
      return {
        success: false,
        message: "Question not found",
        code: "QUESTION_NOT_FOUND",
      };
    }

    let decrypted;
    try {
      decrypted = decryptQuestion(question);
    } catch (error) {
      console.error(`Failed to decrypt question ${questionId}:`, error);
      return {
        success: false,
        message: "Failed to decrypt question data",
        code: "DECRYPTION_ERROR",
      };
    }

    const questionData = {
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

    console.log(
      `[AUDIT] User ${session.user.email} viewed question:`,
      JSON.stringify({
        questionId: question.id,
        examType: question.examType,
        subject: question.subject,
        year: question.year,
      })
    );

    return {
      success: true,
      message: "Question retrieved successfully",
      data: { question: questionData },
    };
  } catch (error) {
    console.error("Get question by ID error:", error);
    return {
      success: false,
      message: "Failed to retrieve question",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function updateQuestion(
  questionId: string,
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
    try {
      const headersList = await headers();
      const session = await auth.api.getSession({
        headers: headersList,
      });

      if (!session) {
        return {
          success: false,
          message: "Authentication required. Please sign in.",
          code: "NO_SESSION",
        };
      }

      const canEdit = await hasPermission({ question: ["edit"] });

      if (!canEdit) {
        return {
          success: false,
          message: "You don't have permission to edit questions.",
          code: "FORBIDDEN",
        };
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

      if (!user) {
        return {
          success: false,
          message: "User account not found.",
          code: "USER_NOT_FOUND",
        };
      }

      if (user.banned) {
        return {
          success: false,
          message: "Your account has been banned.",
          code: "USER_BANNED",
        };
      }

      userContext = {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role || "user",
        userName: user.name,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("{")) {
        const { message } = JSON.parse(error.message);
        return {
          success: false,
          message,
          code: "AUTH_ERROR",
        };
      }
      return {
        success: false,
        message: "Authentication failed",
        code: "AUTH_ERROR",
      };
    }

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId, deletedAt: null },
      include: { options: true },
    });

    if (!existingQuestion) {
      return {
        success: false,
        message: "Question not found",
        code: "QUESTION_NOT_FOUND",
      };
    }

    const rateLimitResult = await checkRateLimit(userContext.userId);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

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

    examType = validatedData.exam_type;
    year = validatedData.year;
    subject = validatedData.subject;
    hasQuestionImage = parsedData.questionImageFile !== null;
    optionImagesCount = parsedData.optionImageFiles.size;

    let fileUploadResult: FileUploadResult = {
      questionImagePath: existingQuestion.questionImage,
      optionImagePaths: new Map(),
      uploadedFiles: [],
    };

    const existingOptionImages = new Map<number, string>();
    existingQuestion.options.forEach((opt) => {
      if (opt.optionImage) {
        existingOptionImages.set(opt.orderIndex, opt.optionImage);
      }
    });

    try {
      if (
        parsedData.questionImageFile ||
        parsedData.optionImageFiles.size > 0
      ) {
        fileUploadResult = await processFileUploads(
          parsedData.questionImageFile,
          parsedData.optionImageFiles,
          validatedData.exam_type,
          validatedData.year,
          validatedData.subject
        );
        uploadedFiles.push(...fileUploadResult.uploadedFiles);

        existingQuestion.options.forEach((opt) => {
          if (
            opt.optionImage &&
            !fileUploadResult.optionImagePaths.has(opt.orderIndex)
          ) {
            fileUploadResult.optionImagePaths.set(
              opt.orderIndex,
              opt.optionImage
            );
          }
        });
      } else {
        fileUploadResult.optionImagePaths = existingOptionImages;
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "File upload failed",
        code: "UPLOAD_FAILED",
      };
    }

    let updatedQuestion;
    try {
      updatedQuestion = await prisma.$transaction(async (tx) => {
        const { encrypt } = await import("@/lib/utils/encryption");

        const encryptedQuestionText = encrypt(validatedData.question_text);
        const encryptedExplanation = validatedData.answer_explanation
          ? encrypt(validatedData.answer_explanation)
          : null;

        const encryptedOptions = validatedData.options.map((opt) => {
          const encryptedText = encrypt(opt.option_text);
          return {
            optionText: JSON.stringify({
              ciphertext: encryptedText.ciphertext,
              iv: encryptedText.iv,
              tag: encryptedText.tag,
              salt: encryptedText.salt,
            }),
            optionImage:
              fileUploadResult.optionImagePaths.get(opt.order_index) || null,
            isCorrect: opt.is_correct,
            orderIndex: opt.order_index,
          };
        });

        const _updated = await tx.question.update({
          where: { id: questionId },
          data: {
            examType: validatedData.exam_type,
            year: validatedData.year,
            subject: validatedData.subject,
            questionType: validatedData.question_type,
            questionImage:
              fileUploadResult.questionImagePath ||
              existingQuestion.questionImage,
            questionPoint: validatedData.question_point,
            difficultyLevel: validatedData.difficulty_level,
            tags: validatedData.tags,
            timeLimit: validatedData.time_limit || null,
            language: validatedData.language,
            questionText: JSON.stringify({
              ciphertext: encryptedQuestionText.ciphertext,
              iv: encryptedQuestionText.iv,
              tag: encryptedQuestionText.tag,
              salt: encryptedQuestionText.salt,
            }),
            answerExplanation: encryptedExplanation
              ? JSON.stringify({
                  ciphertext: encryptedExplanation.ciphertext,
                  iv: encryptedExplanation.iv,
                  tag: encryptedExplanation.tag,
                  salt: encryptedExplanation.salt,
                })
              : null,
          },
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
            },
          },
        });

        await tx.questionOption.deleteMany({
          where: { questionId },
        });

        await tx.questionOption.createMany({
          data: encryptedOptions.map((opt) => ({
            questionId,
            ...opt,
          })),
        });

        return await tx.question.findUnique({
          where: { id: questionId },
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
            },
          },
        });
      });
    } catch (error) {
      console.error("Database update failed:", error);

      if (uploadedFiles.length > 0) {
        await deleteFiles(uploadedFiles);
      }

      return {
        success: false,
        message: "Failed to update question in database",
        code: "DATABASE_ERROR",
      };
    }

    await logQuestionUpload(
      userContext,
      updatedQuestion!.id,
      examType,
      year,
      subject,
      hasQuestionImage,
      optionImagesCount,
      true,
      undefined
    );

    return {
      success: true,
      message: "Question updated successfully",
      data: {
        questionId: updatedQuestion!.id,
        question: updatedQuestion!,
      },
    };
  } catch (error) {
    console.error("Unexpected error in updateQuestion:", error);

    if (uploadedFiles.length > 0) {
      await deleteFiles(uploadedFiles);
    }

    if (userContext) {
      await logQuestionUpload(
        userContext,
        null,
        examType,
        year,
        subject,
        hasQuestionImage,
        optionImagesCount,
        false,
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
