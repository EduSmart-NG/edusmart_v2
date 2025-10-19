/**
 * Question Bulk Operations Better Auth Plugin
 *
 * FIXED: Questions now save WITH their answer options
 * UPDATED WITH RBAC PERMISSIONS
 *
 * Better Auth plugin for bulk question operations with dual authentication:
 * 1. Session cookie (Better Auth session)
 * 2. API key (custom header validation)
 *
 * Features:
 * - Permission-based access (import/export permissions required)
 * - Rate limiting per operation type
 * - Multi-format support (Excel, CSV, JSON)
 * - Progress tracking
 * - Comprehensive error handling
 * - Type-safe batch operations (NO 'any' types)
 *
 * @module lib/plugins/question-bulk/server
 */

import type { BetterAuthPlugin } from "better-auth";
import {
  createAuthEndpoint,
  sessionMiddleware,
  createAuthMiddleware,
} from "better-auth/api";
import { APIError } from "better-auth/api";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
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
import type { QuestionBulkRow } from "@/types/question-api";
import { Prisma } from "@/generated/prisma";
import { ZodError } from "zod";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Encrypted question data ready for database insertion
 * This is the EXACT output structure of transformToEncrypted()
 *
 * Note: examType, year, subject use union types from validation schema
 */
interface EncryptedQuestionData {
  examType: "WAEC" | "JAMB" | "NECO" | "GCE" | "NABTEB" | "POST_UTME";
  year: number;
  subject: string;
  questionType: "multiple_choice" | "true_false" | "essay" | "fill_in_blank";
  questionImage: null;
  questionPoint: number;
  difficultyLevel: "easy" | "medium" | "hard";
  tags: string[];
  timeLimit: number | null;
  language: string;
  createdBy: string;
  questionText: string; // Encrypted JSON string
  answerExplanation: string | null; // Encrypted JSON string or null
  options: EncryptedOptionData[];
}

/**
 * Encrypted option data ready for database insertion
 */
interface EncryptedOptionData {
  optionText: string; // Encrypted JSON string
  optionImage: null;
  isCorrect: boolean;
  orderIndex: number;
}

// ============================================
// PLUGIN CONFIGURATION
// ============================================

const PLUGIN_ID = "question-bulk";
const API_KEY_HEADER = "x-question-api-key";

const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ROWS: 1000,
} as const;

export interface QuestionBulkPluginOptions {
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
   * Rate limit configuration per operation type
   */
  rateLimit?: {
    import: { window: number; max: number };
    export: { window: number; max: number };
    template: { window: number; max: number };
  };
}

// ============================================
// PLUGIN FACTORY
// ============================================

export const questionBulkPlugin = (
  options: QuestionBulkPluginOptions
): BetterAuthPlugin => {
  const rateLimitConfig = options.rateLimit || {
    import: { window: 3600, max: 10 }, // 10 imports per hour
    export: { window: 3600, max: 20 }, // 20 exports per hour
    template: { window: 3600, max: 50 }, // 50 templates per hour
  };

  return {
    id: PLUGIN_ID,

    // ============================================
    // RATE LIMITING
    // ============================================
    rateLimit:
      options.enableRateLimit !== false
        ? [
            {
              pathMatcher: (path) => path === "/question/bulk/import",
              window: rateLimitConfig.import.window,
              max: rateLimitConfig.import.max,
            },
            {
              pathMatcher: (path) => path === "/question/bulk/export",
              window: rateLimitConfig.export.window,
              max: rateLimitConfig.export.max,
            },
            {
              pathMatcher: (path) => path === "/question/bulk/template",
              window: rateLimitConfig.template.window,
              max: rateLimitConfig.template.max,
            },
          ]
        : undefined,

    // ============================================
    // ENDPOINTS
    // ============================================
    endpoints: {
      /**
       * Bulk Import Endpoint
       *
       * POST /api/v1/auth/question/bulk/import
       *
       * Authorization: question:import permission required
       *
       * Request: multipart/form-data
       * - format: "excel" | "csv" | "json"
       * - validateOnly: boolean (optional)
       * - file: File
       *
       * Response: JSON
       * {
       *   success: boolean,
       *   message: string,
       *   data?: {
       *     importedCount: number,
       *     failedCount: number,
       *     totalRows: number,
       *     errors?: Array<{row: number, field?: string, message: string}>
       *   }
       * }
       */
      bulkImport: createAuthEndpoint(
        "/question/bulk/import",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // ============================================
            // STEP 1: VALIDATE API KEY
            // ============================================
            if (!ctx.request) {
              throw new APIError("BAD_REQUEST", { message: "Invalid request" });
            }

            const apiKey = ctx.request.headers.get(API_KEY_HEADER);
            if (!apiKey || apiKey !== options.apiKey) {
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid or missing API key",
              });
            }

            // ============================================
            // STEP 2: GET SESSION
            // ============================================
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // ============================================
            // STEP 3: VERIFY USER
            // ============================================
            const user = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: {
                id: true,
                email: true,
                name: true,
                banned: true,
                role: true,
              },
            });

            if (!user) {
              throw new APIError("NOT_FOUND", { message: "User not found" });
            }

            if (user.banned) {
              throw new APIError("FORBIDDEN", {
                message: "Your account has been banned",
              });
            }

            // ============================================
            // STEP 4: CHECK PERMISSION (RBAC)
            // ============================================
            const permissionCheck = await auth.api.userHasPermission({
              body: {
                userId: session.user.id,
                permissions: { question: ["import"] },
              },
            });

            if (!permissionCheck?.success) {
              throw new APIError("FORBIDDEN", {
                message: "You don't have permission to import questions",
              });
            }

            // ============================================
            // STEP 5: PARSE FORMDATA
            // ============================================
            const formData = await ctx.request.formData();
            const format = formData.get("format");
            const validateOnly = formData.get("validateOnly") === "true";
            const file = formData.get("file") as File | null;

            if (!file) {
              throw new APIError("BAD_REQUEST", {
                message: "No file provided",
              });
            }

            // ============================================
            // STEP 6: VALIDATE FILE SIZE
            // ============================================
            if (file.size > FILE_LIMITS.MAX_SIZE) {
              throw new APIError("BAD_REQUEST", {
                message: `File size exceeds ${
                  FILE_LIMITS.MAX_SIZE / 1024 / 1024
                }MB limit`,
              });
            }

            // ============================================
            // STEP 7: VALIDATE REQUEST
            // ============================================
            let validatedRequest;
            try {
              validatedRequest = validateBulkImportRequest({
                format,
                validateOnly,
              });
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Invalid request parameters",
                  details: error.issues,
                });
              }
              throw error;
            }

            // ============================================
            // STEP 8: READ FILE BUFFER
            // ============================================
            const buffer = Buffer.from(await file.arrayBuffer());

            // ============================================
            // STEP 9: SELECT FORMAT HANDLER
            // ============================================
            const handler =
              validatedRequest.format === "excel"
                ? excelHandler
                : validatedRequest.format === "csv"
                  ? csvHandler
                  : jsonHandler;

            // ============================================
            // STEP 10: PARSE FILE
            // ============================================
            const parseResult = await handler.parse(buffer);

            if (
              parseResult.errors.length > 0 &&
              parseResult.data.length === 0
            ) {
              throw new APIError("BAD_REQUEST", {
                message: "Failed to parse file",
                details: parseResult.errors,
              });
            }

            // ============================================
            // STEP 11: CHECK ROW LIMIT
            // ============================================
            if (parseResult.rowCount > FILE_LIMITS.MAX_ROWS) {
              throw new APIError("BAD_REQUEST", {
                message: `File contains ${parseResult.rowCount} rows. Maximum is ${FILE_LIMITS.MAX_ROWS}`,
              });
            }

            // ============================================
            // STEP 12: PROCESS BULK DATA (FIXED)
            // ============================================
            const result = await processBulkData<
              QuestionBulkRow,
              EncryptedQuestionData
            >(
              parseResult.data as QuestionBulkRow[],
              {
                // Validate each row
                validate: async (row, index) => {
                  const validation = await mapRowToQuestion(row, index);
                  return {
                    valid: validation.valid,
                    errors: validation.errors,
                  };
                },

                // Transform validated row to encrypted format
                transform: async (row, index) => {
                  const validation = await mapRowToQuestion(row, index);
                  if (!validation.valid || !validation.data) {
                    throw new Error("Validation failed");
                  }
                  // await the async transformToEncrypted function
                  const encrypted = await transformToEncrypted(
                    validation.data,
                    user.id
                  );
                  return encrypted as EncryptedQuestionData;
                },

                // Save batch to database (FIXED - NO MORE 'any' TYPE)
                save: async (batch: EncryptedQuestionData[]) => {
                  // ✅ FIX: Separate options from question data using destructuring
                  const created = await prisma.$transaction(
                    batch.map((item) => {
                      // Destructure to separate options from question fields
                      const { options, ...questionData } = item;

                      // Create question with nested options
                      return prisma.question.create({
                        data: {
                          ...questionData, // ✅ No 'options' conflict
                          options: {
                            create: options, // ✅ Clean nested create
                          },
                        },
                        include: {
                          options: true, // ✅ Include options for verification
                        },
                      });
                    })
                  );

                  // ✅ Log verification for debugging
                  console.log(
                    `[BULK IMPORT] Created ${created.length} questions with total ${created.reduce((sum, q) => sum + q.options.length, 0)} options`
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

            // ============================================
            // STEP 13: AUDIT LOG
            // ============================================
            const ipAddress =
              ctx.request.headers.get("x-forwarded-for") ||
              ctx.request.headers.get("x-real-ip") ||
              null;
            const userAgent = ctx.request.headers.get("user-agent") || null;

            console.log(
              "[AUDIT] Bulk Import (Plugin):",
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  userId: user.id,
                  userEmail: user.email,
                  userName: user.name,
                  userRole: user.role,
                  format: validatedRequest.format,
                  totalRows: parseResult.rowCount,
                  imported: result.processedCount,
                  failed: result.failedCount,
                  validateOnly: validatedRequest.validateOnly,
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // ============================================
            // STEP 14: RETURN SUCCESS RESPONSE
            // ============================================
            return ctx.json(
              {
                success: true,
                message: validatedRequest.validateOnly
                  ? `Validation complete: ${result.processedCount} valid, ${result.failedCount} invalid`
                  : `Import complete: ${result.processedCount} imported, ${result.failedCount} failed`,
                data: {
                  importedCount: result.processedCount,
                  failedCount: result.failedCount,
                  totalRows: parseResult.rowCount,
                  errors: result.errors.slice(0, 100), // Limit to first 100 errors
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
                  errors: (error as { details?: unknown }).details,
                },
                {
                  status: typeof error.status === "number" ? error.status : 500,
                }
              );
            }

            console.error("Bulk import error:", error);
            return ctx.json(
              {
                success: false,
                message: "Import failed",
                code: "INTERNAL_ERROR",
              },
              { status: 500 }
            );
          }
        }
      ),

      /**
       * Bulk Export Endpoint
       *
       * POST /api/v1/auth/question/bulk/export
       *
       * Authorization: question:export permission required
       *
       * Request: JSON
       * {
       *   format: "excel" | "csv" | "json",
       *   examType?: string,
       *   subject?: string,
       *   year?: number,
       *   difficultyLevel?: string,
       *   questionType?: string,
       *   limit?: number,
       *   includeDeleted?: boolean
       * }
       *
       * Response: File buffer with appropriate content-type
       */
      bulkExport: createAuthEndpoint(
        "/question/bulk/export",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // ============================================
            // STEP 1: VALIDATE API KEY
            // ============================================
            if (!ctx.request) {
              throw new APIError("BAD_REQUEST", { message: "Invalid request" });
            }

            const apiKey = ctx.request.headers.get(API_KEY_HEADER);
            if (!apiKey || apiKey !== options.apiKey) {
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid or missing API key",
              });
            }

            // ============================================
            // STEP 2: GET SESSION
            // ============================================
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // ============================================
            // STEP 3: VERIFY USER
            // ============================================
            const user = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: {
                id: true,
                email: true,
                name: true,
                banned: true,
                role: true,
              },
            });

            if (!user) {
              throw new APIError("NOT_FOUND", { message: "User not found" });
            }

            if (user.banned) {
              throw new APIError("FORBIDDEN", {
                message: "Your account has been banned",
              });
            }

            // ============================================
            // STEP 4: CHECK PERMISSION (RBAC)
            // ============================================
            const permissionCheck = await auth.api.userHasPermission({
              body: {
                userId: session.user.id,
                permissions: { question: ["export"] },
              },
            });

            if (!permissionCheck?.success) {
              throw new APIError("FORBIDDEN", {
                message: "You don't have permission to export questions",
              });
            }

            // ============================================
            // STEP 5: PARSE REQUEST BODY
            // ============================================
            const body = await ctx.request.json();

            // ============================================
            // STEP 6: VALIDATE REQUEST
            // ============================================
            let validated;
            try {
              validated = validateBulkExportQuery(body);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Invalid query parameters",
                  details: error.issues,
                });
              }
              throw error;
            }

            // ============================================
            // STEP 7: BUILD WHERE CLAUSE
            // ============================================
            const where: Prisma.QuestionWhereInput = {
              deletedAt: validated.includeDeleted ? undefined : null,
            };

            if (validated.examType) where.examType = validated.examType;
            if (validated.subject) where.subject = validated.subject;
            if (validated.year) where.year = validated.year;
            if (validated.difficultyLevel)
              where.difficultyLevel = validated.difficultyLevel;
            if (validated.questionType)
              where.questionType = validated.questionType;

            // ============================================
            // STEP 8: EXPORT DATA WITH DECRYPTION
            // ============================================
            const exportResult = await exportBulkData(
              async () =>
                prisma.question.findMany({
                  where,
                  include: { options: { orderBy: { orderIndex: "asc" } } },
                  take: validated.limit,
                  orderBy: { createdAt: "desc" },
                }),
              async (question) => mapQuestionToRow(question),
              {}
            );

            if (exportResult.data.length === 0) {
              throw new APIError("NOT_FOUND", {
                message: "No questions found matching criteria",
              });
            }

            // ============================================
            // STEP 9: SELECT FORMAT HANDLER
            // ============================================
            const handler =
              validated.format === "excel"
                ? excelHandler
                : validated.format === "csv"
                  ? csvHandler
                  : jsonHandler;

            // ============================================
            // STEP 10: GENERATE FILE
            // ============================================
            const headers = getQuestionHeaders();
            const fileResult = await handler.export(
              exportResult.data as unknown as Record<string, unknown>[],
              headers,
              {
                styled: true,
              }
            );

            // ============================================
            // STEP 11: AUDIT LOG
            // ============================================
            const ipAddress =
              ctx.request.headers.get("x-forwarded-for") ||
              ctx.request.headers.get("x-real-ip") ||
              null;
            const userAgent = ctx.request.headers.get("user-agent") || null;

            console.log(
              "[AUDIT] Bulk Export (Plugin):",
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  userId: user.id,
                  userEmail: user.email,
                  userName: user.name,
                  userRole: user.role,
                  format: validated.format,
                  filters: body,
                  exported: exportResult.data.length,
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // ============================================
            // STEP 12: RETURN FILE AS RESPONSE
            // ============================================
            return new Response(new Uint8Array(fileResult.buffer), {
              headers: {
                "Content-Type": fileResult.mimeType,
                "Content-Disposition": `attachment; filename="${fileResult.filename}"`,
                "Content-Length": fileResult.size.toString(),
              },
            });
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
                },
                {
                  status: typeof error.status === "number" ? error.status : 500,
                }
              );
            }

            console.error("Bulk export error:", error);
            return ctx.json(
              {
                success: false,
                message: "Export failed",
                code: "INTERNAL_ERROR",
              },
              { status: 500 }
            );
          }
        }
      ),

      /**
       * Download Template Endpoint
       *
       * GET /api/v1/auth/question/bulk/template?format=excel
       *
       * Authorization: Authenticated user (any role)
       *
       * Query params:
       * - format: "excel" | "csv" | "json"
       *
       * Response: Template file with sample data and field descriptions
       */
      downloadTemplate: createAuthEndpoint(
        "/question/bulk/template",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // ============================================
            // STEP 1: VALIDATE API KEY
            // ============================================
            if (!ctx.request) {
              throw new APIError("BAD_REQUEST", { message: "Invalid request" });
            }

            const apiKey = ctx.request.headers.get(API_KEY_HEADER);
            if (!apiKey || apiKey !== options.apiKey) {
              throw new APIError("UNAUTHORIZED", {
                message: "Invalid or missing API key",
              });
            }

            // ============================================
            // STEP 2: GET SESSION
            // ============================================
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // ============================================
            // STEP 3: PARSE QUERY PARAMS
            // ============================================
            const url = new URL(ctx.request.url);
            const format = url.searchParams.get("format") || "excel";

            // ============================================
            // STEP 4: VALIDATE REQUEST
            // ============================================
            let validated;
            try {
              validated = validateTemplateRequest({
                format,
                includeSamples: true,
              });
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Invalid format",
                  details: error.issues,
                });
              }
              throw error;
            }

            // ============================================
            // STEP 5: SELECT FORMAT HANDLER
            // ============================================
            const handler =
              validated.format === "excel"
                ? excelHandler
                : validated.format === "csv"
                  ? csvHandler
                  : jsonHandler;

            // ============================================
            // STEP 6: GENERATE TEMPLATE
            // ============================================
            const headers = getQuestionHeaders();
            const descriptions = getQuestionDescriptions();

            const templateResult = await handler.generateTemplate(headers, {
              includeSamples: true,
              sampleCount: 3,
              descriptions,
            });

            // ============================================
            // STEP 7: AUDIT LOG
            // ============================================
            const ipAddress =
              ctx.request.headers.get("x-forwarded-for") ||
              ctx.request.headers.get("x-real-ip") ||
              null;
            const userAgent = ctx.request.headers.get("user-agent") || null;

            console.log(
              "[AUDIT] Template Download (Plugin):",
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  userId: session.user.id,
                  userEmail: session.user.email,
                  format: validated.format,
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // ============================================
            // STEP 8: RETURN FILE
            // ============================================
            return new Response(new Uint8Array(templateResult.buffer), {
              headers: {
                "Content-Type": templateResult.mimeType,
                "Content-Disposition": `attachment; filename="${templateResult.filename}"`,
                "Content-Length": templateResult.size.toString(),
              },
            });
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
                },
                {
                  status: typeof error.status === "number" ? error.status : 500,
                }
              );
            }

            console.error("Template download error:", error);
            return ctx.json(
              {
                success: false,
                message: "Template download failed",
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
          matcher: (context) => context.path?.startsWith("/question/bulk"),
          handler: createAuthMiddleware(async (_ctx) => {
            // Additional post-processing can go here
            // e.g., trigger webhooks, send notifications, etc.
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};
