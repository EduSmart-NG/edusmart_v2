import type { BetterAuthClientPlugin } from "better-auth/client";
import { examPlugin } from "./server";

type ExamPlugin = typeof examPlugin;

export const examClientPlugin = () => {
  return {
    id: "exam-plugin",
    $InferServerPlugin: {} as ReturnType<ExamPlugin>,
  } satisfies BetterAuthClientPlugin;
};

// Export types for convenience
export type ExamType =
  | "practice"
  | "test"
  | "recruitment"
  | "competition"
  | "challenge";
export type ViolationType =
  | "tab_switch"
  | "window_blur"
  | "copy_attempt"
  | "paste_attempt"
  | "fullscreen_exit";
export type SessionStatus = "active" | "completed" | "expired" | "abandoned";

export interface ExamConfiguration {
  numberOfQuestions?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  timeLimit?: number; // In minutes
}

export interface ExamAccessRequest {
  examId: string;
  invitationToken?: string;
}

export interface StartExamRequest {
  examId: string;
  invitationToken?: string;
  configuration?: ExamConfiguration;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  answer: {
    questionId: string;
    selectedOptionId: string | null;
    textAnswer?: string;
    timeSpent: number; // In seconds
  };
}

export interface TrackViolationRequest {
  sessionId: string;
  violation: {
    type: ViolationType;
    timestamp: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ExamAccessResponse {
  allowed: boolean;
  exam: {
    id: string;
    title: string;
    examType: string;
    subject: string;
    duration: number;
    totalQuestions: number;
    category: ExamType;
  };
}

export interface StartExamResponse {
  sessionId: string;
  startedAt: string;
  timeLimit: number | null;
  totalQuestions: number;
  questionIds: string[];
}

export interface ExamSessionResponse {
  session: {
    id: string;
    examId: string;
    status: SessionStatus;
    startedAt: Date;
    completedAt: Date | null;
    timeLimit: number | null;
    totalQuestions: number;
    answeredQuestions: number;
    violationCount: number;
    remainingSeconds: number | null;
    isExpired: boolean;
  };
}

export interface SubmitAnswerResponse {
  success: boolean;
  feedback?: {
    isCorrect: boolean;
    correctAnswer: string | null;
    explanation: string | null;
  } | null;
}

export interface CompleteExamResponse {
  sessionId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completedAt: string;
}

export interface TrackViolationResponse {
  recorded: boolean;
  violationCount: number;
  autoSubmitted: boolean;
}
