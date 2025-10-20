import { notFound } from "next/navigation";
import { Metadata } from "next";
import CreateExamForm from "@/components/admin/exams/exam-form";
import { getExamById } from "@/lib/actions/exam-upload";

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

  // Fetch exam for metadata
  const result = await getExamById(id);

  if (!result.success || !result.data) {
    return {
      title: "Exam Not Found | Admin Dashboard",
      description: "The requested exam could not be found",
    };
  }

  const { exam } = result.data;

  return {
    title: `${exam.title.charAt(0).toUpperCase() + exam.title.slice(1)}`,
    description: `Edit exam: ${exam.title} - ${exam.examType} ${exam.subject} ${exam.year}`,
  };
}

// ============================================
// PAGE COMPONENT
// ============================================

export default async function ExamDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch exam data
  const result = await getExamById(id);

  // Handle not found
  if (!result.success || !result.data) {
    notFound();
  }

  const { exam } = result.data;

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
    start_date: exam.startDate ? exam.startDate.toISOString() : "",
    end_date: exam.endDate ? exam.endDate.toISOString() : "",
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
