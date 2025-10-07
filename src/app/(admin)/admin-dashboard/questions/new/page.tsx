"use client";

import AddQuestionForm from "@/components/admin/exams/question-form";
import { QuestionFormData } from "@/types/question";

const NewQuestion = () => {
  const handleSubmit = async (data: QuestionFormData, addAnother: boolean) => {
    // Your API call here
    console.log("Submitting:", data, "Add another:", addAnother);
  };

  return (
    <div>
      <AddQuestionForm onSubmit={handleSubmit} />
    </div>
  );
};

export default NewQuestion;
