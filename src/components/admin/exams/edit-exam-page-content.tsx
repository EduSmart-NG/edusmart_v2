"use client";

import { useParams } from "next/navigation";
import CreateExamForm from "@/components/admin/exams/exam-form";
import { useExam } from "@/hooks/use-exams";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="mt-2 h-4 w-[400px]" />
      </div>
      <Card className="px-4 md:px-8 py-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================
// ERROR STATE
// ============================================

function ErrorState({ message }: { message: string }) {
  return (
    <div className="container mx-auto py-8">
      <Card className="p-8">
        <div className="flex items-center justify-center flex-col gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Error Loading Exam</h3>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EditExamPageContent() {
  const params = useParams();
  const examId = params.id as string;

  // Fetch exam data using TanStack Query
  const { data, isLoading, isError, error } = useExam(examId, {
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: true,
  });

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState message={error?.message || "Failed to load exam data"} />
    );
  }

  // Not found or unsuccessful response
  if (!data?.success || !data?.data) {
    return <ErrorState message={data?.message || "Exam not found"} />;
  }

  const { exam } = data.data;

  // Transform exam data to form format
  const initialData = {
    exam_type: exam.examType,
    subject: exam.subject,
    year: exam.year.toString(),
    title: exam.title,
    description: exam.description || "",
    duration: exam.duration.toString(),
    passing_score: exam.passingScore?.toString() || "",
    max_attempts: exam.maxAttempts?.toString() || "",
    shuffle_questions: exam.shuffleQuestions,
    randomize_options: exam.randomizeOptions,
    is_public: exam.isPublic,
    is_free: exam.isFree,
    status: exam.status,
    category: exam.category || "",
    start_date: exam.startDate ? new Date(exam.startDate).toISOString() : "",
    end_date: exam.endDate ? new Date(exam.endDate).toISOString() : "",
    questions: exam.questions,
  };

  return (
    <div className="container mx-auto py-8">
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-muted-foreground mt-2">
          {exam.examType} • {exam.subject} • {exam.year}
        </p>
      </div>

      {/* Edit Form */}
      <CreateExamForm
        initialData={initialData}
        isEditing={true}
        examId={exam.id}
      />
    </div>
  );
}
