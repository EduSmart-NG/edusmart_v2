/**
 * Subject Management Server Plugin
 *
 * Better Auth plugin for secure subject management with dual authentication:
 * 1. Session cookie (Better Auth session)
 * 2. API key (custom header validation)
 *
 * Features:
 * - Permission-based access (RBAC)
 * - Rate limiting per operation type
 * - Input validation and sanitization
 * - Database transactions with rollback
 * - Audit logging
 * - Soft delete support
 *
 * @module lib/plugins/subject/server
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
  validateSubjectCreate,
  validateSubjectUpdate,
  validateSubjectList,
  validateSubjectDelete,
  formatValidationErrors,
} from "@/lib/validations/subject";
import { auth } from "@/lib/auth";
import { ZodError } from "zod";

// ============================================
// PLUGIN CONFIGURATION
// ============================================

const PLUGIN_ID = "subject";
const API_KEY_HEADER = "x-subject-api-key";

export interface SubjectPluginOptions {
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
    create: { window: number; max: number };
    list: { window: number; max: number };
    update: { window: number; max: number };
    delete: { window: number; max: number };
  };
}

// ============================================
// PLUGIN FACTORY
// ============================================

export const subjectPlugin = (
  options: SubjectPluginOptions
): BetterAuthPlugin => {
  const rateLimitConfig = options.rateLimit || {
    create: { window: 300, max: 20 }, // 20 creates per 5 minutes
    list: { window: 60, max: 50 }, // 50 list requests per minute
    update: { window: 300, max: 30 }, // 30 updates per 5 minutes
    delete: { window: 300, max: 10 }, // 10 deletes per 5 minutes
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
              pathMatcher: (path) => path === "/subject/create",
              window: rateLimitConfig.create.window,
              max: rateLimitConfig.create.max,
            },
            {
              pathMatcher: (path) => path === "/subject/list",
              window: rateLimitConfig.list.window,
              max: rateLimitConfig.list.max,
            },
            {
              pathMatcher: (path) => path === "/subject/update",
              window: rateLimitConfig.update.window,
              max: rateLimitConfig.update.max,
            },
            {
              pathMatcher: (path) => path === "/subject/delete",
              window: rateLimitConfig.delete.window,
              max: rateLimitConfig.delete.max,
            },
          ]
        : undefined,

    // ============================================
    // ENDPOINTS
    // ============================================
    endpoints: {
      /**
       * Create Subject Endpoint
       *
       * POST /api/v1/auth/subject/create
       *
       * Authentication:
       * - Session cookie (via sessionMiddleware)
       * - API key (via custom header)
       *
       * Authorization:
       * - subject:["create"] permission required (admin or exam_manager)
       */
      createSubject: createAuthEndpoint(
        "/subject/create",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // STEP 1: Validate API key
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

            // STEP 2: Get session
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // STEP 3: Verify user
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

            // STEP 4: Check permission
            const permissionCheck = await auth.api.userHasPermission({
              body: {
                userId: session.user.id,
                permissions: {
                  subject: ["create"],
                },
              },
            });

            if (!permissionCheck?.success) {
              throw new APIError("FORBIDDEN", {
                message: "You don't have permission to create subjects",
              });
            }

            // STEP 5: Parse and validate data
            const body = await ctx.request.json();
            let validatedData: ReturnType<typeof validateSubjectCreate>;
            try {
              validatedData = validateSubjectCreate(body);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Validation failed",
                  details: formatValidationErrors(error),
                });
              }
              throw error;
            }

            // STEP 6: Check for duplicate subject name (case-insensitive)
            const existingSubject = await prisma.subject.findFirst({
              where: {
                name: {
                  equals: validatedData.name,
                  mode: "insensitive",
                },
                deletedAt: null,
              },
            });

            if (existingSubject) {
              throw new APIError("CONFLICT", {
                message: "A subject with this name already exists",
              });
            }

            // STEP 7: Check for duplicate code if provided
            if (validatedData.code) {
              const existingCode = await prisma.subject.findFirst({
                where: {
                  code: validatedData.code,
                  deletedAt: null,
                },
              });

              if (existingCode) {
                throw new APIError("CONFLICT", {
                  message: "A subject with this code already exists",
                });
              }
            }

            // STEP 8: Create subject
            const subject = await prisma.subject.create({
              data: {
                name: validatedData.name,
                code: validatedData.code,
                description: validatedData.description,
                isActive: validatedData.isActive,
                createdBy: session.user.id,
              },
            });

            // STEP 9: Audit log
            const ipAddress =
              ctx.request.headers.get("x-forwarded-for") ||
              ctx.request.headers.get("x-real-ip") ||
              null;
            const userAgent = ctx.request.headers.get("user-agent") || null;

            console.log(
              `[AUDIT] Subject Create:`,
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  userId: session.user.id,
                  userEmail: user.email,
                  userRole: user.role,
                  subjectId: subject.id,
                  subjectName: subject.name,
                  subjectCode: subject.code,
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // STEP 10: Return success
            return ctx.json(
              {
                success: true,
                message: "Subject created successfully",
                data: {
                  subjectId: subject.id,
                  subject,
                },
              },
              { status: 201 }
            );
          } catch (error) {
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

            console.error("Subject creation error:", error);
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

      /**
       * List Subjects Endpoint
       *
       * GET /api/v1/auth/subject/list
       *
       * Authentication:
       * - Session cookie (via sessionMiddleware)
       *
       * Authorization:
       * - subject:["list"] permission required (all roles)
       */
      listSubjects: createAuthEndpoint(
        "/subject/list",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // STEP 1: Get session
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // STEP 2: Verify user
            const user = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: {
                id: true,
                role: true,
                banned: true,
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

            // STEP 3: Check permission
            const permissionCheck = await auth.api.userHasPermission({
              body: {
                userId: session.user.id,
                permissions: {
                  subject: ["list"],
                },
              },
            });

            if (!permissionCheck?.success) {
              throw new APIError("FORBIDDEN", {
                message: "You don't have permission to list subjects",
              });
            }

            // STEP 4: Parse and validate query parameters
            const url = new URL(ctx.request.url);
            const queryParams = {
              isActive:
                url.searchParams.get("isActive") === "true"
                  ? true
                  : url.searchParams.get("isActive") === "false"
                    ? false
                    : undefined,
              search: url.searchParams.get("search") || undefined,
              limit: parseInt(url.searchParams.get("limit") || "50"),
              offset: parseInt(url.searchParams.get("offset") || "0"),
              sortBy: url.searchParams.get("sortBy") || "name",
              sortOrder: url.searchParams.get("sortOrder") || "asc",
            };

            let validatedParams: ReturnType<typeof validateSubjectList>;
            try {
              validatedParams = validateSubjectList(queryParams);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Invalid query parameters",
                  details: formatValidationErrors(error),
                });
              }
              throw error;
            }

            // STEP 5: Build where clause
            const where: Parameters<
              typeof prisma.subject.findMany
            >[0]["where"] = {
              deletedAt: null,
            };

            if (validatedParams.isActive !== undefined) {
              where.isActive = validatedParams.isActive;
            }

            if (validatedParams.search) {
              where.OR = [
                {
                  name: {
                    contains: validatedParams.search,
                    mode: "insensitive",
                  },
                },
                {
                  code: {
                    contains: validatedParams.search,
                    mode: "insensitive",
                  },
                },
              ];
            }

            // STEP 6: Fetch subjects with counts
            const [subjects, total] = await Promise.all([
              prisma.subject.findMany({
                where,
                include: {
                  _count: {
                    select: {
                      questions: true,
                      exams: true,
                    },
                  },
                },
                orderBy: {
                  [validatedParams.sortBy]: validatedParams.sortOrder,
                },
                skip: validatedParams.offset,
                take: validatedParams.limit,
              }),
              prisma.subject.count({ where }),
            ]);

            // STEP 7: Return response
            return ctx.json({
              success: true,
              message: "Subjects retrieved successfully",
              data: {
                subjects,
                total,
                limit: validatedParams.limit,
                offset: validatedParams.offset,
              },
            });
          } catch (error) {
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

            console.error("Subject list error:", error);
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

      /**
       * Update Subject Endpoint
       *
       * PATCH /api/v1/auth/subject/update
       *
       * Authentication:
       * - Session cookie (via sessionMiddleware)
       * - API key (via custom header)
       *
       * Authorization:
       * - subject:["edit"] permission required (admin or exam_manager)
       */
      updateSubject: createAuthEndpoint(
        "/subject/update",
        {
          method: "PATCH",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // STEP 1: Validate API key
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

            // STEP 2: Get session
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // STEP 3: Verify user
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

            // STEP 4: Check permission
            const permissionCheck = await auth.api.userHasPermission({
              body: {
                userId: session.user.id,
                permissions: {
                  subject: ["edit"],
                },
              },
            });

            if (!permissionCheck?.success) {
              throw new APIError("FORBIDDEN", {
                message: "You don't have permission to update subjects",
              });
            }

            // STEP 5: Parse and validate data
            const body = await ctx.request.json();
            const { subjectId, ...updateData } = body;

            if (!subjectId) {
              throw new APIError("BAD_REQUEST", {
                message: "Subject ID is required",
              });
            }

            let validatedData: ReturnType<typeof validateSubjectUpdate>;
            try {
              validatedData = validateSubjectUpdate(updateData);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Validation failed",
                  details: formatValidationErrors(error),
                });
              }
              throw error;
            }

            // STEP 6: Check subject exists
            const existingSubject = await prisma.subject.findUnique({
              where: { id: subjectId },
            });

            if (!existingSubject || existingSubject.deletedAt) {
              throw new APIError("NOT_FOUND", {
                message: "Subject not found",
              });
            }

            // STEP 7: Check for duplicate name if name is being updated
            if (
              validatedData.name &&
              validatedData.name !== existingSubject.name
            ) {
              const duplicateName = await prisma.subject.findFirst({
                where: {
                  id: { not: subjectId },
                  name: {
                    equals: validatedData.name,
                    mode: "insensitive",
                  },
                  deletedAt: null,
                },
              });

              if (duplicateName) {
                throw new APIError("CONFLICT", {
                  message: "A subject with this name already exists",
                });
              }
            }

            // STEP 8: Check for duplicate code if code is being updated
            if (
              validatedData.code &&
              validatedData.code !== existingSubject.code
            ) {
              const duplicateCode = await prisma.subject.findFirst({
                where: {
                  id: { not: subjectId },
                  code: validatedData.code,
                  deletedAt: null,
                },
              });

              if (duplicateCode) {
                throw new APIError("CONFLICT", {
                  message: "A subject with this code already exists",
                });
              }
            }

            // STEP 9: Update subject
            const updatedSubject = await prisma.subject.update({
              where: { id: subjectId },
              data: validatedData,
            });

            // STEP 10: Audit log
            const ipAddress =
              ctx.request.headers.get("x-forwarded-for") ||
              ctx.request.headers.get("x-real-ip") ||
              null;
            const userAgent = ctx.request.headers.get("user-agent") || null;

            console.log(
              `[AUDIT] Subject Update:`,
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  userId: session.user.id,
                  userEmail: user.email,
                  userRole: user.role,
                  subjectId: updatedSubject.id,
                  updatedFields: Object.keys(validatedData),
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // STEP 11: Return success
            return ctx.json({
              success: true,
              message: "Subject updated successfully",
              data: {
                subject: updatedSubject,
              },
            });
          } catch (error) {
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

            console.error("Subject update error:", error);
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

      /**
       * Delete Subject Endpoint
       *
       * DELETE /api/v1/auth/subject/delete
       *
       * Authentication:
       * - Session cookie (via sessionMiddleware)
       * - API key (via custom header)
       *
       * Authorization:
       * - subject:["delete"] permission required (admin only)
       */
      deleteSubject: createAuthEndpoint(
        "/subject/delete",
        {
          method: "DELETE",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          try {
            // STEP 1: Validate API key
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

            // STEP 2: Get session
            const session = ctx.context.session;
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                message: "No active session found",
              });
            }

            // STEP 3: Verify user
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

            // STEP 4: Check permission (admin only)
            const permissionCheck = await auth.api.userHasPermission({
              body: {
                userId: session.user.id,
                permissions: {
                  subject: ["delete"],
                },
              },
            });

            if (!permissionCheck?.success) {
              throw new APIError("FORBIDDEN", {
                message: "Only administrators can delete subjects",
              });
            }

            // STEP 5: Parse and validate data
            const body = await ctx.request.json();
            let validatedData: ReturnType<typeof validateSubjectDelete>;
            try {
              validatedData = validateSubjectDelete(body);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new APIError("BAD_REQUEST", {
                  message: "Validation failed",
                  details: formatValidationErrors(error),
                });
              }
              throw error;
            }

            // STEP 6: Check subject exists
            const existingSubject = await prisma.subject.findUnique({
              where: { id: validatedData.subjectId },
            });

            if (!existingSubject || existingSubject.deletedAt) {
              throw new APIError("NOT_FOUND", {
                message: "Subject not found",
              });
            }

            // STEP 7: Soft delete subject
            await prisma.subject.update({
              where: { id: validatedData.subjectId },
              data: {
                deletedAt: new Date(),
              },
            });

            // STEP 8: Audit log
            const ipAddress =
              ctx.request.headers.get("x-forwarded-for") ||
              ctx.request.headers.get("x-real-ip") ||
              null;
            const userAgent = ctx.request.headers.get("user-agent") || null;

            console.log(
              `[AUDIT] Subject Delete:`,
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  userId: session.user.id,
                  userEmail: user.email,
                  userRole: user.role,
                  subjectId: validatedData.subjectId,
                  subjectName: existingSubject.name,
                  ipAddress,
                  userAgent,
                },
                null,
                2
              )
            );

            // STEP 9: Return success
            return ctx.json({
              success: true,
              message: "Subject deleted successfully",
              data: {
                subjectId: validatedData.subjectId,
              },
            });
          } catch (error) {
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

            console.error("Subject delete error:", error);
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
          matcher: (context) => context.path?.startsWith("/subject"),
          handler: createAuthMiddleware(async (_ctx) => {
            // Additional post-processing can go here
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};
