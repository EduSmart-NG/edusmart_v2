"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers as getHeaders } from "next/headers";
import { hasPermission } from "@/lib/rbac/utils";
import { decryptQuestion } from "@/lib/utils/question-decrypt";
import type { QuestionListResponse } from "@/types/question-api";
import { Prisma } from "@/generated/prisma";
import { FilterOptions } from "@/types/bulk-import";

export async function getExportFilterOptions(): Promise<FilterOptions> {
  try {
    const headersList = await getHeaders();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return {
        subjects: [],
        examTypes: [],
        years: [],
      };
    }

    const hasExportPermission = await hasPermission({
      question: ["export"],
    });

    if (!hasExportPermission) {
      return {
        subjects: [],
        examTypes: [],
        years: [],
      };
    }

    const [subjects, examTypes, years] = await Promise.all([
      prisma.question.findMany({
        where: { deletedAt: null },
        select: { subject: true },
        distinct: ["subject"],
        orderBy: { subject: "asc" },
      }),
      prisma.question.findMany({
        where: { deletedAt: null },
        select: { examType: true },
        distinct: ["examType"],
        orderBy: { examType: "asc" },
      }),
      prisma.question.findMany({
        where: { deletedAt: null },
        select: { year: true },
        distinct: ["year"],
        orderBy: { year: "desc" },
      }),
    ]);

    return {
      subjects: subjects.map((s) => s.subject),
      examTypes: examTypes.map((e) => e.examType),
      years: years.map((y) => y.year),
    };
  } catch (error) {
    console.error("Failed to get filter options:", error);
    return {
      subjects: [],
      examTypes: [],
      years: [],
    };
  }
}

interface PreviewQuery {
  subjects?: string[];
  examTypes?: string[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  status?: "active" | "inactive" | "all";
  difficulty?: string[];
  page: number;
  pageSize: number;
}

export async function getFilteredQuestionsPreview(
  query: PreviewQuery
): Promise<QuestionListResponse> {
  try {
    const headersList = await getHeaders();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const hasExportPermission = await hasPermission({
      question: ["export"],
    });

    if (!hasExportPermission) {
      return {
        success: false,
        message: "Insufficient permissions",
        code: "FORBIDDEN",
      };
    }

    const where: Prisma.QuestionWhereInput = {};

    if (query.status === "active") {
      where.deletedAt = null;
    } else if (query.status === "inactive") {
      where.deletedAt = { not: null };
    }

    if (query.subjects && query.subjects.length > 0) {
      where.subject = { in: query.subjects };
    }

    if (query.examTypes && query.examTypes.length > 0) {
      where.examType = { in: query.examTypes };
    }

    if (query.yearFrom || query.yearTo) {
      where.year = {};
      if (query.yearFrom) where.year.gte = query.yearFrom;
      if (query.yearTo) where.year.lte = query.yearTo;
    }

    if (query.difficulty && query.difficulty.length > 0) {
      where.difficultyLevel = { in: query.difficulty };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
          },
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.question.count({ where }),
    ]);

    // Decrypt questions using the same approach as exam upload
    const decryptedQuestions = questions
      .map((q) => {
        try {
          const decrypted = decryptQuestion(q);
          return {
            ...decrypted,
            tags: Array.isArray(decrypted.tags)
              ? decrypted.tags
              : JSON.parse(decrypted.tags as string),
          };
        } catch (error) {
          console.error(`Failed to decrypt question ${q.id}:`, error);
          return null;
        }
      })
      .filter((q): q is NonNullable<typeof q> => q !== null);

    return {
      success: true,
      data: {
        questions: decryptedQuestions,
        total,
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
        hasMore: total > query.page * query.pageSize,
      },
    };
  } catch (error) {
    console.error("Failed to get filtered questions:", error);
    return {
      success: false,
      message: "Failed to load questions",
      code: "INTERNAL_ERROR",
    };
  }
}
