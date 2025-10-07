// Central types file for exam-related types

export interface QuestionOption {
  option_text: string;
  option_image: string;
  is_correct: boolean;
}

export interface Question {
  question_id: string;
  exam_type: string;
  year: number;
  subject: string;
  question_text: string;
  question_type: string;
  question_image: string;
  options: QuestionOption[];
  question_point: number;
  answer_explanation: string;
  difficulty_level: string;
  tags: string[];
  time_limit: number | null;
  language: string;
}

export interface ExamFormData {
  exam_type: string;
  subject: string;
  year: number;
  title: string;
  description: string;
  duration: number;
  passing_score: number | null;
  max_attempts: number | null;
  shuffle_questions: boolean;
  randomize_options: boolean;
  is_public: boolean;
  is_free: boolean;
  status: string;
  category: string;
  start_date: string | null;
  end_date: string | null;
  questions: Question[];
}

export interface InitialExamFormData {
  exam_type?: string;
  subject?: string;
  year?: string;
  title?: string;
  description?: string;
  duration?: string;
  passing_score?: string;
  max_attempts?: string;
  shuffle_questions?: boolean;
  randomize_options?: boolean;
  is_public?: boolean;
  is_free?: boolean;
  status?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  questions?: Question[];
}

export interface ExamData extends ExamFormData {
  exam_id: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

// Helper function to convert ExamData to InitialExamFormData
export function examToFormData(exam: ExamData): InitialExamFormData {
  return {
    exam_type: exam.exam_type,
    subject: exam.subject,
    year: exam.year.toString(),
    title: exam.title,
    description: exam.description,
    duration: exam.duration.toString(),
    passing_score: exam.passing_score?.toString() || "",
    max_attempts: exam.max_attempts?.toString() || "",
    shuffle_questions: exam.shuffle_questions,
    randomize_options: exam.randomize_options,
    is_public: exam.is_public,
    is_free: exam.is_free,
    status: exam.status,
    category: exam.category,
    start_date: exam.start_date || "",
    end_date: exam.end_date || "",
    questions: exam.questions,
  };
}

// Props interface for the CreateExamForm component
export interface CreateExamFormProps {
  initialData?: InitialExamFormData;
  onSubmit?: (data: ExamFormData) => Promise<void>;
  isEditing?: boolean;
}
