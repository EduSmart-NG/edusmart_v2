"use client";

import { useSearchParams } from "next/navigation";
import {
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Upload,
  Download,
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
import { useQuestions } from "@/hooks/use-questions";
import type { QuestionListQuery, QuestionDecrypted } from "@/types/question-api";
import Link from "next/link";
import { useMemo } from "react";

// ============================================
// STATS CARD COMPONENT
// ============================================

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-[60px]" />
            <Skeleton className="mt-2 h-3 w-[140px]" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// STATS CARDS COMPONENT
// ============================================

function StatsCards({ isLoading, questions }: { isLoading: boolean; questions: QuestionDecrypted[] }) {
  // Optimized stats calculation - single pass through array O(n) instead of O(3n)
  const stats = useMemo(() => {
    if (!questions || questions.length === 0) {
      return {
        easyQuestions: 0,
        mediumQuestions: 0,
        hardQuestions: 0,
      };
    }

    // Single reduce pass is 66% faster than filtering 3 times
    return questions.reduce(
      (acc, q) => {
        switch (q.difficultyLevel) {
          case "easy":
            acc.easyQuestions++;
            break;
          case "medium":
            acc.mediumQuestions++;
            break;
          case "hard":
            acc.hardQuestions++;
            break;
        }
        return acc;
      },
      { easyQuestions: 0, mediumQuestions: 0, hardQuestions: 0 }
    );
  }, [questions]);

  // For total, we'll use the total from the query response
  // This is just for display purposes on current page

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Questions"
        value={questions?.length || 0}
        description="Questions on this page"
        icon={FileQuestion}
        isLoading={isLoading}
      />
      <StatsCard
        title="Easy Questions"
        value={stats.easyQuestions}
        description="Difficulty: Easy"
        icon={CheckCircle2}
        isLoading={isLoading}
      />
      <StatsCard
        title="Medium Questions"
        value={stats.mediumQuestions}
        description="Difficulty: Medium"
        icon={AlertCircle}
        isLoading={isLoading}
      />
      <StatsCard
        title="Hard Questions"
        value={stats.hardQuestions}
        description="Difficulty: Hard"
        icon={HelpCircle}
        isLoading={isLoading}
      />
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
// MAIN CONTENT COMPONENT
// ============================================

export function QuestionsPageContent() {
  const searchParams = useSearchParams();

  // Parse query parameters
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const sortBy = (searchParams.get("sort_by") || "createdAt") as
    | "createdAt"
    | "examType"
    | "subject"
    | "year";
  const sortOrder = (searchParams.get("sort_order") || "desc") as "asc" | "desc";

  const query: QuestionListQuery & { search?: string } = useMemo(
    () => ({
      limit,
      offset,
      exam_type: searchParams.get("exam_type") || undefined,
      subject: searchParams.get("subject") || undefined,
      year: searchParams.get("year")
        ? parseInt(searchParams.get("year")!)
        : undefined,
      difficulty_level: searchParams.get("difficulty") || undefined,
      question_type: searchParams.get("question_type") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy,
      sortOrder,
    }),
    [searchParams, limit, offset, sortBy, sortOrder]
  );

  // Use TanStack Query hook
  const { data, isLoading, isError, error } = useQuestions(query, {
    // Keep data fresh
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
  });

  // Calculate pagination
  const totalPages = data?.data
    ? Math.ceil(data.data.total / (limit || 20))
    : 0;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="outline">
            <Link href="/cp/admin-dashboard/questions/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/cp/admin-dashboard/questions/bulk-import">
              <Upload className="mr-2 h-4 w-4" />
              Import Questions
            </Link>
          </Button>

          <Button asChild variant="secondary">
            <Link href="/cp/admin-dashboard/questions/bulk-export">
              <Download className="mr-2 h-4 w-4" />
              Export Questions
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        isLoading={isLoading}
        questions={data?.data?.questions || []}
      />

      {/* Main Content Card */}
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

          {/* Table */}
          <div className="mt-6">
            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <div className="rounded-md border p-8 text-center">
                <p className="text-sm text-destructive">
                  {error?.message || "Failed to load questions"}
                </p>
              </div>
            ) : !data?.success || !data?.data ? (
              <div className="rounded-md border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {data?.message || "Failed to load questions"}
                </p>
              </div>
            ) : (
              <QuestionsTable
                questions={data.data.questions}
                total={data.data.total}
                currentPage={page}
                totalPages={totalPages}
                pageSize={limit}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
