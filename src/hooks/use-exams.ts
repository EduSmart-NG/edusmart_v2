"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  listExams,
  getExamStats,
  createExam,
  updateExam,
  deleteExam,
  getExamById,
} from "@/lib/actions/exam-upload";
import type {
  ExamListQuery,
  ExamListResponse,
  ExamStats,
  AdminActionResult,
} from "@/types/admin";
import type {
  ExamUploadResponse,
  ExamDeleteResponse,
  QuestionDecrypted,
} from "@/types/exam-api";
import { toast } from "sonner";

// ============================================
// QUERY KEYS
// ============================================

export const examKeys = {
  all: ["exams"] as const,
  lists: () => [...examKeys.all, "list"] as const,
  list: (filters: ExamListQuery & { search?: string }) =>
    [...examKeys.lists(), filters] as const,
  details: () => [...examKeys.all, "detail"] as const,
  detail: (id: string) => [...examKeys.details(), id] as const,
  stats: () => [...examKeys.all, "stats"] as const,
};

// ============================================
// QUERY: LIST EXAMS
// ============================================

export function useExams(
  query: ExamListQuery & { search?: string },
  options?: Omit<
    UseQueryOptions<AdminActionResult<ExamListResponse>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<AdminActionResult<ExamListResponse>, Error>({
    queryKey: examKeys.list(query),
    queryFn: async () => {
      const result = await listExams(query);
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data during pagination
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    refetchIntervalInBackground: false, // Only when tab is visible
    ...options,
  });
}

// ============================================
// QUERY: GET EXAM STATS
// ============================================

export function useExamStats(
  options?: Omit<
    UseQueryOptions<AdminActionResult<ExamStats>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<AdminActionResult<ExamStats>, Error>({
    queryKey: examKeys.stats(),
    queryFn: async () => {
      const result = await getExamStats();
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    refetchIntervalInBackground: false,
    ...options,
  });
}

// ============================================
// QUERY: GET SINGLE EXAM
// ============================================

// Type for the exam returned by getExamById
type ExamDetail = {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
  questions: QuestionDecrypted[];
};

export function useExam(
  examId: string,
  options?: Omit<
    UseQueryOptions<AdminActionResult<{ exam: ExamDetail }>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<AdminActionResult<{ exam: ExamDetail }>, Error>({
    queryKey: examKeys.detail(examId),
    queryFn: async () => {
      const result = await getExamById(examId);
      return result;
    },
    enabled: !!examId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================
// MUTATION: CREATE EXAM
// ============================================

export function useCreateExam(
  options?: UseMutationOptions<
    ExamUploadResponse,
    Error,
    { data: FormData; recaptchaToken: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    ExamUploadResponse,
    Error,
    { data: FormData; recaptchaToken: string }
  >({
    mutationFn: async ({ data, recaptchaToken }) => {
      return await createExam(data, recaptchaToken);
    },
    onSuccess: (data, variables, context) => {
      if (data.success) {
        // Invalidate and refetch exams list (only active queries)
        queryClient.invalidateQueries({
          queryKey: examKeys.lists(),
          refetchType: "active",
        });

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: examKeys.stats(),
          refetchType: "active",
        });

        toast.success("Exam created successfully!", {
          description: `Exam ID: ${data.data?.examId}`,
          duration: 5000,
        });
      } else {
        // Handle error cases
        handleErrorToast(data);
      }

      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        (
          options.onSuccess as (
            data: ExamUploadResponse,
            variables: { data: FormData; recaptchaToken: string },
            context: unknown
          ) => void
        )(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error("Create exam error:", error);
      toast.error("Unexpected error", {
        description: "Failed to create exam. Please try again.",
        duration: 5000,
      });

      // Call custom onError if provided
      if (options?.onError) {
        (
          options.onError as (
            error: Error,
            variables: { data: FormData; recaptchaToken: string },
            context: unknown
          ) => void
        )(error, variables, context);
      }
    },
    ...options,
  });
}

// ============================================
// MUTATION: UPDATE EXAM
// ============================================

export function useUpdateExam(
  options?: UseMutationOptions<
    ExamUploadResponse,
    Error,
    { examId: string; data: FormData; recaptchaToken: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    ExamUploadResponse,
    Error,
    { examId: string; data: FormData; recaptchaToken: string }
  >({
    mutationFn: async ({ examId, data, recaptchaToken }) => {
      return await updateExam(examId, data, recaptchaToken);
    },
    onSuccess: (data, variables, context) => {
      if (data.success) {
        // Invalidate the specific exam
        queryClient.invalidateQueries({
          queryKey: examKeys.detail(variables.examId),
          refetchType: "active",
        });

        // Invalidate all exams lists (only active queries)
        queryClient.invalidateQueries({
          queryKey: examKeys.lists(),
          refetchType: "active",
        });

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: examKeys.stats(),
          refetchType: "active",
        });

        toast.success("Exam updated successfully!", {
          description: `Exam ID: ${data.data?.examId}`,
          duration: 5000,
        });
      } else {
        // Handle error cases
        handleErrorToast(data);
      }

      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        (
          options.onSuccess as (
            data: ExamUploadResponse,
            variables: { examId: string; data: FormData; recaptchaToken: string },
            context: unknown
          ) => void
        )(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error("Update exam error:", error);
      toast.error("Unexpected error", {
        description: "Failed to update exam. Please try again.",
        duration: 5000,
      });

      // Call custom onError if provided
      if (options?.onError) {
        (
          options.onError as (
            error: Error,
            variables: { examId: string; data: FormData; recaptchaToken: string },
            context: unknown
          ) => void
        )(error, variables, context);
      }
    },
    ...options,
  });
}

// ============================================
// MUTATION: DELETE EXAM
// ============================================

export function useDeleteExam(
  options?: UseMutationOptions<ExamDeleteResponse, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation<ExamDeleteResponse, Error, string>({
    mutationFn: async (examId: string) => {
      return await deleteExam(examId);
    },
    onSuccess: (data, examId, context) => {
      if (data.success) {
        // Invalidate exams lists (only active queries)
        queryClient.invalidateQueries({
          queryKey: examKeys.lists(),
          refetchType: "active",
        });

        // Remove the specific exam from cache
        queryClient.removeQueries({
          queryKey: examKeys.detail(examId),
        });

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: examKeys.stats(),
          refetchType: "active",
        });

        toast.success("Exam deleted successfully!");
      } else {
        toast.error("Failed to delete exam", {
          description: data.message,
          duration: 5000,
        });
      }

      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        (
          options.onSuccess as (
            data: ExamDeleteResponse,
            examId: string,
            context: unknown
          ) => void
        )(data, examId, context);
      }
    },
    onError: (error, variables, context) => {
      console.error("Delete exam error:", error);
      toast.error("Failed to delete exam", {
        description: error.message,
        duration: 5000,
      });

      // Call custom onError if provided
      if (options?.onError) {
        (
          options.onError as (
            error: Error,
            variables: string,
            context: unknown
          ) => void
        )(error, variables, context);
      }
    },
    ...options,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function handleErrorToast(result: ExamUploadResponse) {
  if (result.success) return; // No error to handle

  switch (result.code) {
    case "NO_SESSION":
      toast.error("Authentication required", {
        description: "Please sign in to continue.",
        duration: 5000,
      });
      break;

    case "FORBIDDEN":
      toast.error("Access denied", {
        description: result.message,
        duration: 5000,
      });
      break;

    case "EXAM_NOT_FOUND":
      toast.error("Exam not found", {
        description: "The exam you're trying to edit doesn't exist.",
        duration: 5000,
      });
      break;

    case "RATE_LIMIT_EXCEEDED":
      toast.error("Rate limit exceeded", {
        description: result.message,
        duration: 8000,
      });
      break;

    case "VALIDATION_ERROR":
      toast.error("Validation failed", {
        description: "Please check your input and try again",
        duration: 5000,
      });
      break;

    case "DATABASE_ERROR":
      toast.error("Database error", {
        description: "Failed to save exam. Please try again.",
        duration: 5000,
      });
      break;

    case "INTERNAL_ERROR":
      toast.error("Server error", {
        description: "An unexpected error occurred. Please try again.",
        duration: 5000,
      });
      break;

    default:
      toast.error("Operation failed", {
        description: result.message || "An unexpected error occurred",
        duration: 5000,
      });
  }
}
