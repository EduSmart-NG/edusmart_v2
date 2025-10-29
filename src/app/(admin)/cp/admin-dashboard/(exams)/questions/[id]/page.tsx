import { Metadata } from "next";
import { EditQuestionPageContent } from "@/components/admin/exams/edit-question-page-content";

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: "Edit Question",
  description: "Edit exam question",
};

// ============================================
// PAGE COMPONENT
// ============================================

export default function QuestionDetailPage() {
  return <EditQuestionPageContent />;
}
