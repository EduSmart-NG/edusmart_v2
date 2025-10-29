import type { Metadata } from "next";
import { ExamsPageContent } from "@/components/admin/exams/exams-page-content";

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: "Exams Management | Admin Dashboard",
  description: "Manage exams, questions, and exam settings",
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function AdminExamsPage() {
  return <ExamsPageContent />;
}
