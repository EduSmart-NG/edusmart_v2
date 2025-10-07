"use client";
import AddQuestionForm from "@/components/admin/exams/question-form";
import {
  QuestionFormData,
  QuestionData,
  questionToFormData,
} from "@/types/question";
import React from "react";

const EditQuestion = () => {
  // Mock initial data for the question being edited
  const mockQuestionData: QuestionData = {
    question_id: "q18",
    exam_type: "JAMB",
    year: 2024,
    subject: "Mathematics",
    question_type: "multiple_choice",
    question_text: "What is the value of tan(45°)?",
    question_image:
      "/avatars/avatar-SZr2GnAi4nMpb5Csx5BHHdFG3bJdkebq-1759675857449.png",
    options: [
      {
        option_text: "0",
        option_image:
          "/avatars/avatar-SZr2GnAi4nMpb5Csx5BHHdFG3bJdkebq-1759675857449.png",
        is_correct: false,
      },
      {
        option_text: "1",
        option_image:
          "/avatars/avatar-SZr2GnAi4nMpb5Csx5BHHdFG3bJdkebq-1759675857449.png",
        is_correct: false,
      },
      {
        option_text: "√2",
        option_image:
          "/avatars/avatar-SZr2GnAi4nMpb5Csx5BHHdFG3bJdkebq-1759675857449.png",
        is_correct: false,
      },
      {
        option_text: "√3",
        option_image:
          "/avatars/avatar-SZr2GnAi4nMpb5Csx5BHHdFG3bJdkebq-1759675857449.png",
        is_correct: true,
      },
    ],
    question_point: 2,
    answer_explanation: "The tangent of 45 degrees equals 1",
    difficulty_level: "easy",
    tags: ["trigonometry"],
    time_limit: null,
    language: "en",
  };

  const handleSubmit = async (data: QuestionFormData, addAnother: boolean) => {
    console.log("Updating question:", data);
    console.log("Add another:", addAnother);
    // await updateQuestion(mockQuestionData.question_id, data);
  };

  return (
    <div>
      <AddQuestionForm
        initialData={questionToFormData(mockQuestionData)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditQuestion;
