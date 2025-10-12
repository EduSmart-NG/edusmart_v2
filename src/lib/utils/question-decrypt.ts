/**
 * Question Decryption Utility
 *
 * Helper functions to decrypt question data stored as JSON in database.
 * Use when reading questions from database to display to users.
 *
 * @module lib/utils/question-decrypt
 */

import { decrypt, type EncryptedData } from "@/lib/utils/encryption";
import type { Question, QuestionOption } from "@/generated/prisma";

// ============================================
// TYPES
// ============================================

/**
 * Question with decrypted text fields
 */
export interface DecryptedQuestion
  extends Omit<Question, "questionText" | "answerExplanation" | "options"> {
  questionText: string; // Decrypted plaintext
  answerExplanation: string | null; // Decrypted plaintext
  options: DecryptedOption[];
}

/**
 * Question option with decrypted text
 */
export interface DecryptedOption extends Omit<QuestionOption, "optionText"> {
  optionText: string; // Decrypted plaintext
}

// ============================================
// DECRYPTION FUNCTIONS
// ============================================

/**
 * Decrypt a single question with its options
 *
 * @param question - Question from database with encrypted fields as JSON
 * @returns Question with decrypted plaintext fields
 *
 * @example
 * ```typescript
 * const question = await prisma.question.findUnique({
 *   where: { id },
 *   include: { options: true },
 * });
 *
 * const decrypted = decryptQuestion(question);
 * console.log(decrypted.questionText); // Plaintext question
 * ```
 */
export function decryptQuestion(
  question: Question & { options: QuestionOption[] }
): DecryptedQuestion {
  try {
    // Parse and decrypt question text
    const questionTextEncrypted: EncryptedData = JSON.parse(
      question.questionText
    );
    const questionTextDecrypted = decrypt(questionTextEncrypted);

    // Parse and decrypt answer explanation (if exists)
    let answerExplanationDecrypted: string | null = null;
    if (question.answerExplanation) {
      const answerExplanationEncrypted: EncryptedData = JSON.parse(
        question.answerExplanation
      );
      answerExplanationDecrypted = decrypt(answerExplanationEncrypted);
    }

    // Decrypt all options
    const decryptedOptions: DecryptedOption[] = question.options.map(
      (option) => {
        const optionTextEncrypted: EncryptedData = JSON.parse(
          option.optionText
        );
        const optionTextDecrypted = decrypt(optionTextEncrypted);

        return {
          ...option,
          optionText: optionTextDecrypted,
        };
      }
    );

    return {
      ...question,
      questionText: questionTextDecrypted,
      answerExplanation: answerExplanationDecrypted,
      options: decryptedOptions,
    };
  } catch (error) {
    console.error("Failed to decrypt question:", error);
    throw new Error(`Decryption failed for question ${question.id}`);
  }
}

/**
 * Decrypt multiple questions
 *
 * @param questions - Array of questions from database
 * @returns Array of questions with decrypted fields
 *
 * @example
 * ```typescript
 * const questions = await prisma.question.findMany({
 *   include: { options: true },
 * });
 *
 * const decrypted = decryptQuestions(questions);
 * ```
 */
export function decryptQuestions(
  questions: (Question & { options: QuestionOption[] })[]
): DecryptedQuestion[] {
  return questions.map((q) => decryptQuestion(q));
}

/**
 * Safely decrypt question with error handling
 * Returns null if decryption fails instead of throwing
 *
 * @param question - Question from database
 * @returns Decrypted question or null if decryption fails
 */
export function safeDecryptQuestion(
  question: Question & { options: QuestionOption[] }
): DecryptedQuestion | null {
  try {
    return decryptQuestion(question);
  } catch (error) {
    console.error("Safe decrypt failed for question:", question.id, error);
    return null;
  }
}

/**
 * Check if a field contains encrypted data (JSON format)
 *
 * @param text - Text field to check
 * @returns True if field appears to be encrypted JSON
 */
export function isEncrypted(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return (
      typeof parsed === "object" &&
      "ciphertext" in parsed &&
      "iv" in parsed &&
      "tag" in parsed &&
      "salt" in parsed
    );
  } catch {
    return false;
  }
}
