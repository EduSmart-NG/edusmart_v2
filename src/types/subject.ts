/**
 * Subject API Type Definitions
 *
 * TypeScript interfaces for the subject management API.
 * These types ensure type safety across the entire subject management flow.
 *
 * @module types/subject-api
 */

import type { Subject } from "@/generated/prisma";
import type {
  SubjectCreateInput,
  SubjectUpdateInput,
  SubjectListInput,
  SubjectDeleteInput,
} from "@/lib/validations/subject";

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Complete subject creation request data
 */
export type SubjectCreateRequest = SubjectCreateInput;

/**
 * Subject update request data
 */
export interface SubjectUpdateRequest extends SubjectUpdateInput {
  subjectId: string;
}

/**
 * Subject list request data
 */
export type SubjectListRequest = SubjectListInput;

/**
 * Subject delete request data
 */
export type SubjectDeleteRequest = SubjectDeleteInput;

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Successful subject creation response
 */
export interface SubjectCreateSuccess {
  success: true;
  message: string;
  data: {
    subjectId: string;
    subject: Subject;
  };
}

/**
 * Subject creation error response
 */
export interface SubjectCreateError {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string>; // Field-level validation errors
}

/**
 * Union type for subject creation responses
 */
export type SubjectCreateResponse = SubjectCreateSuccess | SubjectCreateError;

/**
 * Successful subject list response
 */
export interface SubjectListSuccess {
  success: true;
  message: string;
  data: {
    subjects: SubjectWithStats[];
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Subject list error response
 */
export interface SubjectListError {
  success: false;
  message: string;
  code?: string;
  error?: string;
}

/**
 * Union type for subject list responses
 */
export type SubjectListResponse = SubjectListSuccess | SubjectListError;

/**
 * Successful subject update response
 */
export interface SubjectUpdateSuccess {
  success: true;
  message: string;
  data: {
    subject: Subject;
  };
}

/**
 * Subject update error response
 */
export interface SubjectUpdateError {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string>;
}

/**
 * Union type for subject update responses
 */
export type SubjectUpdateResponse = SubjectUpdateSuccess | SubjectUpdateError;

/**
 * Successful subject delete response
 */
export interface SubjectDeleteSuccess {
  success: true;
  message: string;
  data: {
    subjectId: string;
  };
}

/**
 * Subject delete error response
 */
export interface SubjectDeleteError {
  success: false;
  message: string;
  code?: string;
}

/**
 * Union type for subject delete responses
 */
export type SubjectDeleteResponse = SubjectDeleteSuccess | SubjectDeleteError;

// ============================================
// HELPER TYPES
// ============================================

/**
 * Subject with additional statistics
 */
export interface SubjectWithStats extends Subject {
  _count?: {
    questions: number;
    exams: number;
  };
}

/**
 * Subject with relations (for detailed views)
 */
export interface SubjectWithRelations extends Subject {
  questions?: {
    id: string;
    examType: string;
    year: number;
    subject: string;
    questionType: string;
  }[];
  exams?: {
    id: string;
    examType: string;
    year: number;
    title: string;
    status: string;
  }[];
}

/**
 * Subject statistics
 */
export interface SubjectStats {
  totalSubjects: number;
  activeSubjects: number;
  inactiveSubjects: number;
  totalQuestions: number;
  totalExams: number;
  avgQuestionsPerSubject: number;
  avgExamsPerSubject: number;
}

export type SubjectFormData = SubjectCreateInput;

export interface InitialSubjectFormData {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export function subjectToFormData(subject: Subject): InitialSubjectFormData {
  return {
    name: subject.name,
    code: subject.code || "",
    description: subject.description || "",
    isActive: subject.isActive,
  };
}

export interface SubjectFormProps {
  initialData?: InitialSubjectFormData;
  onSubmit?: (data: SubjectFormData, addAnother: boolean) => Promise<void>;
  isEditing?: boolean;
  subjectId?: string;
}
