/**
 * Admin Exams Listing Page - Server Component with URL-based filtering
 *
 * ARCHITECTURE:
 * - Server Component for SEO and performance
 * - URL search params for state management (shareable, bookmarkable)
 * - Server-side filtering, sorting, and pagination
 * - Streaming with Suspense for optimal loading states
 * - Parallel data fetching for stats and table
 *
 * MIGRATION NOTES:
 * - Removed TanStack React Table (unnecessary for server-side operations)
 * - All state now lives in URL (searchParams)
 * - Filters are applied server-side via listExams()
 * - Table data is paginated and only current page is fetched
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import {
  FileText,
  CheckCircle2,
  FileEdit,
  HelpCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamsTable } from "@/components/admin/exams/exam-data-table";
import { ExamsFilters } from "@/components/admin/exams/exam-filter";
import { listExams, getExamStats } from "@/lib/actions/exam-upload";
import type { ExamListQuery } from "@/types/admin";
import Link from "next/link";

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: "Exams Management | Admin Dashboard",
  description: "Manage exams, questions, and exam settings",
};

// ============================================
// TYPES
// ============================================

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    status?: string;
    exam_type?: string;
    subject?: string;
    year?: string;
    sort_by?: string;
    sort_order?: string;
    search?: string;
  }>;
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
  const result = await getExamStats();

  if (!result.success || !result.data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Failed to load statistics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Exams"
        value={stats.totalExams}
        description="All exams in the system"
        icon={FileText}
      />
      <StatsCard
        title="Published Exams"
        value={stats.publishedExams}
        description="Currently available to users"
        icon={CheckCircle2}
      />
      <StatsCard
        title="Draft Exams"
        value={stats.draftExams}
        description="Exams in draft status"
        icon={FileEdit}
      />
      <StatsCard
        title="Total Questions"
        value={stats.totalQuestions}
        description="Questions across all exams"
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
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-8 w-[300px]" />
      </div>
    </div>
  );
}

// ============================================
// EXAMS TABLE WRAPPER
// ============================================

async function ExamsTableWrapper({
  searchParams,
}: {
  searchParams: ExamListQuery & { search?: string };
}) {
  const result = await listExams(searchParams);

  if (!result.success || !result.data) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {result.message || "Failed to load exams"}
        </p>
      </div>
    );
  }

  const { exams, total, limit, offset } = result.data;
  const currentPage = Math.floor((offset || 0) / (limit || 20)) + 1;
  const totalPages = Math.ceil(total / (limit || 20));

  return (
    <ExamsTable
      exams={exams}
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

export default async function AdminExamsPage({ searchParams }: PageProps) {
  // Parse search params
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const offset = (page - 1) * limit;

  // Build query for server action
  const sortBy = params.sort_by as
    | "createdAt"
    | "title"
    | "year"
    | "status"
    | undefined;
  const sortOrder = params.sort_order as "asc" | "desc" | undefined;

  const query: ExamListQuery & { search?: string } = {
    limit,
    offset,
    status: params.status,
    exam_type: params.exam_type,
    subject: params.subject,
    year: params.year ? parseInt(params.year) : undefined,
    sortBy: sortBy || "createdAt",
    sortOrder: sortOrder || "desc",
    search: params.search,
  };

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

      {/* Stats cards with parallel loading */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Main content card */}
      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>Filter, search, and manage exams</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <ExamsFilters />

          {/* Table with streaming */}
          <div className="mt-6">
            <Suspense fallback={<TableSkeleton />}>
              <ExamsTableWrapper searchParams={query} />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
