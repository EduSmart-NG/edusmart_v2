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
import { BulkFormat } from "./bulk-import";

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

export interface QuestionListQuery {
  exam_type?: string; // WAEC, JAMB, NECO, etc.
  subject?: string; // Mathematics, English, etc.
  year?: number; // 2020, 2021, etc.
  difficulty_level?: string; // easy, medium, hard
  question_type?: string; // multiple_choice, true_false, essay, fill_in_blank
  limit?: number; // Pagination limit (default: 20)
  offset?: number; // Pagination offset (default: 0)
  sortBy?: "createdAt" | "examType" | "subject" | "year"; // Sort field
  sortOrder?: "asc" | "desc"; // Sort direction
  search?: string; // Search across metadata (examType, subject, difficulty)
}

/**
 * Question list response
 * Contains questions with pagination metadata
 */
export interface QuestionListResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    questions: QuestionDecrypted[];
    total: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  };
}

/**
 * Decrypted question with decrypted options
 * Used for admin viewing and editing
 */
export interface QuestionDecrypted {
  id: string;
  examType: string;
  year: number;
  subject: string;
  questionType: string;
  questionText: string; // DECRYPTED
  questionImage: string | null;
  questionPoint: number;
  answerExplanation: string | null; // DECRYPTED
  difficultyLevel: string;
  tags: string[]; // Parsed JSON array
  timeLimit: number | null;
  language: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  options: DecryptedOption[];
}

/**
 * Decrypted question option
 */
export interface DecryptedOption {
  id: string;
  questionId: string;
  optionText: string; // DECRYPTED
  optionImage: string | null;
  isCorrect: boolean;
  orderIndex: number;
}

// ============================================
// IMPORT TYPES
// ============================================

export interface BulkImportRequest {
  format: BulkFormat;
  validateOnly?: boolean; // Preview mode - validate without saving
}

export interface BulkImportProgress {
  stage: "parsing" | "validating" | "saving" | "complete" | "error";
  current: number;
  total: number;
  percentage: number;
  message: string;
}

export interface BulkImportRowError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface BulkImportValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: BulkImportRowError[];
  preview: QuestionBulkRow[];
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    importedCount: number;
    failedCount: number;
    totalRows: number;
    errors?: BulkImportRowError[];
    questionIds?: string[];
  };
}

// ============================================
// EXPORT TYPES
// ============================================

export interface BulkExportQuery {
  format: BulkFormat;
  examType?: string;
  subject?: string;
  year?: number;
  difficultyLevel?: string;
  questionType?: string;
  limit?: number;
  includeDeleted?: boolean;
}

export interface BulkExportProgress {
  stage: "querying" | "decrypting" | "formatting" | "complete" | "error";
  current: number;
  total: number;
  percentage: number;
  message: string;
}

export interface BulkExportResponse {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
    exportedCount: number;
  };
}

// ============================================
// TEMPLATE TYPES
// ============================================

export interface TemplateRequest {
  format: BulkFormat;
  includeSamples?: boolean;
}

export interface TemplateResponse {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  };
}

// ============================================
// QUESTION ROW MAPPING
// ============================================

/**
 * Flattened question row for import/export
 * Maps to CSV/Excel columns
 *
 * Made compatible with Record<string, unknown> for format handlers
 */
export interface QuestionBulkRow extends Record<string, unknown> {
  // Core metadata
  exam_type: string;
  year: number;
  subject: string;
  question_type: string;
  difficulty_level: string;
  language: string;

  // Question content (will be encrypted)
  question_text: string;
  question_image?: string | null;
  question_point: number;
  answer_explanation?: string | null;

  // Tags (comma-separated string or JSON array)
  tags?: string;
  time_limit?: number | null;

  // Options (flattened: option_1_text, option_1_is_correct, etc.)
  option_1_text: string;
  option_1_is_correct: boolean;
  option_1_image?: string | null;

  option_2_text: string;
  option_2_is_correct: boolean;
  option_2_image?: string | null;

  option_3_text?: string | null;
  option_3_is_correct?: boolean;
  option_3_image?: string | null;

  option_4_text?: string | null;
  option_4_is_correct?: boolean;
  option_4_image?: string | null;

  option_5_text?: string | null;
  option_5_is_correct?: boolean;
  option_5_image?: string | null;
}

/**
 * Complete question with options for export
 */
export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

// ============================================
// PROCESSOR TYPES
// ============================================

export interface BulkProcessorOptions {
  batchSize?: number; // Records per batch (default: 50)
  onProgress?: (progress: BulkImportProgress | BulkExportProgress) => void;
  validateOnly?: boolean;
}

export interface BulkProcessorResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: BulkImportRowError[];
  data?: unknown[];
}
