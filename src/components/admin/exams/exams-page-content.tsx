"use client";

import { useSearchParams } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  FileEdit,
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
import { ExamsTable } from "@/components/admin/exams/exam-data-table";
import { ExamsFilters } from "@/components/admin/exams/exam-filter";
import { useExams, useExamStats } from "@/hooks/use-exams";
import type { ExamListQuery } from "@/types/admin";
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

function StatsCards() {
  const { data, isLoading } = useExamStats();

  const stats = data?.data || {
    totalExams: 0,
    publishedExams: 0,
    draftExams: 0,
    totalQuestions: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Exams"
        value={stats.totalExams}
        description="All exams in the system"
        icon={FileText}
        isLoading={isLoading}
      />
      <StatsCard
        title="Published Exams"
        value={stats.publishedExams}
        description="Currently available to users"
        icon={CheckCircle2}
        isLoading={isLoading}
      />
      <StatsCard
        title="Draft Exams"
        value={stats.draftExams}
        description="Exams in draft status"
        icon={FileEdit}
        isLoading={isLoading}
      />
      <StatsCard
        title="Total Questions"
        value={stats.totalQuestions}
        description="Questions across all exams"
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
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-8 w-[300px]" />
      </div>
    </div>
  );
}

// ============================================
// MAIN CONTENT COMPONENT
// ============================================

export function ExamsPageContent() {
  const searchParams = useSearchParams();

  // Parse query parameters
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const sortBy = (searchParams.get("sort_by") || "createdAt") as
    | "createdAt"
    | "title"
    | "year"
    | "status";
  const sortOrder = (searchParams.get("sort_order") || "desc") as "asc" | "desc";

  const query: ExamListQuery & { search?: string } = useMemo(
    () => ({
      limit,
      offset,
      status: searchParams.get("status") || undefined,
      exam_type: searchParams.get("exam_type") || undefined,
      subject: searchParams.get("subject") || undefined,
      year: searchParams.get("year")
        ? parseInt(searchParams.get("year")!)
        : undefined,
      sortBy,
      sortOrder,
      search: searchParams.get("search") || undefined,
    }),
    [searchParams, limit, offset, sortBy, sortOrder]
  );

  // Use TanStack Query hook
  const { data, isLoading, isError, error } = useExams(query, {
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
  });

  // Calculate pagination
  const totalPages = data?.data
    ? Math.ceil(data.data.total / (limit || 20))
    : 0;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Manage and organize all exams in the system
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/cp/admin-dashboard/exams/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <StatsCards />

      {/* Main content card */}
      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>Filter, search, and manage exams</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <ExamsFilters />

          {/* Table */}
          <div className="mt-6">
            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <div className="rounded-md border p-8 text-center">
                <p className="text-sm text-destructive">
                  {error?.message || "Failed to load exams"}
                </p>
              </div>
            ) : !data?.success || !data?.data ? (
              <div className="rounded-md border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {data?.message || "Failed to load exams"}
                </p>
              </div>
            ) : (
              <ExamsTable
                exams={data.data.exams}
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
