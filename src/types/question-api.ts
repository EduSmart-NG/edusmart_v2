/**
 * Question Upload API Type Definitions
 *
 * TypeScript interfaces for the question upload API endpoint.
 * These types ensure type safety across the entire upload flow.
 *
 * @module types/question-api
 */

import type { Question, QuestionOption } from "@/generated/prisma";
import type { QuestionUploadInput } from "@/lib/validations/question";

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Complete question upload request data
 * Extends validation schema with runtime metadata
 */
export interface QuestionUploadRequest extends QuestionUploadInput {
  has_question_image: boolean;
}

/**
 * File upload metadata
 * Tracks which options have images
 */
export interface FileUploadMetadata {
  questionImage?: File;
  optionImages: Map<number, File>; // Key: order_index, Value: File
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Successful upload response
 */
export interface QuestionUploadSuccess {
  success: true;
  message: string;
  data: {
    questionId: string;
    question: QuestionWithOptions;
  };
}

/**
 * Upload error response
 */
export interface QuestionUploadError {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string>; // Field-level validation errors
}

/**
 * Union type for all possible responses
 */
export type QuestionUploadResponse =
  | QuestionUploadSuccess
  | QuestionUploadError;

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Question with its options (from database)
 */
export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

/**
 * Question creation data for Prisma
 */
export interface QuestionCreateData {
  id?: string; // Optional, Prisma will generate if not provided
  examType: string;
  year: number;
  subject: string;
  questionType: string;
  questionText: string;
  questionImage: string | null;
  questionPoint: number;
  answerExplanation: string | null;
  difficultyLevel: string;
  tags: string[]; // JSON array stored as string
  timeLimit: number | null;
  language: string;
  createdBy: string; // User ID
  options: {
    create: QuestionOptionCreateData[];
  };
}

/**
 * Option creation data for Prisma
 */
export interface QuestionOptionCreateData {
  id?: string;
  optionText: string;
  optionImage: string | null;
  isCorrect: boolean;
  orderIndex: number;
}

// ============================================
// INTERNAL PROCESSING TYPES
// ============================================

/**
 * Upload context for processing
 * Contains all data needed during upload
 */
export interface UploadContext {
  userId: string;
  userEmail: string;
  userRole: string;
  questionData: QuestionUploadInput;
  uploadedFiles: UploadedFileInfo[];
}

/**
 * Information about an uploaded file
 */
export interface UploadedFileInfo {
  type: "question" | "option";
  orderIndex?: number; // For option images
  relativePath: string; // Path stored in database
  publicUrl: string; // URL for frontend
}

/**
 * Rollback context for error handling
 */
export interface RollbackContext {
  questionId?: string;
  uploadedFiles: string[]; // Relative paths to delete
}

// ============================================
// AUDIT LOG TYPES
// ============================================

/**
 * Question upload audit log entry
 */
export interface QuestionUploadAuditLog {
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: "QUESTION_UPLOAD";
  questionId: string;
  examType: string;
  year: number;
  subject: string;
  hasQuestionImage: boolean;
  optionImagesCount: number;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage?: string;
}

// ============================================
// CLIENT-SIDE TYPES
// ============================================

/**
 * Client-side upload payload
 * What the frontend sends to the API
 */
export interface ClientUploadPayload {
  data: QuestionUploadInput; // JSON data
  questionImage?: File;
  optionImages?: Record<number, File>; // Key: order_index
}

/**
 * Upload progress state (for UI)
 */
export interface UploadProgress {
  stage:
    | "validating"
    | "uploading_files"
    | "saving_database"
    | "complete"
    | "error";
  progress: number; // 0-100
  message: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Extract specific error codes for type safety
 */
export type QuestionUploadErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "UPLOAD_FAILED"
  | "DATABASE_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

/**
 * Type guard for success response
 */
export function isUploadSuccess(
  response: QuestionUploadResponse
): response is QuestionUploadSuccess {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isUploadError(
  response: QuestionUploadResponse
): response is QuestionUploadError {
  return response.success === false;
}
