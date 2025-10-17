/**
 * Exam Upload API Type Definitions
 *
 * TypeScript interfaces for the exam upload API endpoint.
 * These types ensure type safety across the entire exam upload flow.
 *
 * @module types/exam-api
 */

import type { Exam, ExamQuestion, Question } from "@/generated/prisma";
import type {
  ExamUploadInput,
  QuestionSearchInput,
} from "@/lib/validations/exam";

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Complete exam upload request data
 * Extends validation schema with runtime metadata
 */
export interface ExamUploadRequest extends ExamUploadInput {
  question_ids: string[];
}

/**
 * Exam update request data
 */
export interface ExamUpdateRequest extends Partial<ExamUploadInput> {
  exam_id: string;
}

/**
 * Question filters for searching
 * Type alias for QuestionSearchInput
 */
export type QuestionFilters = QuestionSearchInput;

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Successful exam upload response
 */
export interface ExamUploadSuccess {
  success: true;
  message: string;
  data: {
    examId: string;
    exam: ExamWithQuestions;
  };
}

/**
 * Exam upload error response
 */
export interface ExamUploadError {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string>; // Field-level validation errors
}

/**
 * Union type for all possible exam upload responses
 */
export type ExamUploadResponse = ExamUploadSuccess | ExamUploadError;

/**
 * Exam delete response
 */
export interface ExamDeleteSuccess {
  success: true;
  message: string;
}

export type ExamDeleteResponse = ExamDeleteSuccess | ExamUploadError;

/**
 * Exam details response
 */
export interface ExamDetailsSuccess {
  success: true;
  data: {
    exam: ExamWithQuestionsDecrypted;
  };
}

export type ExamDetailsResponse = ExamDetailsSuccess | ExamUploadError;

/**
 * Exam list response
 */
export interface ExamListSuccess {
  success: true;
  data: {
    exams: ExamWithStats[];
    total: number;
    hasMore: boolean;
  };
}

export type ExamListResponse = ExamListSuccess | ExamUploadError;

/**
 * Question search response
 */
export interface QuestionSearchSuccess {
  success: true;
  data: {
    questions: QuestionDecrypted[];
    total: number;
    hasMore: boolean;
  };
}

export type QuestionSearchResponse = QuestionSearchSuccess | ExamUploadError;

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Exam with its questions (from database)
 */
export interface ExamWithQuestions extends Exam {
  questions: (ExamQuestion & {
    question: Question;
  })[];
}

/**
 * Exam with decrypted questions
 */
export interface ExamWithQuestionsDecrypted extends Omit<Exam, "questions"> {
  questions: (ExamQuestion & {
    question: QuestionDecrypted;
  })[];
}

/**
 * Decrypted question with options
 */
export interface QuestionDecrypted {
  id: string;
  examType: string;
  year: number;
  subject: string;
  questionType: string;
  questionText: string; // Decrypted
  questionImage: string | null;
  questionPoint: number;
  answerExplanation: string | null; // Decrypted
  difficultyLevel: string;
  tags: string[];
  timeLimit: number | null;
  language: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  options: QuestionOptionDecrypted[];
}

/**
 * Decrypted question option
 */
export interface QuestionOptionDecrypted {
  id: string;
  questionId: string;
  optionText: string; // Decrypted
  optionImage: string | null;
  isCorrect: boolean;
  orderIndex: number;
}

/**
 * Exam with statistics
 */
export interface ExamWithStats extends Exam {
  questionCount: number;
  totalPoints: number;
}

/**
 * Exam creation data for Prisma
 */
export interface ExamCreateData {
  id?: string;
  examType: string;
  subject: string;
  year: number;
  title: string;
  description: string | null;
  duration: number;
  passingScore: number | null;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  randomizeOptions: boolean;
  isPublic: boolean;
  isFree: boolean;
  status: string;
  category: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdBy: string;
  questions: {
    create: ExamQuestionCreateData[];
  };
}

export interface CreateExamFormProps {
  initialData?: Partial<{
    exam_type: string;
    subject: string;
    year: string;
    title: string;
    description: string;
    duration: string;
    passing_score: string;
    max_attempts: string;
    shuffle_questions: boolean;
    randomize_options: boolean;
    is_public: boolean;
    is_free: boolean;
    status: string;
    category: string;
    start_date: string;
    end_date: string;
    questions: QuestionDecrypted[];
  }>;
  onSubmit?: (data: { examId: string; exam: unknown }) => Promise<void>;
  isEditing?: boolean;
  examId?: string;
}

/**
 * ExamQuestion creation data for Prisma
 */
export interface ExamQuestionCreateData {
  id?: string;
  questionId: string;
  orderIndex: number;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Extract specific error codes for type safety
 */
export type ExamUploadErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INVALID_QUESTIONS"
  | "DATABASE_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "EXAM_NOT_FOUND";

/**
 * Type guard for success response
 */
export function isExamUploadSuccess(
  response: ExamUploadResponse
): response is ExamUploadSuccess {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isExamUploadError(
  response: ExamUploadResponse
): response is ExamUploadError {
  return response.success === false;
}

/**
 * Type guard for question search success
 */
export function isQuestionSearchSuccess(
  response: QuestionSearchResponse
): response is QuestionSearchSuccess {
  return response.success === true;
}
