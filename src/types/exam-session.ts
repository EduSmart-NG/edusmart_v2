export interface Exam {
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
  deletedAt: Date | null;
  totalQuestions?: number;
}

export interface ExamSession {
  id: string;
  userId: string;
  examId: string;
  examType: string;
  startedAt: Date;
  completedAt: Date | null;
  timeLimit: number | null;
  configuredQuestions: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: string;
  score: number | null;
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

export interface ExamAccessResult {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    exam: Exam;
    accessType: "direct" | "invitation" | "public";
    requiresConfig: boolean;
    userAttempts: number;
    maxAttempts?: number;
  };
}

export interface ExamConfigResult {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    examId: string;
    title: string;
    instructions: string[];
    examType: string;
    category: string;
    timeLimit?: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
}

export interface ExamSessionResult {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    sessionId: string;
    examId: string;
    startedAt: Date;
    serverEndTime?: Date;
    totalQuestions: number;
    questionOrder: string[];
    timeLimit?: number;
  };
}

export interface QuestionData {
  id: string;
  questionText: string;
  questionImage?: string;
  questionType: string;
  questionPoint: number;
  timeLimit?: number;
  options: Array<{
    id: string;
    optionText: string;
    optionImage?: string;
    orderIndex: number;
  }>;
}

export interface GetQuestionResult {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    question: QuestionData;
    questionIndex: number;
    totalQuestions: number;
    remainingTime?: number;
    isExpired: boolean;
  };
}

export interface AnswerFeedback {
  isCorrect: boolean;
  correctOptionId?: string;
  explanation?: string;
}

export interface SubmitAnswerResult {
  success: boolean;
  message: string;
  code?: string;
  feedback?: AnswerFeedback;
}

export interface ExamCompletionResult {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    sessionId: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    completedAt: Date;
    passed?: boolean;
  };
}

export interface ViolationTrackingResult {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    violationCount: number;
    autoSubmitted: boolean;
    sessionStatus: string;
  };
}

export interface ServerTimeSync {
  success: boolean;
  message?: string;
  code?: string;
  serverTime: Date;
  remainingTime?: number;
  isExpired: boolean;
}

export interface ExamResultsData {
  sessionId: string;
  examTitle: string;
  examType: string;
  category: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  passed?: boolean;
  completedAt: Date;
  questions?: Array<{
    questionText: string;
    userAnswer?: string;
    correctAnswer?: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  leaderboardPosition?: number;
  totalParticipants?: number;
}

export interface ExamResultsResult {
  success: boolean;
  message: string;
  code?: string;
  data?: ExamResultsData;
}

export interface AbandonSessionResult {
  success: boolean;
  message: string;
  code?: string;
}
