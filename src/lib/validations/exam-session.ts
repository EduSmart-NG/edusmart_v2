import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
const VIOLATION_TYPES = [
  "tab_switch",
  "window_blur",
  "copy_attempt",
  "paste_attempt",
  "fullscreen_exit",
] as const;

export const examAccessSchema = z.object({
  examId: z.string().cuid(),
  invitationToken: z.string().optional(),
});

export const examConfigSchema = z
  .object({
    examId: z.string().cuid(),
    numQuestions: z.number().int().min(1).max(80),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    timeLimit: z.number().int().min(1).max(600).optional(),
  })
  .refine(
    () => {
      return true;
    },
    {
      message: "Test mode requires a time limit",
      path: ["timeLimit"],
    }
  );

export const startExamSchema = z.object({
  examId: z.string().cuid(),
  invitationToken: z.string().optional(),
  config: z
    .object({
      numQuestions: z.number().int().min(1).max(80),
      shuffleQuestions: z.boolean(),
      shuffleOptions: z.boolean(),
      timeLimit: z.number().int().min(1).max(600).optional(),
    })
    .optional(),
});

export const getQuestionSchema = z.object({
  sessionId: z.string().cuid(),
  questionIndex: z.number().int().min(0),
});

export const submitAnswerSchema = z.object({
  sessionId: z.string().cuid(),
  questionId: z.string().cuid(),
  selectedOptionId: z.string().cuid().nullable(),
  textAnswer: z
    .string()
    .max(5000)
    .optional()
    .transform((val) => (val ? DOMPurify.sanitize(val.trim()) : undefined)),
  timeSpent: z.number().int().min(0),
});

export const completeExamSchema = z.object({
  sessionId: z.string().cuid(),
});

export const trackViolationSchema = z.object({
  sessionId: z.string().cuid(),
  type: z.enum(VIOLATION_TYPES),
  metadata: z.record(z.unknown()).optional(),
});

export const syncTimeSchema = z.object({
  sessionId: z.string().cuid(),
});

export const getResultsSchema = z.object({
  sessionId: z.string().cuid(),
});

export const abandonSessionSchema = z.object({
  sessionId: z.string().cuid(),
});

export type ExamAccessInput = z.infer<typeof examAccessSchema>;
export type ExamConfigInput = z.infer<typeof examConfigSchema>;
export type StartExamInput = z.infer<typeof startExamSchema>;
export type GetQuestionInput = z.infer<typeof getQuestionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type CompleteExamInput = z.infer<typeof completeExamSchema>;
export type TrackViolationInput = z.infer<typeof trackViolationSchema>;
export type SyncTimeInput = z.infer<typeof syncTimeSchema>;
export type GetResultsInput = z.infer<typeof getResultsSchema>;
export type AbandonSessionInput = z.infer<typeof abandonSessionSchema>;
