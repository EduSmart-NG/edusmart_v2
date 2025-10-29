import { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditExamPageContent } from "@/components/admin/exams/edit-exam-page-content";
import { getExamById } from "@/lib/actions/exam-upload";

// ============================================
// METADATA
// ============================================

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const result = await getExamById(params.id);

    if (!result.success || !result.data) {
      notFound();
    }

    const examTitle = result.data.exam.title;
    return {
      title: `${examTitle}`,
      description: `Edit ${examTitle} exam details and settings`,
    };
  } catch (error) {
    console.log("Error fetching exam for metadata:", error);
    notFound();
  }
}

// ============================================
// PAGE COMPONENT
// ============================================

export default async function ExamDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Verify exam exists before rendering
  const result = await getExamById(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <EditExamPageContent />;
}
