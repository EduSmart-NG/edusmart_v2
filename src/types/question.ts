// Central types file for exam-related types

export interface QuestionOption {
  option_text: string;
  option_image: string;
  is_correct: boolean;
}

export interface QuestionFormData {
  exam_type: string;
  year: number;
  subject: string;
  question_type: string;
  question_text: string;
  question_image: string;
  options: QuestionOption[];
  question_point: number;
  answer_explanation: string;
  difficulty_level: string;
  tags: string[];
  time_limit: number | null;
  language: string;
}

// Initial data interface for form (all values are strings as they come from inputs)
export interface InitialFormData {
  exam_type?: string;
  year?: string;
  subject?: string;
  question_type?: string;
  question_text?: string;
  question_point?: string;
  answer_explanation?: string;
  difficulty_level?: string;
  tags?: string;
  time_limit?: string;
  question_image?: string;
  options?: QuestionOption[];
}

// Full question data from API (includes question_id and all fields)
export interface QuestionData extends QuestionFormData {
  question_id: string;
}

// Helper function to convert QuestionData to InitialFormData
export function questionToFormData(question: QuestionData): InitialFormData {
  return {
    exam_type: question.exam_type,
    year: question.year.toString(),
    subject: question.subject,
    question_type: question.question_type,
    question_text: question.question_text,
    question_point: question.question_point.toString(),
    answer_explanation: question.answer_explanation,
    difficulty_level: question.difficulty_level,
    tags: question.tags.join(", "),
    time_limit: question.time_limit?.toString() || "",
    question_image: question.question_image,
    options: question.options,
  };
}

// Internal form state for option with file handling
export interface OptionFormState {
  option_text: string;
  option_image: File | null;
  option_image_preview: string;
  is_correct: boolean;
}

// Props interface for the AddQuestionForm component
export interface AddQuestionFormProps {
  initialData?: InitialFormData;
  onSubmit?: (data: QuestionFormData, addAnother: boolean) => Promise<void>;
}
