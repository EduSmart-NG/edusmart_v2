/**
 * Question Upload Client Plugin
 *
 * Better Auth client plugin for type-safe question upload.
 * Provides convenient methods for uploading questions with files.
 *
 * @module lib/plugins/question-upload/client
 */

import type { BetterAuthClientPlugin } from "better-auth/client";
import type { BetterFetchOption } from "@better-fetch/fetch";
import type { questionUploadPlugin } from "./server";
import type { QuestionUploadInput } from "@/lib/validations/question";
import type { QuestionUploadResponse } from "@/types/question-api";

// ============================================
// PLUGIN CONFIGURATION
// ============================================

export interface QuestionUploadClientOptions {
  /**
   * API key for authentication
   * Should match server-side key
   */
  apiKey: string;
}

// ============================================
// CLIENT PLUGIN
// ============================================

export const questionUploadPluginClient = (
  options: QuestionUploadClientOptions
) => {
  return {
    id: "question-upload",

    // Type inference from server plugin
    $InferServerPlugin: {} as ReturnType<typeof questionUploadPlugin>,

    // ============================================
    // CUSTOM ACTIONS
    // ============================================
    getActions: ($fetch) => {
      return {
        /**
         * Upload question with files
         *
         * Handles:
         * - FormData construction
         * - File attachment
         * - API key header injection
         * - Type-safe response
         *
         * @param data - Question data
         * @param files - Optional files (question image, option images)
         * @param fetchOptions - Additional fetch options
         * @returns Upload response with data or error
         *
         * @example
         * ```ts
         * const { data, error } = await authClient.question.uploadQuestionWithFiles(
         *   {
         *     exam_type: "WAEC",
         *     year: 2024,
         *     subject: "Mathematics",
         *     // ... other fields
         *   },
         *   {
         *     questionImage: questionFile,
         *     optionImages: {
         *       0: optionFile1,
         *       1: optionFile2,
         *     }
         *   }
         * );
         *
         * if (data?.success) {
         *   console.log("Question uploaded:", data.data.questionId);
         * } else if (error) {
         *   console.error("Upload failed:", error.message);
         * }
         * ```
         */
        uploadQuestionWithFiles: async (
          data: QuestionUploadInput,
          files?: {
            questionImage?: File;
            optionImages?: Record<number, File>;
          },
          fetchOptions?: BetterFetchOption
        ) => {
          // Create FormData
          const formData = new FormData();

          // Append JSON data
          formData.append("data", JSON.stringify(data));

          // Append question image if exists
          if (files?.questionImage) {
            formData.append("question_image", files.questionImage);
          }

          // Append option images if exist
          if (files?.optionImages) {
            Object.entries(files.optionImages).forEach(([index, file]) => {
              formData.append(`option_image_${index}`, file);
            });
          }

          // Make request with API key header
          // Better Fetch returns { data, error } format
          return await $fetch<QuestionUploadResponse>("/question/upload", {
            method: "POST",
            body: formData,
            headers: {
              "x-question-api-key": options.apiKey,
            },
            ...fetchOptions,
          });
        },

        /**
         * Upload question without files (text-only)
         *
         * Convenience method for questions without images
         *
         * @param data - Question data
         * @param fetchOptions - Additional fetch options
         * @returns Upload response with data or error
         */
        uploadQuestion: async (
          data: QuestionUploadInput,
          fetchOptions?: BetterFetchOption
        ) => {
          const formData = new FormData();
          formData.append("data", JSON.stringify(data));

          return await $fetch<QuestionUploadResponse>("/question/upload", {
            method: "POST",
            body: formData,
            headers: {
              "x-question-api-key": options.apiKey,
            },
            ...fetchOptions,
          });
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};
