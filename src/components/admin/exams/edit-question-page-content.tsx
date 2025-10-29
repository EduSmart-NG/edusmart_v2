"use client";

import { useParams } from "next/navigation";
import AddQuestionForm from "@/components/admin/exams/question-form";
import { useQuestion } from "@/hooks/use-questions";
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
            <h3 className="text-lg font-semibold">Error Loading Question</h3>
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

export function EditQuestionPageContent() {
  const params = useParams();
  const questionId = params.id as string;

  // Fetch question data using TanStack Query
  const { data, isLoading, isError, error } = useQuestion(questionId, {
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
      <ErrorState message={error?.message || "Failed to load question data"} />
    );
  }

  // Not found or unsuccessful response
  if (!data?.success || !data?.data) {
    return <ErrorState message={data?.message || "Question not found"} />;
  }

  const { question } = data.data;

  // Transform question data to form format
  const initialData = {
    exam_type: question.examType,
    subject: question.subject,
    year: question.year.toString(),
    question_type: question.questionType,
    question_text: question.questionText,
    question_image: question.questionImage || "",
    question_point: question.questionPoint.toString(),
    answer_explanation: question.answerExplanation || "",
    difficulty_level: question.difficultyLevel,
    tags: Array.isArray(question.tags) ? question.tags.join(", ") : "",
    time_limit: question.timeLimit?.toString() || "",
    options: question.options.map((opt) => ({
      option_text: opt.optionText,
      option_image: opt.optionImage || "",
      is_correct: opt.isCorrect,
      order_index: opt.orderIndex,
    })),
  };

  return (
    <div className="container mx-auto py-8">
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-muted-foreground mt-2">
          {question.examType} • {question.subject} • {question.year} •{" "}
          {question.questionType.replace("_", " ")}
        </p>
      </div>

      {/* Edit Form */}
      <AddQuestionForm
        initialData={initialData}
        isEditing={true}
        questionId={question.id}
      />
    </div>
  );
}
