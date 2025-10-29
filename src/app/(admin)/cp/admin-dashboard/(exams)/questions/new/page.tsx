"use client";

import AddQuestionForm from "@/components/admin/exams/question-form";

const NewQuestion = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <p className="text-muted-foreground mt-2">
          Create a new exam question for your question bank
        </p>
      </div>
      <AddQuestionForm />
    </div>
  );
};

export default NewQuestion;
