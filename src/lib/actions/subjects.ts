"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import {
  validateSubjectCreate,
  validateSubjectUpdate,
  validateSubjectList,
  validateSubjectDelete,
  formatValidationErrors,
} from "@/lib/validations/subject";
import type {
  SubjectCreateResponse,
  SubjectListResponse,
  SubjectUpdateResponse,
  SubjectDeleteResponse,
} from "@/types/subject-api";
import { ZodError } from "zod";

// ============================================
// TYPE DEFINITIONS
// ============================================

type SubjectPermission = "create" | "delete" | "view" | "edit" | "list";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verify user session and permissions
 */
async function verifySessionAndPermission(permission: {
  subject: SubjectPermission[];
}): Promise<{
  success: boolean;
  message?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        message: "No active session found. Please sign in.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        banned: true,
      },
    });

    if (!user || user.banned) {
      return {
        success: false,
        message: user?.banned
          ? "Your account has been banned"
          : "User not found",
      };
    }

    // Check permission
    const permissionCheck = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permissions: permission,
      },
    });

    if (!permissionCheck?.success) {
      return {
        success: false,
        message: "You don't have permission to perform this operation",
      };
    }

    return {
      success: true,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role || "user",
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return {
      success: false,
      message: "Failed to verify session",
    };
  }
}

/**
 * Log audit entry
 */
async function logAudit(
  userId: string,
  userEmail: string,
  userRole: string,
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
          timestamp: new Date().toISOString(),
          userId,
          userEmail,
          userRole,
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
// CREATE SUBJECT
// ============================================

/**
 * Create a new subject
 *
 * @param data - Subject creation data
 * @returns Subject creation result
 */
export async function createSubject(
  data: unknown
): Promise<SubjectCreateResponse> {
  try {
    // STEP 1: Verify session and permission
    const authCheck = await verifySessionAndPermission({
      subject: ["create"],
    });

    if (!authCheck.success) {
      return {
        success: false,
        message: authCheck.message || "Authentication failed",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Validate data
    let validatedData: ReturnType<typeof validateSubjectCreate>;
    try {
      validatedData = validateSubjectCreate(data);
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

    // STEP 3: Check for duplicate name (MySQL case-insensitive by default)
    const existingSubject = await prisma.subject.findFirst({
      where: {
        name: validatedData.name,
        deletedAt: null,
      },
    });

    if (existingSubject) {
      return {
        success: false,
        message: "A subject with this name already exists",
        code: "CONFLICT",
      };
    }

    // STEP 4: Check for duplicate code if provided
    if (validatedData.code) {
      const existingCode = await prisma.subject.findFirst({
        where: {
          code: validatedData.code,
          deletedAt: null,
        },
      });

      if (existingCode) {
        return {
          success: false,
          message: "A subject with this code already exists",
          code: "CONFLICT",
        };
      }
    }

    // STEP 5: Create subject
    const subject = await prisma.subject.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        description: validatedData.description,
        isActive: validatedData.isActive,
        createdBy: authCheck.userId!,
      },
    });

    // STEP 6: Audit log
    await logAudit(
      authCheck.userId!,
      authCheck.userEmail!,
      authCheck.userRole!,
      "CREATE_SUBJECT",
      {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
      }
    );

    return {
      success: true,
      message: "Subject created successfully",
      data: {
        subjectId: subject.id,
        subject,
      },
    };
  } catch (error) {
    console.error("Create subject error:", error);
    return {
      success: false,
      message: "Failed to create subject",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// LIST SUBJECTS
// ============================================

/**
 * List subjects with filters and pagination
 *
 * @param params - List parameters
 * @returns Subject list result
 */
export async function listSubjects(
  params?: unknown
): Promise<SubjectListResponse> {
  try {
    // STEP 1: Verify session and permission
    const authCheck = await verifySessionAndPermission({
      subject: ["list"],
    });

    if (!authCheck.success) {
      return {
        success: false,
        message: authCheck.message || "Authentication failed",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Validate parameters
    let validatedParams: ReturnType<typeof validateSubjectList>;
    try {
      validatedParams = validateSubjectList(params || {});
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          error: formatValidationErrors(error).toString(),
        };
      }
      throw error;
    }

    // STEP 3: Build where clause
    const whereClause: {
      deletedAt: null;
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string };
        code?: { contains: string };
      }>;
    } = {
      deletedAt: null,
    };

    if (validatedParams.isActive !== undefined) {
      whereClause.isActive = validatedParams.isActive;
    }

    if (validatedParams.search) {
      whereClause.OR = [
        {
          name: {
            contains: validatedParams.search,
          },
        },
        {
          code: {
            contains: validatedParams.search,
          },
        },
      ];
    }

    // STEP 4: Fetch subjects with counts
    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
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
      prisma.subject.count({ where: whereClause }),
    ]);

    // STEP 5: Audit log
    await logAudit(
      authCheck.userId!,
      authCheck.userEmail!,
      authCheck.userRole!,
      "LIST_SUBJECTS",
      {
        totalSubjects: total,
        filters: validatedParams,
      }
    );

    return {
      success: true,
      message: "Subjects retrieved successfully",
      data: {
        subjects,
        total,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
      },
    };
  } catch (error) {
    console.error("List subjects error:", error);
    return {
      success: false,
      message: "Failed to list subjects",
      code: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// UPDATE SUBJECT
// ============================================

/**
 * Update a subject
 *
 * @param subjectId - Subject ID
 * @param data - Update data
 * @returns Subject update result
 */
export async function updateSubject(
  subjectId: string,
  data: unknown
): Promise<SubjectUpdateResponse> {
  try {
    // STEP 1: Verify session and permission
    const authCheck = await verifySessionAndPermission({
      subject: ["edit"],
    });

    if (!authCheck.success) {
      return {
        success: false,
        message: authCheck.message || "Authentication failed",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Validate data
    let validatedData: ReturnType<typeof validateSubjectUpdate>;
    try {
      validatedData = validateSubjectUpdate(data);
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

    // STEP 3: Check subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!existingSubject || existingSubject.deletedAt) {
      return {
        success: false,
        message: "Subject not found",
        code: "NOT_FOUND",
      };
    }

    // STEP 4: Check for duplicate name if name is being updated
    if (validatedData.name && validatedData.name !== existingSubject.name) {
      const duplicateName = await prisma.subject.findFirst({
        where: {
          id: { not: subjectId },
          name: validatedData.name,
          deletedAt: null,
        },
      });

      if (duplicateName) {
        return {
          success: false,
          message: "A subject with this name already exists",
          code: "CONFLICT",
        };
      }
    }

    // STEP 5: Check for duplicate code if code is being updated
    if (validatedData.code && validatedData.code !== existingSubject.code) {
      const duplicateCode = await prisma.subject.findFirst({
        where: {
          id: { not: subjectId },
          code: validatedData.code,
          deletedAt: null,
        },
      });

      if (duplicateCode) {
        return {
          success: false,
          message: "A subject with this code already exists",
          code: "CONFLICT",
        };
      }
    }

    // STEP 6: Update subject
    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: validatedData,
    });

    // STEP 7: Audit log
    await logAudit(
      authCheck.userId!,
      authCheck.userEmail!,
      authCheck.userRole!,
      "UPDATE_SUBJECT",
      {
        subjectId: updatedSubject.id,
        updatedFields: Object.keys(validatedData),
      }
    );

    return {
      success: true,
      message: "Subject updated successfully",
      data: {
        subject: updatedSubject,
      },
    };
  } catch (error) {
    console.error("Update subject error:", error);
    return {
      success: false,
      message: "Failed to update subject",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// DELETE SUBJECT
// ============================================

/**
 * Delete a subject (soft delete)
 *
 * @param subjectId - Subject ID
 * @returns Subject delete result
 */
export async function deleteSubject(
  subjectId: string
): Promise<SubjectDeleteResponse> {
  try {
    // STEP 1: Verify session and permission (admin only)
    const authCheck = await verifySessionAndPermission({
      subject: ["delete"],
    });

    if (!authCheck.success) {
      return {
        success: false,
        message: authCheck.message || "Only administrators can delete subjects",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Validate subject ID
    let validatedData: ReturnType<typeof validateSubjectDelete>;
    try {
      validatedData = validateSubjectDelete({ subjectId });
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Invalid subject ID",
          code: "VALIDATION_ERROR",
        };
      }
      throw error;
    }

    // STEP 3: Check subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id: validatedData.subjectId },
    });

    if (!existingSubject || existingSubject.deletedAt) {
      return {
        success: false,
        message: "Subject not found",
        code: "NOT_FOUND",
      };
    }

    // STEP 4: Soft delete subject
    await prisma.subject.update({
      where: { id: validatedData.subjectId },
      data: {
        deletedAt: new Date(),
      },
    });

    // STEP 5: Audit log
    await logAudit(
      authCheck.userId!,
      authCheck.userEmail!,
      authCheck.userRole!,
      "DELETE_SUBJECT",
      {
        subjectId: validatedData.subjectId,
        subjectName: existingSubject.name,
      }
    );

    return {
      success: true,
      message: "Subject deleted successfully",
      data: {
        subjectId: validatedData.subjectId,
      },
    };
  } catch (error) {
    console.error("Delete subject error:", error);
    return {
      success: false,
      message: "Failed to delete subject",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// GET SUBJECT BY ID
// ============================================

/**
 * Get a subject by ID
 *
 * @param subjectId - Subject ID
 * @returns Subject data or error
 */
export async function getSubjectById(subjectId: string): Promise<
  | {
      success: true;
      message: string;
      data: {
        subject: NonNullable<
          Awaited<ReturnType<typeof prisma.subject.findUnique>>
        >;
      };
    }
  | {
      success: false;
      message: string;
      code?: string;
    }
> {
  try {
    // STEP 1: Verify session and permission
    const authCheck = await verifySessionAndPermission({
      subject: ["view"],
    });

    if (!authCheck.success) {
      return {
        success: false,
        message: authCheck.message || "Authentication failed",
        code: "FORBIDDEN",
      };
    }

    // STEP 2: Fetch subject
    const subject = await prisma.subject.findUnique({
      where: {
        id: subjectId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            questions: true,
            exams: true,
          },
        },
      },
    });

    if (!subject) {
      return {
        success: false,
        message: "Subject not found",
        code: "NOT_FOUND",
      };
    }

    return {
      success: true,
      message: "Subject retrieved successfully",
      data: { subject },
    };
  } catch (error) {
    console.error("Get subject by ID error:", error);
    return {
      success: false,
      message: "Failed to retrieve subject",
      code: "INTERNAL_ERROR",
    };
  }
}
