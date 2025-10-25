/**
 * Subjects List Page
 *
 * Server component page for listing all subjects with filters and stats.
 * Follows the same pattern as questions/page.tsx
 *
 * @module app/(admin)/cp/admin-dashboard/(subjects)/subjects/page
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  FileQuestion,
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
import { listSubjects } from "@/lib/actions/subjects";
import Link from "next/link";
import prisma from "@/lib/prisma";
import type { SubjectListRequest } from "@/types/subject";
import { SubjectsTable } from "@/components/admin/exams/subjects/subjects-data-table";
import { SubjectsFilters } from "@/components/admin/exams/subjects/subjects-list-filter";

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: "Subjects",
  description: "Manage exam subjects",
};

// ============================================
// TYPES
// ============================================

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    isActive?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

// ============================================
// STATS FUNCTIONS
// ============================================

async function getSubjectStats() {
  const [totalSubjects, activeSubjects, inactiveSubjects, totalQuestions] =
    await Promise.all([
      prisma.subject.count({ where: { deletedAt: null } }),
      prisma.subject.count({
        where: { deletedAt: null, isActive: true },
      }),
      prisma.subject.count({
        where: { deletedAt: null, isActive: false },
      }),
      prisma.question.count({ where: { deletedAt: null } }),
    ]);

  return {
    totalSubjects,
    activeSubjects,
    inactiveSubjects,
    totalQuestions,
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
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// ============================================
// STATS SECTION
// ============================================

async function SubjectsStats() {
  const stats = await getSubjectStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Subjects"
        value={stats.totalSubjects}
        description="All subjects in the system"
        icon={BookOpen}
      />
      <StatsCard
        title="Active Subjects"
        value={stats.activeSubjects}
        description="Currently enabled subjects"
        icon={CheckCircle2}
      />
      <StatsCard
        title="Inactive Subjects"
        value={stats.inactiveSubjects}
        description="Disabled subjects"
        icon={XCircle}
      />
      <StatsCard
        title="Total Questions"
        value={stats.totalQuestions}
        description="Questions across all subjects"
        icon={FileQuestion}
      />
    </div>
  );
}

// ============================================
// SUBJECTS TABLE WRAPPER
// ============================================

async function SubjectsTableWrapper({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse query parameters
  const query: SubjectListRequest = {
    limit: params.limit ? parseInt(params.limit) : 50,
    offset: params.page
      ? (parseInt(params.page) - 1) * parseInt(params.limit || "50")
      : 0,
    search: params.search,
    isActive:
      params.isActive === "true"
        ? true
        : params.isActive === "false"
          ? false
          : undefined,
    sortBy: (params.sortBy as "name" | "createdAt" | "updatedAt") || "name",
    sortOrder: (params.sortOrder as "asc" | "desc") || "asc",
  };

  // Fetch subjects
  const result = await listSubjects(query);

  if (!result.success) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{result.message}</p>
      </Card>
    );
  }

  const { subjects, total } = result.data;

  return (
    <SubjectsTable
      subjects={subjects}
      total={total}
      currentPage={params.page ? parseInt(params.page) : 1}
      pageSize={query.limit}
    />
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default async function SubjectsPage(props: PageProps) {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Manage subjects for the exam question bank
          </p>
        </div>
        <Link href="/cp/admin-dashboard/subjects/new">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Subject
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32 mt-1" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <SubjectsStats />
      </Suspense>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Subjects</CardTitle>
          <CardDescription>
            Search and filter subjects by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectsFilters />
        </CardContent>
      </Card>

      {/* Table */}
      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        }
      >
        <SubjectsTableWrapper searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
