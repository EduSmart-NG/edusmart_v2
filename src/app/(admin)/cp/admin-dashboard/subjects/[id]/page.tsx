import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getSubjectById } from "@/lib/actions/subjects";
import SubjectForm from "@/components/admin/exams/subjects/subject-form";

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

  // Fetch subject for metadata
  const result = await getSubjectById(id);

  if (!result.success || !result.data) {
    return {
      title: "Subject Not Found",
      description: "The requested subject could not be found",
    };
  }

  const { subject } = result.data;

  return {
    title: `Edit ${subject.name}`,
    description: `Edit subject: ${subject.name} (${subject.code || "No code"})`,
  };
}

// ============================================
// PAGE COMPONENT
// ============================================

export default async function EditSubjectPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch subject data
  const result = await getSubjectById(id);

  // Handle not found
  if (!result.success || !result.data) {
    notFound();
  }

  const { subject } = result.data;

  // Transform subject data to form format
  const initialData = {
    name: subject.name,
    code: subject.code || "",
    description: subject.description || "",
    isActive: subject.isActive,
  };

  return (
    <div className="container mx-auto py-8">
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-muted-foreground mt-2">
          {subject.name} {subject.code && `• ${subject.code}`} •{" "}
          {subject.isActive ? "Active" : "Inactive"}
        </p>
      </div>

      {/* Edit Form */}
      <SubjectForm
        initialData={initialData}
        isEditing={true}
        subjectId={subject.id}
      />
    </div>
  );
}
