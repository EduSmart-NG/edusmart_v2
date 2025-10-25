import SubjectForm from "@/components/admin/exams/subjects/subject-form";

export default function NewSubjectPage() {
  return (
    <div className="container mx-auto py-8">
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-muted-foreground mt-2">
          Add a new subject to the question bank
        </p>
      </div>

      {/* Form */}
      <SubjectForm />
    </div>
  );
}
