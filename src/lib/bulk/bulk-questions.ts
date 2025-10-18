/**
 * Question-Specific Bulk Operations
 *
 * Handles mapping between bulk formats and question schema
 * with validation and encryption
 */

import { encrypt, decrypt } from "@/lib/utils/encryption";
import { validateQuestionUpload } from "@/lib/validations/question";
import {
  BulkImportRowError,
  QuestionBulkRow,
  QuestionWithOptions,
} from "@/types/question-api";
import { ZodError } from "zod";

// ============================================
// IMPORT MAPPING
// ============================================

/**
 * Map bulk row to validated question input
 */
export async function mapRowToQuestion(
  row: QuestionBulkRow,
  rowNumber: number
): Promise<{
  valid: boolean;
  errors?: BulkImportRowError[];
  data?: ReturnType<typeof validateQuestionUpload>;
}> {
  const errors: BulkImportRowError[] = [];

  try {
    // Parse tags (handle both JSON array string and comma-separated)
    let tags: string[] = [];
    if (row.tags) {
      try {
        // Try parsing as JSON first
        tags = JSON.parse(row.tags as string);
      } catch {
        // Fall back to comma-separated
        tags = String(row.tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    // Build options array (minimum 2, maximum 5)
    const options = [];

    // Option 1 (required)
    if (!row.option_1_text) {
      errors.push({
        row: rowNumber,
        field: "option_1_text",
        message: "Option 1 text is required",
      });
      return { valid: false, errors };
    }
    options.push({
      option_text: row.option_1_text,
      is_correct: row.option_1_is_correct || false,
      order_index: 0,
    });

    // Option 2 (required)
    if (!row.option_2_text) {
      errors.push({
        row: rowNumber,
        field: "option_2_text",
        message: "Option 2 text is required",
      });
      return { valid: false, errors };
    }
    options.push({
      option_text: row.option_2_text,
      is_correct: row.option_2_is_correct || false,
      order_index: 1,
    });

    // Options 3-5 (optional)
    if (row.option_3_text) {
      options.push({
        option_text: row.option_3_text,
        is_correct: row.option_3_is_correct || false,
        order_index: 2,
      });
    }
    if (row.option_4_text) {
      options.push({
        option_text: row.option_4_text,
        is_correct: row.option_4_is_correct || false,
        order_index: 3,
      });
    }
    if (row.option_5_text) {
      options.push({
        option_text: row.option_5_text,
        is_correct: row.option_5_is_correct || false,
        order_index: 4,
      });
    }

    // Validate at least one correct answer
    const hasCorrectAnswer = options.some((opt) => opt.is_correct);
    if (!hasCorrectAnswer) {
      errors.push({
        row: rowNumber,
        field: "options",
        message: "At least one option must be marked as correct",
      });
      return { valid: false, errors };
    }

    // Build question input object
    const questionInput = {
      exam_type: row.exam_type,
      year: Number(row.year),
      subject: row.subject,
      question_type: row.question_type,
      question_text: row.question_text,
      question_point: Number(row.question_point),
      answer_explanation: row.answer_explanation || undefined,
      difficulty_level: row.difficulty_level,
      tags,
      time_limit: row.time_limit ? Number(row.time_limit) : undefined,
      language: row.language || "en",
      options,
    };

    // Validate with Zod schema
    const validated = validateQuestionUpload(questionInput);

    return { valid: true, data: validated };
  } catch (error) {
    // Handle Zod validation errors (similar to login action pattern)
    if (error instanceof ZodError) {
      // Transform Zod errors into user-friendly format
      error.issues.forEach((issue) => {
        const fieldPath = issue.path.join(".");

        errors.push({
          row: rowNumber,
          field: fieldPath || "validation",
          message: issue.message,
          value: String(issue.message), // Keep original for debugging
        });
      });

      return { valid: false, errors };
    }

    // Handle other errors
    console.error(`Row ${rowNumber} validation error:`, error);

    errors.push({
      row: rowNumber,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected validation error occurred",
    });

    return { valid: false, errors };
  }
}

/**
 * Transform validated question to encrypted database format
 */
export async function transformToEncrypted(
  validated: ReturnType<typeof validateQuestionUpload>,
  userId: string
) {
  try {
    // Encrypt question text
    const encryptedQuestionText = encrypt(validated.question_text);

    // Encrypt answer explanation (if provided)
    const encryptedExplanation = validated.answer_explanation
      ? encrypt(validated.answer_explanation)
      : null;

    // Encrypt each option text
    const encryptedOptions = validated.options.map((opt) => {
      const encryptedText = encrypt(opt.option_text);
      return {
        optionText: JSON.stringify({
          ciphertext: encryptedText.ciphertext,
          iv: encryptedText.iv,
          tag: encryptedText.tag,
          salt: encryptedText.salt,
        }),
        optionImage: null, // Bulk import doesn't support images
        isCorrect: opt.is_correct,
        orderIndex: opt.order_index,
      };
    });

    return {
      examType: validated.exam_type,
      year: validated.year,
      subject: validated.subject,
      questionType: validated.question_type,
      questionImage: null, // Bulk import doesn't support images
      questionPoint: validated.question_point,
      difficultyLevel: validated.difficulty_level,
      tags: validated.tags,
      timeLimit: validated.time_limit || null,
      language: validated.language,
      createdBy: userId,

      // Encrypted fields as JSON strings
      questionText: JSON.stringify({
        ciphertext: encryptedQuestionText.ciphertext,
        iv: encryptedQuestionText.iv,
        tag: encryptedQuestionText.tag,
        salt: encryptedQuestionText.salt,
      }),

      answerExplanation: encryptedExplanation
        ? JSON.stringify({
            ciphertext: encryptedExplanation.ciphertext,
            iv: encryptedExplanation.iv,
            tag: encryptedExplanation.tag,
            salt: encryptedExplanation.salt,
          })
        : null,

      options: encryptedOptions,
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to encrypt question data: ${error.message}`
        : "Failed to encrypt question data"
    );
  }
}

// ============================================
// EXPORT MAPPING
// ============================================

/**
 * Map database question to bulk row format (with decryption)
 */
export function mapQuestionToRow(
  question: QuestionWithOptions
): QuestionBulkRow {
  // Decrypt question text
  let questionText = "";
  try {
    const parsed = JSON.parse(question.questionText);
    questionText = decrypt(parsed);
  } catch (error) {
    console.error(`Failed to decrypt question ${question.id}:`, error);
    questionText = "[DECRYPTION ERROR]";
  }

  // Decrypt answer explanation
  let answerExplanation: string | null = null;
  if (question.answerExplanation) {
    try {
      const parsed = JSON.parse(question.answerExplanation);
      answerExplanation = decrypt(parsed);
    } catch (error) {
      console.error(`Failed to decrypt explanation ${question.id}:`, error);
      answerExplanation = null;
    }
  }

  // Decrypt options
  const decryptedOptions = question.options.map((opt) => {
    let optionText = "";
    try {
      const parsed = JSON.parse(opt.optionText);
      optionText = decrypt(parsed);
    } catch (error) {
      console.error(`Failed to decrypt option ${opt.id}:`, error);
      optionText = "[DECRYPTION ERROR]";
    }
    return {
      ...opt,
      optionText,
    };
  });

  // Sort options by order index
  decryptedOptions.sort((a, b) => a.orderIndex - b.orderIndex);

  // Parse tags
  let tags = "";
  try {
    const tagArray = Array.isArray(question.tags)
      ? question.tags
      : JSON.parse(question.tags as string);
    tags = tagArray.join(", ");
  } catch {
    tags = String(question.tags || "");
  }

  // Build row object
  const row: QuestionBulkRow = {
    exam_type: question.examType,
    year: question.year,
    subject: question.subject,
    question_type: question.questionType,
    difficulty_level: question.difficultyLevel,
    language: question.language,
    question_text: questionText,
    question_image: question.questionImage,
    question_point: question.questionPoint,
    answer_explanation: answerExplanation,
    tags,
    time_limit: question.timeLimit,

    // Always include first 2 options (required)
    option_1_text: decryptedOptions[0]?.optionText || "",
    option_1_is_correct: decryptedOptions[0]?.isCorrect || false,
    option_1_image: decryptedOptions[0]?.optionImage,

    option_2_text: decryptedOptions[1]?.optionText || "",
    option_2_is_correct: decryptedOptions[1]?.isCorrect || false,
    option_2_image: decryptedOptions[1]?.optionImage,

    // Optional options 3-5
    option_3_text: decryptedOptions[2]?.optionText || null,
    option_3_is_correct: decryptedOptions[2]?.isCorrect,
    option_3_image: decryptedOptions[2]?.optionImage,

    option_4_text: decryptedOptions[3]?.optionText || null,
    option_4_is_correct: decryptedOptions[3]?.isCorrect,
    option_4_image: decryptedOptions[3]?.optionImage,

    option_5_text: decryptedOptions[4]?.optionText || null,
    option_5_is_correct: decryptedOptions[4]?.isCorrect,
    option_5_image: decryptedOptions[4]?.optionImage,
  };

  return row;
}

// ============================================
// TEMPLATE GENERATION
// ============================================

/**
 * Get headers for bulk question format
 */
export function getQuestionHeaders(): string[] {
  return [
    "exam_type",
    "year",
    "subject",
    "question_type",
    "difficulty_level",
    "language",
    "question_text",
    "question_point",
    "answer_explanation",
    "tags",
    "time_limit",
    "option_1_text",
    "option_1_is_correct",
    "option_2_text",
    "option_2_is_correct",
    "option_3_text",
    "option_3_is_correct",
    "option_4_text",
    "option_4_is_correct",
    "option_5_text",
    "option_5_is_correct",
  ];
}

/**
 * Get field descriptions for template
 */
export function getQuestionDescriptions(): Record<string, string> {
  return {
    exam_type: "Exam type (e.g., UTME, WAEC, NECO)",
    year: "Year (e.g., 2024)",
    subject: "Subject name",
    question_type: "Type: multiple_choice or true_false",
    difficulty_level: "Difficulty: easy, medium, or hard",
    language: "Language code (e.g., en, fr)",
    question_text: "Question text (required)",
    question_point: "Points for correct answer",
    answer_explanation: "Explanation (optional)",
    tags: "Comma-separated tags",
    time_limit: "Time limit in seconds (optional)",
    option_1_text: "Option 1 text (required)",
    option_1_is_correct: "Is option 1 correct? (true/false)",
    option_2_text: "Option 2 text (required)",
    option_2_is_correct: "Is option 2 correct? (true/false)",
    option_3_text: "Option 3 text (optional)",
    option_3_is_correct: "Is option 3 correct? (true/false)",
    option_4_text: "Option 4 text (optional)",
    option_4_is_correct: "Is option 4 correct? (true/false)",
    option_5_text: "Option 5 text (optional)",
    option_5_is_correct: "Is option 5 correct? (true/false)",
  };
}
