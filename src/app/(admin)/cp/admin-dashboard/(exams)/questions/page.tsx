import type { Metadata } from "next";
import { QuestionsPageContent } from "@/components/admin/exams/questions-page-content";

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: "Questions",
  description: "Manage exam questions and question bank",
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function AdminQuestionsPage() {
  return <QuestionsPageContent />;
}
