"use client";

import CreateExamForm from "@/components/admin/exams/exam-form";
import { ExamData, ExamFormData, examToFormData } from "@/types/exam";
import React from "react";

const EditExam = () => {
  // Mock exam data for editing
  const mockExamData: ExamData = {
    exam_id: "exam_1234567890",
    exam_type: "WAEC",
    subject: "Mathematics",
    year: 2024,
    title: "WAEC Mathematics 2024 Mock Exam",
    description:
      "A comprehensive mock exam for WAEC Mathematics 2024. This exam covers all major topics including algebra, geometry, trigonometry, and calculus.",
    duration: 120,
    total_points: 6,
    passing_score: 50,
    max_attempts: 3,
    shuffle_questions: true,
    randomize_options: true,
    is_public: true,
    is_free: false,
    status: "published",
    category: "mock",
    start_date: "2024-01-01T00:00:00.000Z",
    end_date: "2024-12-31T23:59:59.000Z",
    questions: [
      {
        question_id: "q1",
        exam_type: "WAEC",
        year: 2024,
        subject: "Mathematics",
        question_text: "What is the value of x in the equation 2x + 5 = 15?",
        question_type: "multiple_choice",
        question_image: "",
        options: [
          { option_text: "3", option_image: "", is_correct: false },
          { option_text: "5", option_image: "", is_correct: true },
          { option_text: "7", option_image: "", is_correct: false },
          { option_text: "10", option_image: "", is_correct: false },
        ],
        question_point: 2,
        answer_explanation:
          "Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5",
        difficulty_level: "easy",
        tags: ["algebra", "equations"],
        time_limit: 120,
        language: "en",
      },
      {
        question_id: "q2",
        exam_type: "WAEC",
        year: 2024,
        subject: "Mathematics",
        question_text: "Is the square root of 16 equal to 4?",
        question_type: "true_false",
        question_image: "",
        options: [
          { option_text: "True", option_image: "", is_correct: true },
          { option_text: "False", option_image: "", is_correct: false },
        ],
        question_point: 1,
        answer_explanation: "The square root of 16 is 4 because 4 × 4 = 16",
        difficulty_level: "easy",
        tags: ["square roots", "basic math"],
        time_limit: 60,
        language: "en",
      },
      {
        question_id: "q3",
        exam_type: "WAEC",
        year: 2024,
        subject: "Mathematics",
        question_text: "Solve for y: 3y - 7 = 14",
        question_type: "multiple_choice",
        question_image: "",
        options: [
          { option_text: "5", option_image: "", is_correct: false },
          { option_text: "7", option_image: "", is_correct: true },
          { option_text: "9", option_image: "", is_correct: false },
          { option_text: "11", option_image: "", is_correct: false },
        ],
        question_point: 3,
        answer_explanation:
          "Add 7 to both sides: 3y = 21, then divide by 3: y = 7",
        difficulty_level: "medium",
        tags: ["algebra", "linear equations"],
        time_limit: 180,
        language: "en",
      },
    ],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-15T10:30:00.000Z",
  };

  const handleSubmit = async (data: ExamFormData) => {
    console.log("Updating exam:", data);
    console.log("Exam ID:", mockExamData.exam_id);

    // Your API call to update the exam would go here
    // await updateExam(mockExamData.exam_id, data);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6"></div>

      <CreateExamForm
        initialData={examToFormData(mockExamData)}
        onSubmit={handleSubmit}
        isEditing={true}
      />
    </div>
  );
};

export default EditExam;
