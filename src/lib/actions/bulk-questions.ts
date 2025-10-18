/**
 * Question Bulk Import/Export Server Actions
 *
 * UPDATED WITH RBAC PERMISSIONS
 *
 * Secure server actions for bulk operations with:
 * - Session validation via Better Auth
 * - Permission-based access control (RBAC)
 * - Rate limiting per operation type
 * - Progress tracking
 * - Comprehensive error handling
 *
 * @module lib/actions/question-bulk
 */

"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { headers as getHeaders } from "next/headers";
import { hasPermission } from "@/lib/rbac/utils";
import { Prisma } from "@/generated/prisma";
import {
  validateBulkImportRequest,
  validateBulkExportQuery,
  validateTemplateRequest,
} from "@/lib/validations/bulk-questions";
import { excelHandler } from "@/lib/bulk/bulk-formats/excel";
import { csvHandler } from "@/lib/bulk/bulk-formats/csv";
import { jsonHandler } from "@/lib/bulk/bulk-formats/json";
import { processBulkData, exportBulkData } from "@/lib/bulk/bulk-processor";
import {
  mapRowToQuestion,
  transformToEncrypted,
  mapQuestionToRow,
  getQuestionHeaders,
  getQuestionDescriptions,
} from "@/lib/bulk/bulk-questions";
import type {
  BulkImportResponse,
  BulkExportResponse,
  TemplateResponse,
  BulkExportQuery,
  QuestionBulkRow,
} from "@/types/question-api";
import { ZodError } from "zod";

// ============================================
// CONSTANTS
// ============================================

const RATE_LIMITS = {
  IMPORT: { MAX: 10, WINDOW: 3600 }, // 10 imports per hour
  EXPORT: { MAX: 20, WINDOW: 3600 }, // 20 exports per hour
  TEMPLATE: { MAX: 50, WINDOW: 3600 }, // 50 templates per hour
} as const;

const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ROWS: 1000, // Maximum rows per import
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

interface UserContext {
  userId: string;
  userEmail: string;
  userName: string;
}

async function checkAuth(
  requiredPermission: "import" | "export"
): Promise<UserContext> {
  const headersList = await getHeaders();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    throw new Error(
      JSON.stringify({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      })
    );
  }

  // Check permission
  const permission =
    requiredPermission === "import"
      ? { question: ["import" as const] }
      : { question: ["export" as const] };

  const hasAccess = await hasPermission(permission);

  if (!hasAccess) {
    throw new Error(
      JSON.stringify({
        code: "FORBIDDEN",
        message: `You don't have permission to ${requiredPermission} questions`,
      })
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, banned: true },
  });

  if (!user || user.banned) {
    throw new Error(
      JSON.stringify({
        code: "FORBIDDEN",
        message: "Account is not accessible",
      })
    );
  }

  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
  };
}

async function checkRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMITS[operation];
  const key = `question_bulk_${operation.toLowerCase()}:${userId}`;

  try {
    const data = await redis.get(key);
    const now = new Date();

    if (!data) {
      await redis.set(
        key,
        JSON.stringify({
          count: 1,
          windowExpires: new Date(now.getTime() + config.WINDOW * 1000),
        }),
        config.WINDOW
      );
      return { allowed: true };
    }

    const { count, windowExpires } = JSON.parse(data);
    const expiresAt = new Date(windowExpires);

    if (now > expiresAt) {
      await redis.set(
        key,
        JSON.stringify({
          count: 1,
          windowExpires: new Date(now.getTime() + config.WINDOW * 1000),
        }),
        config.WINDOW
      );
      return { allowed: true };
    }

    if (count >= config.MAX) {
      return {
        allowed: false,
        retryAfter: Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
      };
    }

    const newCount = count + 1;
    const remainingTTL = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / 1000
    );

    await redis.set(
      key,
      JSON.stringify({ count: newCount, windowExpires }),
      remainingTTL > 0 ? remainingTTL : config.WINDOW
    );

    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true };
  }
}

// ============================================
// BULK IMPORT ACTION
// ============================================

export async function bulkImportQuestions(
  formData: FormData
): Promise<BulkImportResponse> {
  try {
    // Check authentication and permissions
    const userContext = await checkAuth("import");

    // Check rate limit
    const rateLimit = await checkRateLimit(userContext.userId, "IMPORT");
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Parse request
    const format = formData.get("format");
    const validateOnly = formData.get("validateOnly") === "true";
    const file = formData.get("file") as File | null;

    if (!file) {
      return {
        success: false,
        message: "No file provided",
        code: "INVALID_REQUEST",
      };
    }

    // Validate file size
    if (file.size > FILE_LIMITS.MAX_SIZE) {
      return {
        success: false,
        message: `File size exceeds ${FILE_LIMITS.MAX_SIZE / 1024 / 1024}MB limit`,
        code: "FILE_TOO_LARGE",
      };
    }

    // Validate request
    let validatedRequest;
    try {
      validatedRequest = validateBulkImportRequest({ format, validateOnly });
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Invalid request parameters",
          code: "VALIDATION_ERROR",
        };
      }
      throw error;
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Select format handler
    const handler =
      validatedRequest.format === "excel"
        ? excelHandler
        : validatedRequest.format === "csv"
          ? csvHandler
          : jsonHandler;

    // Parse file
    const parseResult = await handler.parse(buffer);

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return {
        success: false,
        message: "Failed to parse file",
        code: "PARSE_ERROR",
        data: {
          importedCount: 0,
          failedCount: 0,
          totalRows: 0,
          errors: parseResult.errors,
        },
      };
    }

    // Check row limit
    if (parseResult.rowCount > FILE_LIMITS.MAX_ROWS) {
      return {
        success: false,
        message: `File contains ${parseResult.rowCount} rows. Maximum is ${FILE_LIMITS.MAX_ROWS}`,
        code: "TOO_MANY_ROWS",
      };
    }

    // Process bulk data
    const result = await processBulkData<QuestionBulkRow, unknown>(
      parseResult.data as QuestionBulkRow[],
      {
        validate: async (row, index) => {
          const validation = await mapRowToQuestion(row, index);
          return {
            valid: validation.valid,
            errors: validation.errors,
          };
        },

        transform: async (row, index) => {
          const validation = await mapRowToQuestion(row, index);
          if (!validation.valid || !validation.data) {
            throw new Error("Validation failed");
          }
          return transformToEncrypted(validation.data, userContext.userId);
        },

        save: async (batch) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const created = await prisma.$transaction(
            batch.map((item: any) =>
              prisma.question.create({
                data: {
                  ...item,
                  options: {
                    create: item.options,
                  },
                },
              })
            )
          );

          return {
            count: created.length,
            ids: created.map((q) => q.id),
          };
        },
      },
      {
        batchSize: 50,
        validateOnly: validatedRequest.validateOnly,
      }
    );

    // Audit log
    console.log("[AUDIT] Bulk Import:", {
      userId: userContext.userId,
      userEmail: userContext.userEmail,
      format: validatedRequest.format,
      totalRows: parseResult.rowCount,
      imported: result.processedCount,
      failed: result.failedCount,
      validateOnly: validatedRequest.validateOnly,
    });

    return {
      success: true,
      message: validateOnly
        ? `Validation complete: ${result.processedCount} valid, ${result.failedCount} invalid`
        : `Import complete: ${result.processedCount} imported, ${result.failedCount} failed`,
      data: {
        importedCount: result.processedCount,
        failedCount: result.failedCount,
        totalRows: parseResult.rowCount,
        errors: result.errors.slice(0, 100), // Limit error list
      },
    };
  } catch (error) {
    console.error("Bulk import error:", error);

    if (error instanceof Error && error.message.startsWith("{")) {
      const { code, message } = JSON.parse(error.message);
      return { success: false, message, code };
    }

    return {
      success: false,
      message: "Import failed",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// BULK EXPORT ACTION
// ============================================

export async function bulkExportQuestions(
  query: BulkExportQuery
): Promise<BulkExportResponse> {
  try {
    // Check authentication and permissions
    const userContext = await checkAuth("export");

    // Check rate limit
    const rateLimit = await checkRateLimit(userContext.userId, "EXPORT");
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Validate query
    let validatedQuery;
    try {
      validatedQuery = validateBulkExportQuery(query);
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Invalid query parameters",
          code: "VALIDATION_ERROR",
        };
      }
      throw error;
    }

    // Build where clause
    const where: Prisma.QuestionWhereInput = {
      deletedAt: validatedQuery.includeDeleted ? undefined : null,
    };

    if (validatedQuery.examType) where.examType = validatedQuery.examType;
    if (validatedQuery.subject) where.subject = validatedQuery.subject;
    if (validatedQuery.year) where.year = validatedQuery.year;
    if (validatedQuery.difficultyLevel)
      where.difficultyLevel = validatedQuery.difficultyLevel;
    if (validatedQuery.questionType)
      where.questionType = validatedQuery.questionType;

    // Export data with decryption
    const exportResult = await exportBulkData(
      async () =>
        prisma.question.findMany({
          where,
          include: { options: { orderBy: { orderIndex: "asc" } } },
          take: validatedQuery.limit,
          orderBy: { createdAt: "desc" },
        }),
      async (question) => mapQuestionToRow(question),
      {}
    );

    if (exportResult.data.length === 0) {
      return {
        success: false,
        message: "No questions found matching criteria",
        code: "NO_DATA",
      };
    }

    // Select format handler
    const handler =
      validatedQuery.format === "excel"
        ? excelHandler
        : validatedQuery.format === "csv"
          ? csvHandler
          : jsonHandler;

    // Generate export file
    const headers = getQuestionHeaders();
    const fileResult = await handler.export(
      exportResult.data as unknown as Record<string, unknown>[],
      headers,
      {
        styled: true,
      }
    );

    // Audit log
    console.log("[AUDIT] Bulk Export:", {
      userId: userContext.userId,
      userEmail: userContext.userEmail,
      format: validatedQuery.format,
      filters: query,
      exported: exportResult.data.length,
    });

    return {
      success: true,
      message: `Exported ${exportResult.data.length} questions`,
      data: {
        buffer: fileResult.buffer,
        filename: fileResult.filename,
        mimeType: fileResult.mimeType,
        size: fileResult.size,
        exportedCount: exportResult.data.length,
      },
    };
  } catch (error) {
    console.error("Bulk export error:", error);

    if (error instanceof Error && error.message.startsWith("{")) {
      const { code, message } = JSON.parse(error.message);
      return { success: false, message, code };
    }

    return {
      success: false,
      message: "Export failed",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// DOWNLOAD TEMPLATE ACTION
// ============================================

export async function downloadTemplate(
  format: "excel" | "csv" | "json"
): Promise<TemplateResponse> {
  try {
    // Check authentication
    const headersList = await getHeaders();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(session.user.id, "TEMPLATE");
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Validate request
    let validatedRequest;
    try {
      validatedRequest = validateTemplateRequest({
        format,
        includeSamples: true,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Invalid format",
          code: "VALIDATION_ERROR",
        };
      }
      throw error;
    }

    // Select format handler
    const handler =
      validatedRequest.format === "excel"
        ? excelHandler
        : validatedRequest.format === "csv"
          ? csvHandler
          : jsonHandler;

    // Generate template
    const headers = getQuestionHeaders();
    const descriptions = getQuestionDescriptions();

    const templateResult = await handler.generateTemplate(headers, {
      includeSamples: true,
      sampleCount: 3,
      descriptions,
    });

    // Audit log
    console.log("[AUDIT] Template Download:", {
      userId: session.user.id,
      userEmail: session.user.email,
      format: validatedRequest.format,
    });

    return {
      success: true,
      message: "Template generated successfully",
      data: {
        buffer: templateResult.buffer,
        filename: templateResult.filename,
        mimeType: templateResult.mimeType,
        size: templateResult.size,
      },
    };
  } catch (error) {
    console.error("Template download error:", error);

    return {
      success: false,
      message: "Failed to generate template",
      code: "INTERNAL_ERROR",
    };
  }
}
