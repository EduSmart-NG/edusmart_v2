import { Suspense } from "react";
import type { Metadata } from "next";
import {
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { QuestionsTable } from "@/components/admin/exams/question-data-table";
import { QuestionsFilters } from "@/components/admin/exams/question-filter";
import { listQuestions } from "@/lib/actions/question-upload";
import type { QuestionListQuery } from "@/types/question-api";
import Link from "next/link";
import prisma from "@/lib/prisma";

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: "Questions Management | Admin Dashboard",
  description: "Manage exam questions and question bank",
};

// ============================================
// TYPES
// ============================================

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    exam_type?: string;
    subject?: string;
    year?: string;
    difficulty?: string;
    question_type?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }>;
}

// ============================================
// STATS FUNCTIONS
// ============================================

async function getQuestionStats() {
  const [totalQuestions, easyQuestions, mediumQuestions, hardQuestions] =
    await Promise.all([
      prisma.question.count({ where: { deletedAt: null } }),
      prisma.question.count({
        where: { deletedAt: null, difficultyLevel: "easy" },
      }),
      prisma.question.count({
        where: { deletedAt: null, difficultyLevel: "medium" },
      }),
      prisma.question.count({
        where: { deletedAt: null, difficultyLevel: "hard" },
      }),
    ]);

  return {
    totalQuestions,
    easyQuestions,
    mediumQuestions,
    hardQuestions,
  };
}

// ============================================
// STATS CARD COMPONENT
// ============================================

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// ============================================
// STATS CARDS COMPONENT
// ============================================

async function StatsCards() {
  const stats = await getQuestionStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Questions"
        value={stats.totalQuestions}
        description="All questions in bank"
        icon={FileQuestion}
      />
      <StatsCard
        title="Easy Questions"
        value={stats.easyQuestions}
        description="Difficulty: Easy"
        icon={CheckCircle2}
      />
      <StatsCard
        title="Medium Questions"
        value={stats.mediumQuestions}
        description="Difficulty: Medium"
        icon={AlertCircle}
      />
      <StatsCard
        title="Hard Questions"
        value={stats.hardQuestions}
        description="Difficulty: Hard"
        icon={HelpCircle}
      />
    </div>
  );
}

// ============================================
// STATS SKELETON
// ============================================

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-[100px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[60px]" />
            <Skeleton className="mt-2 h-3 w-[140px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// TABLE SKELETON
// ============================================

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// QUESTIONS TABLE WRAPPER
// ============================================

async function QuestionsTableWrapper({
  searchParams,
}: {
  searchParams: QuestionListQuery & { search?: string };
}) {
  const result = await listQuestions(searchParams);

  if (!result.success || !result.data) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {result.message || "Failed to load questions"}
        </p>
      </div>
    );
  }

  const { questions, total, limit, offset } = result.data;
  const currentPage = Math.floor((offset || 0) / (limit || 20)) + 1;
  const totalPages = Math.ceil(total / (limit || 20));

  return (
    <QuestionsTable
      questions={questions}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={limit || 20}
    />
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default async function AdminQuestionsPage({ searchParams }: PageProps) {
  // Parse search params
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const offset = (page - 1) * limit;

  // Build query for server action
  const sortBy = params.sort_by as
    | "createdAt"
    | "examType"
    | "subject"
    | "year"
    | undefined;
  const sortOrder = params.sort_order as "asc" | "desc" | undefined;

  const query: QuestionListQuery & { search?: string } = {
    limit,
    offset,
    exam_type: params.exam_type,
    subject: params.subject,
    year: params.year ? parseInt(params.year) : undefined,
    difficulty_level: params.difficulty,
    question_type: params.question_type,
    search: params.search,
    sortBy: sortBy || "createdAt",
    sortOrder: sortOrder || "desc",
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Manage and organize question bank
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/cp/admin-dashboard/questions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Link>
        </Button>
      </div>

      {/* Stats cards with parallel loading */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Main content card */}
      <Card>
        <CardHeader>
          <CardTitle>All Questions</CardTitle>
          <CardDescription>
            Filter, search, and manage questions in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <QuestionsFilters />

          {/* Table with streaming */}
          <div className="mt-6">
            <Suspense fallback={<TableSkeleton />}>
              <QuestionsTableWrapper searchParams={query} />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
