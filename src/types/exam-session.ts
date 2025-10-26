/**
 * Type definitions for Exam Plugin
 */

export interface Exam {
  id: string;
  examType: string;
  subject: string;
  year: number;
  title: string;
  description?: string;
  duration: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions: boolean;
  randomizeOptions: boolean;
  isPublic: boolean;
  isFree: boolean;
  status: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  totalQuestions?: number;
}

export interface ExamSession {
  id: string;
  userId: string;
  examId: string;
  examType: string;
  startedAt: Date;
  completedAt?: Date;
  timeLimit?: number;
  configuredQuestions: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: string;
  score?: number;
  totalQuestions: number;
  answeredQuestions: number;
  violationCount: number;
  questionOrder: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  isCorrect?: boolean;
  timeSpent: number;
  answeredAt: Date;
  createdAt: Date;
}

export interface Question {
  id: string;
  examType: string;
  year: number;
  subject: string;
  questionType: string;
  questionText: string;
  questionImage?: string;
  questionPoint: number;
  answerExplanation?: string;
  difficultyLevel: string;
  tags: unknown;
  timeLimit?: number;
  language: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  optionImage?: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  orderIndex: number;
}

export interface ExamInvitation {
  id: string;
  examId: string;
  userId?: string;
  email?: string;
  token: string;
  expiresAt?: Date;
  usedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}
