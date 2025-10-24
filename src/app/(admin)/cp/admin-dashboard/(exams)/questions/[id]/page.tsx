import { notFound } from "next/navigation";
import { Metadata } from "next";
import AddQuestionForm from "@/components/admin/exams/question-form";
import { getQuestionById } from "@/lib/actions/question-upload";

// ============================================
// TYPES
// ============================================

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// ============================================
// METADATA GENERATION
// ============================================

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  // Fetch question for metadata
  const result = await getQuestionById(id);

  if (!result.success || !result.data) {
    return {
      title: "Question Not Found",
      description: "The requested question could not be found",
    };
  }

  const { question } = result.data;

  return {
    title: `${question.questionText}`,
    description: `Edit question: ${question.examType} ${question.subject} ${question.year} - ${question.questionType}`,
  };
}

// ============================================
// PAGE COMPONENT
// ============================================

export default async function QuestionDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch question data
  const result = await getQuestionById(id);

  // Handle not found
  if (!result.success || !result.data) {
    notFound();
  }

  const { question } = result.data;

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
