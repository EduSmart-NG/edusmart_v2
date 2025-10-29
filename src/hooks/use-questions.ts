"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  listQuestions,
  uploadQuestion,
  updateQuestion,
  getQuestionById,
} from "@/lib/actions/question-upload";
import type {
  QuestionListQuery,
  QuestionListResponse,
  QuestionUploadResponse,
  QuestionDecrypted,
} from "@/types/question-api";
import { toast } from "sonner";

// ============================================
// QUERY KEYS
// ============================================

export const questionKeys = {
  all: ["questions"] as const,
  lists: () => [...questionKeys.all, "list"] as const,
  list: (filters: QuestionListQuery & { search?: string }) =>
    [...questionKeys.lists(), filters] as const,
  details: () => [...questionKeys.all, "detail"] as const,
  detail: (id: string) => [...questionKeys.details(), id] as const,
  stats: () => [...questionKeys.all, "stats"] as const,
};

// ============================================
// QUERY: LIST QUESTIONS
// ============================================

export function useQuestions(
  query: QuestionListQuery & { search?: string },
  options?: Omit<
    UseQueryOptions<QuestionListResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<QuestionListResponse, Error>({
    queryKey: questionKeys.list(query),
    queryFn: async () => {
      const result = await listQuestions(query);
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
// QUERY: GET SINGLE QUESTION
// ============================================

export function useQuestion(
  questionId: string,
  options?: Omit<
    UseQueryOptions<
      {
        success: boolean;
        message: string;
        code?: string;
        data?: { question: QuestionDecrypted };
      },
      Error
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: questionKeys.detail(questionId),
    queryFn: async () => {
      const result = await getQuestionById(questionId);
      return result;
    },
    enabled: !!questionId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

// ============================================
// MUTATION: CREATE QUESTION
// ============================================

export function useCreateQuestion(
  options?: UseMutationOptions<QuestionUploadResponse, Error, FormData>
) {
  const queryClient = useQueryClient();

  return useMutation<QuestionUploadResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      return await uploadQuestion(formData);
    },
    onSuccess: (data, variables, context) => {
      if (data.success) {
        // Invalidate and refetch questions list (only active queries)
        queryClient.invalidateQueries({
          queryKey: questionKeys.lists(),
          refetchType: "active", // Only refetch mounted queries for better performance
        });

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: questionKeys.stats(),
          refetchType: "active",
        });

        toast.success("Question created successfully!", {
          description: `Question ID: ${data.data?.questionId}`,
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
            data: QuestionUploadResponse,
            variables: FormData,
            context: unknown
          ) => void
        )(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error("Create question error:", error);
      toast.error("Unexpected error", {
        description: "Failed to create question. Please try again.",
        duration: 5000,
      });

      // Call custom onError if provided
      if (options?.onError) {
        (
          options.onError as (
            error: Error,
            variables: FormData,
            context: unknown
          ) => void
        )(error, variables, context);
      }
    },
    ...options,
  });
}

// ============================================
// MUTATION: UPDATE QUESTION
// ============================================

export function useUpdateQuestion(
  options?: UseMutationOptions<
    QuestionUploadResponse,
    Error,
    { questionId: string; formData: FormData }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    QuestionUploadResponse,
    Error,
    { questionId: string; formData: FormData }
  >({
    mutationFn: async ({ questionId, formData }) => {
      return await updateQuestion(questionId, formData);
    },
    onSuccess: (data, variables, context) => {
      if (data.success) {
        // Invalidate the specific question
        queryClient.invalidateQueries({
          queryKey: questionKeys.detail(variables.questionId),
          refetchType: "active",
        });

        // Invalidate all questions lists (only active queries)
        queryClient.invalidateQueries({
          queryKey: questionKeys.lists(),
          refetchType: "active",
        });

        toast.success("Question updated successfully!", {
          description: `Question ID: ${data.data?.questionId}`,
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
            data: QuestionUploadResponse,
            variables: { questionId: string; formData: FormData },
            context: unknown
          ) => void
        )(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error("Update question error:", error);
      toast.error("Unexpected error", {
        description: "Failed to update question. Please try again.",
        duration: 5000,
      });

      // Call custom onError if provided
      if (options?.onError) {
        (
          options.onError as (
            error: Error,
            variables: { questionId: string; formData: FormData },
            context: unknown
          ) => void
        )(error, variables, context);
      }
    },
    ...options,
  });
}

// ============================================
// MUTATION: DELETE QUESTION (Soft Delete)
// ============================================

// Note: You'll need to create a deleteQuestion server action
// This is a placeholder for when you implement it
export function useDeleteQuestion(
  options?: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    string
  >
) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (_questionId: string) => {
      // TODO: Implement deleteQuestion server action
      // For now, return a placeholder
      throw new Error("Delete functionality not yet implemented");
    },
    onSuccess: (data, questionId, context) => {
      if (data.success) {
        // Invalidate questions lists (only active queries)
        queryClient.invalidateQueries({
          queryKey: questionKeys.lists(),
          refetchType: "active",
        });

        // Remove the specific question from cache
        queryClient.removeQueries({
          queryKey: questionKeys.detail(questionId),
        });

        // Invalidate stats
        queryClient.invalidateQueries({
          queryKey: questionKeys.stats(),
          refetchType: "active",
        });

        toast.success("Question deleted successfully!");
      }

      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        (
          options.onSuccess as (
            data: { success: boolean; message: string },
            questionId: string,
            context: unknown
          ) => void
        )(data, questionId, context);
      }
    },
    onError: (error, variables, context) => {
      console.error("Delete question error:", error);
      toast.error("Failed to delete question", {
        description: error.message,
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

function handleErrorToast(result: QuestionUploadResponse) {
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

    case "QUESTION_NOT_FOUND":
      toast.error("Question not found", {
        description: "The question you're trying to edit doesn't exist.",
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

    case "UPLOAD_FAILED":
      toast.error("File upload failed", {
        description: result.message,
        duration: 5000,
      });
      break;

    case "DATABASE_ERROR":
      toast.error("Database error", {
        description: "Failed to save question. Please try again.",
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
