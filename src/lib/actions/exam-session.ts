"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  examAccessSchema,
  startExamSchema,
  getQuestionSchema,
  submitAnswerSchema,
  completeExamSchema,
  trackViolationSchema,
  syncTimeSchema,
  getResultsSchema,
  abandonSessionSchema,
} from "@/lib/validations/exam-session";
import {
  verifyUserSession,
  calculateRemainingTime,
  isSessionExpired,
  shuffleArray,
  selectRandomQuestions,
  formatQuestionForClient,
} from "@/lib/utils/exam-session-helpers";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import type {
  ExamAccessResult,
  ExamConfigResult,
  ExamSessionResult,
  GetQuestionResult,
  SubmitAnswerResult,
  ExamCompletionResult,
  ViolationTrackingResult,
  ServerTimeSync,
  ExamResultsResult,
  AbandonSessionResult,
} from "@/types/exam-session";

const VIOLATION_LIMIT = 10;

export async function checkExamAccess(
  examId: string,
  invitationToken?: string
): Promise<ExamAccessResult> {
  try {
    const validated = examAccessSchema.parse({ examId, invitationToken });

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      "exam:access",
      { max: 30, windowSeconds: 60 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    const exam = await prisma.exam.findUnique({
      where: { id: validated.examId, deletedAt: null },
      include: {
        questions: {
          select: { id: true },
        },
      },
    });

    if (!exam) {
      return {
        success: false,
        message: "Exam not found",
        code: "EXAM_NOT_FOUND",
      };
    }

    if (exam.status !== "published") {
      return {
        success: false,
        message: "Exam is not available",
        code: "EXAM_UNAVAILABLE",
      };
    }

    if (exam.endDate && new Date() > new Date(exam.endDate)) {
      return {
        success: false,
        message: "Exam access period has ended",
        code: "EXAM_EXPIRED",
      };
    }

    if (exam.startDate && new Date() < new Date(exam.startDate)) {
      return {
        success: false,
        message: "Exam has not started yet",
        code: "EXAM_NOT_STARTED",
      };
    }

    const category = exam.category || "practice";
    const requiresInvitation = [
      "recruitment",
      "competition",
      "challenge",
    ].includes(category);

    if (requiresInvitation) {
      if (!validated.invitationToken) {
        return {
          success: false,
          message: "Invitation required for this exam",
          code: "INVITATION_REQUIRED",
        };
      }

      const invitation = await prisma.examInvitation.findUnique({
        where: { token: validated.invitationToken },
      });

      if (!invitation || invitation.examId !== validated.examId) {
        return {
          success: false,
          message: "Invalid invitation token",
          code: "INVALID_INVITATION",
        };
      }

      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        return {
          success: false,
          message: "Invitation has expired",
          code: "INVITATION_EXPIRED",
        };
      }

      if (invitation.usedAt) {
        return {
          success: false,
          message: "Invitation has already been used",
          code: "INVITATION_USED",
        };
      }

      if (invitation.userId && invitation.userId !== userSession.userId) {
        return {
          success: false,
          message: "This invitation is for another user",
          code: "INVALID_USER",
        };
      }
    } else if (!exam.isPublic) {
      return {
        success: false,
        message: "This exam is not publicly available",
        code: "EXAM_PRIVATE",
      };
    }

    const completedSessions = await prisma.examSession.findMany({
      where: {
        userId: userSession.userId,
        examId: validated.examId,
        status: "completed",
      },
    });

    if (exam.maxAttempts && completedSessions.length >= exam.maxAttempts) {
      return {
        success: false,
        message: `Maximum attempts (${exam.maxAttempts}) reached`,
        code: "MAX_ATTEMPTS_REACHED",
      };
    }

    return {
      success: true,
      message: "Access granted",
      data: {
        exam: {
          id: exam.id,
          examType: exam.examType,
          subject: exam.subject,
          year: exam.year,
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
          passingScore: exam.passingScore,
          maxAttempts: exam.maxAttempts,
          shuffleQuestions: exam.shuffleQuestions,
          randomizeOptions: exam.randomizeOptions,
          isPublic: exam.isPublic,
          isFree: exam.isFree,
          status: exam.status,
          category: exam.category,
          startDate: exam.startDate,
          endDate: exam.endDate,
          createdBy: exam.createdBy,
          createdAt: exam.createdAt,
          updatedAt: exam.updatedAt,
          deletedAt: exam.deletedAt,
          totalQuestions: exam.questions.length,
        },
        accessType: requiresInvitation
          ? "invitation"
          : exam.isPublic
            ? "public"
            : "direct",
        requiresConfig: category === "practice" || category === "test",
        userAttempts: completedSessions.length,
        maxAttempts: exam.maxAttempts ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Check exam access error:", error);
    return {
      success: false,
      message: "Failed to check exam access",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getExamInstructions(
  examId: string,
  invitationToken?: string
): Promise<ExamConfigResult> {
  try {
    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      "exam:instructions",
      { max: 20, windowSeconds: 60 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    const accessResult = await checkExamAccess(examId, invitationToken);
    if (!accessResult.success || !accessResult.data) {
      return {
        success: false,
        message: accessResult.message,
        code: accessResult.code,
      };
    }

    const { exam } = accessResult.data;
    const category = exam.category || "practice";

    const instructions: string[] = [
      `Exam Type: ${exam.examType}`,
      `Subject: ${exam.subject}`,
      `Total Questions: ${exam.totalQuestions || 0}`,
    ];

    if (exam.duration) {
      instructions.push(`Time Limit: ${exam.duration} minutes`);
    }

    if (exam.shuffleQuestions) {
      instructions.push("Questions will be shuffled");
    }

    if (exam.randomizeOptions) {
      instructions.push("Answer options will be randomized");
    }

    if (
      category === "test" ||
      category === "recruitment" ||
      category === "competition"
    ) {
      instructions.push("⚠️ Anti-cheat monitoring is enabled");
      instructions.push("• Do not switch tabs or minimize the browser");
      instructions.push("• Fullscreen mode will be enforced");
      instructions.push("• Copy/paste actions are disabled");
    }

    if (exam.passingScore) {
      instructions.push(`Passing Score: ${exam.passingScore}%`);
    }

    return {
      success: true,
      message: "Instructions retrieved",
      data: {
        examId: exam.id,
        title: exam.title,
        instructions,
        examType: exam.examType,
        category,
        timeLimit: exam.duration || undefined,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleOptions: exam.randomizeOptions,
      },
    };
  } catch (error) {
    console.error("Get exam instructions error:", error);
    return {
      success: false,
      message: "Failed to get exam instructions",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function startExamSession(data: {
  examId: string;
  invitationToken?: string;
  config?: {
    numQuestions: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    timeLimit?: number;
  };
}): Promise<ExamSessionResult> {
  try {
    const validated = startExamSchema.parse(data);

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      "exam:start",
      { max: 5, windowSeconds: 3600 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    const activeSessions = await prisma.examSession.findMany({
      where: {
        userId: userSession.userId,
        status: "active",
      },
    });

    if (activeSessions.length > 0) {
      const now = new Date();
      for (const sess of activeSessions) {
        if (isSessionExpired(sess, now)) {
          await prisma.examSession.update({
            where: { id: sess.id },
            data: { status: "expired", updatedAt: now },
          });
        } else {
          return {
            success: false,
            message:
              "You have an active exam session. Please complete or abandon it first.",
            code: "CONCURRENT_SESSION",
          };
        }
      }
    }

    const accessResult = await checkExamAccess(
      validated.examId,
      validated.invitationToken
    );
    if (!accessResult.success || !accessResult.data) {
      return {
        success: false,
        message: accessResult.message,
        code: accessResult.code,
      };
    }

    const { exam } = accessResult.data;
    const category = exam.category || "practice";

    const requiresConfig = category === "practice" || category === "test";
    const config = validated.config;

    if (requiresConfig && !config) {
      return {
        success: false,
        message: "Exam configuration required",
        code: "CONFIG_REQUIRED",
      };
    }

    if (category === "test" && (!config || !config.timeLimit)) {
      return {
        success: false,
        message: "Time limit is required for test mode",
        code: "TIME_LIMIT_REQUIRED",
      };
    }

    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: validated.examId },
      include: {
        question: {
          include: { options: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    let selectedQuestions = examQuestions;

    if (config && config.numQuestions < examQuestions.length) {
      selectedQuestions = selectRandomQuestions(
        examQuestions,
        config.numQuestions
      );
    }

    let questionOrder = selectedQuestions.map((eq) => eq.questionId);

    if (
      (config && config.shuffleQuestions) ||
      (!config && exam.shuffleQuestions)
    ) {
      questionOrder = shuffleArray(questionOrder);
    }

    const now = new Date();
    const timeLimit =
      config?.timeLimit ||
      (category !== "practice" ? exam.duration : undefined);
    const serverEndTime = timeLimit
      ? new Date(now.getTime() + timeLimit * 60 * 1000)
      : undefined;

    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.examSession.create({
        data: {
          userId: userSession.userId,
          examId: validated.examId,
          examType: category,
          startedAt: now,
          timeLimit,
          configuredQuestions: selectedQuestions.length,
          shuffleQuestions: config?.shuffleQuestions ?? exam.shuffleQuestions,
          shuffleOptions: config?.shuffleOptions ?? exam.randomizeOptions,
          status: "active",
          totalQuestions: selectedQuestions.length,
          answeredQuestions: 0,
          violationCount: 0,
          questionOrder: JSON.stringify(questionOrder),
        },
      });

      if (validated.invitationToken) {
        await tx.examInvitation.update({
          where: { token: validated.invitationToken },
          data: { usedAt: now },
        });
      }

      return newSession;
    });

    return {
      success: true,
      message: "Exam session started",
      data: {
        sessionId: session.id,
        examId: session.examId,
        startedAt: session.startedAt,
        serverEndTime,
        totalQuestions: session.totalQuestions,
        questionOrder,
        timeLimit: session.timeLimit || undefined,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Start exam session error:", error);
    return {
      success: false,
      message: "Failed to start exam session",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getQuestion(
  sessionId: string,
  questionIndex: number
): Promise<GetQuestionResult> {
  try {
    const validated = getQuestionSchema.parse({ sessionId, questionIndex });

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      `exam:question:${sessionId}`,
      { max: 100, windowSeconds: 3600 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: validated.sessionId },
    });

    if (!session || session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      };
    }

    if (session.status !== "active") {
      return {
        success: false,
        message: "Session is not active",
        code: "SESSION_NOT_ACTIVE",
      };
    }

    const now = new Date();
    if (isSessionExpired(session, now)) {
      await prisma.examSession.update({
        where: { id: session.id },
        data: { status: "expired", updatedAt: now },
      });

      return {
        success: false,
        message: "Session has expired",
        code: "SESSION_EXPIRED",
      };
    }

    const questionOrder: string[] = JSON.parse(session.questionOrder);

    if (
      validated.questionIndex < 0 ||
      validated.questionIndex >= questionOrder.length
    ) {
      return {
        success: false,
        message: "Invalid question index",
        code: "INVALID_QUESTION_INDEX",
      };
    }

    const questionId = questionOrder[validated.questionIndex];

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) {
      return {
        success: false,
        message: "Question not found",
        code: "QUESTION_NOT_FOUND",
      };
    }

    const questionData = formatQuestionForClient(question, true);

    if (session.shuffleOptions) {
      questionData.options = shuffleArray(questionData.options);
    }

    const remainingTime = calculateRemainingTime(session, now);

    return {
      success: true,
      message: "Question retrieved",
      data: {
        question: questionData,
        questionIndex: validated.questionIndex,
        totalQuestions: session.totalQuestions,
        remainingTime: remainingTime || undefined,
        isExpired: false,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Get question error:", error);
    return {
      success: false,
      message: "Failed to get question",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function submitAnswer(data: {
  sessionId: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer?: string;
  timeSpent: number;
}): Promise<SubmitAnswerResult> {
  try {
    const validated = submitAnswerSchema.parse(data);

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      `exam:submit:${validated.sessionId}`,
      { max: 200, windowSeconds: 3600 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: validated.sessionId },
    });

    if (!session || session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      };
    }

    if (session.status !== "active") {
      return {
        success: false,
        message: "Session is not active",
        code: "SESSION_NOT_ACTIVE",
      };
    }

    const now = new Date();
    if (isSessionExpired(session, now)) {
      await prisma.examSession.update({
        where: { id: session.id },
        data: { status: "expired", updatedAt: now },
      });

      return {
        success: false,
        message: "Session has expired",
        code: "SESSION_EXPIRED",
      };
    }

    const existingAnswer = await prisma.examAnswer.findUnique({
      where: {
        sessionId_questionId: {
          sessionId: validated.sessionId,
          questionId: validated.questionId,
        },
      },
    });

    if (existingAnswer) {
      return {
        success: false,
        message: "Question already answered",
        code: "ALREADY_ANSWERED",
      };
    }

    const question = await prisma.question.findUnique({
      where: { id: validated.questionId },
      include: { options: true },
    });

    if (!question) {
      return {
        success: false,
        message: "Question not found",
        code: "QUESTION_NOT_FOUND",
      };
    }

    let isCorrect: boolean | null = null;
    let correctOptionId: string | undefined;

    if (
      question.questionType === "multiple_choice" &&
      validated.selectedOptionId
    ) {
      const selectedOption = question.options.find(
        (opt) => opt.id === validated.selectedOptionId
      );
      const correctOption = question.options.find((opt) => opt.isCorrect);

      if (selectedOption) {
        isCorrect = selectedOption.isCorrect;
        correctOptionId = correctOption?.id;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.examAnswer.create({
        data: {
          sessionId: validated.sessionId,
          questionId: validated.questionId,
          selectedOptionId: validated.selectedOptionId || undefined,
          textAnswer: validated.textAnswer || undefined,
          isCorrect,
          timeSpent: validated.timeSpent,
          answeredAt: now,
        },
      });

      await tx.examSession.update({
        where: { id: validated.sessionId },
        data: {
          answeredQuestions: session.answeredQuestions + 1,
          updatedAt: now,
        },
      });
    });

    if (session.examType === "practice" && isCorrect !== null) {
      const explanation = question.answerExplanation || undefined;

      return {
        success: true,
        message: "Answer submitted",
        feedback: {
          isCorrect,
          correctOptionId,
          explanation,
        },
      };
    }

    return {
      success: true,
      message: "Answer submitted",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Submit answer error:", error);
    return {
      success: false,
      message: "Failed to submit answer",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function completeExam(
  sessionId: string
): Promise<ExamCompletionResult> {
  try {
    const validated = completeExamSchema.parse({ sessionId });

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      "exam:complete",
      { max: 10, windowSeconds: 3600 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: validated.sessionId },
      include: {
        answers: true,
      },
    });

    if (!session || session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      };
    }

    if (session.status !== "active") {
      return {
        success: false,
        message: "Session already completed",
        code: "SESSION_COMPLETED",
      };
    }

    const correctAnswers = session.answers.filter(
      (a) => a.isCorrect === true
    ).length;
    const score = (correctAnswers / session.totalQuestions) * 100;

    const now = new Date();

    await prisma.examSession.update({
      where: { id: validated.sessionId },
      data: {
        status: "completed",
        completedAt: now,
        score,
        updatedAt: now,
      },
    });

    const exam = await prisma.exam.findUnique({
      where: { id: session.examId },
      select: { passingScore: true },
    });

    const passed = exam?.passingScore ? score >= exam.passingScore : undefined;

    return {
      success: true,
      message: "Exam completed successfully",
      data: {
        sessionId: validated.sessionId,
        score,
        correctAnswers,
        totalQuestions: session.totalQuestions,
        completedAt: now,
        passed,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Complete exam error:", error);
    return {
      success: false,
      message: "Failed to complete exam",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function trackViolation(data: {
  sessionId: string;
  type:
    | "tab_switch"
    | "window_blur"
    | "copy_attempt"
    | "paste_attempt"
    | "fullscreen_exit";
  metadata?: Record<string, unknown>;
}): Promise<ViolationTrackingResult> {
  try {
    const validated = trackViolationSchema.parse(data);

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      `exam:violation:${validated.sessionId}`,
      { max: 50, windowSeconds: 3600 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: validated.sessionId },
    });

    if (!session || session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      };
    }

    if (session.status !== "active") {
      return {
        success: true,
        message: "Session not active, violation not recorded",
        data: {
          violationCount: session.violationCount,
          autoSubmitted: false,
          sessionStatus: session.status,
        },
      };
    }

    const now = new Date();
    const newViolationCount = session.violationCount + 1;

    await prisma.$transaction(async (tx) => {
      await tx.examViolation.create({
        data: {
          sessionId: validated.sessionId,
          type: validated.type,
          timestamp: now,
          metadata: validated.metadata
            ? JSON.stringify(validated.metadata)
            : null,
        },
      });

      await tx.examSession.update({
        where: { id: validated.sessionId },
        data: {
          violationCount: newViolationCount,
          updatedAt: now,
        },
      });
    });

    let autoSubmitted = false;

    if (newViolationCount >= VIOLATION_LIMIT) {
      const answers = await prisma.examAnswer.findMany({
        where: { sessionId: validated.sessionId },
      });

      const correctAnswers = answers.filter((a) => a.isCorrect === true).length;
      const score = (correctAnswers / session.totalQuestions) * 100;

      await prisma.examSession.update({
        where: { id: validated.sessionId },
        data: {
          status: "completed",
          completedAt: now,
          score,
          updatedAt: now,
        },
      });

      autoSubmitted = true;
    }

    return {
      success: true,
      message: autoSubmitted
        ? "Violation limit reached, exam auto-submitted"
        : "Violation recorded",
      data: {
        violationCount: newViolationCount,
        autoSubmitted,
        sessionStatus: autoSubmitted ? "completed" : "active",
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Track violation error:", error);
    return {
      success: false,
      message: "Failed to track violation",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function syncServerTime(
  sessionId: string
): Promise<ServerTimeSync> {
  try {
    const validated = syncTimeSchema.parse({ sessionId });

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
        serverTime: new Date(),
        isExpired: false,
      };
    }

    const rateLimitResult = await checkRateLimit(
      `exam:sync:${sessionId}`,
      { max: 10, windowSeconds: 60 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
        serverTime: new Date(),
        isExpired: false,
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: validated.sessionId },
    });

    if (!session || session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
        serverTime: new Date(),
        isExpired: false,
      };
    }

    const now = new Date();
    const remainingTime = calculateRemainingTime(session, now);
    const expired = isSessionExpired(session, now);

    return {
      success: true,
      serverTime: now,
      remainingTime: remainingTime || undefined,
      isExpired: expired,
    };
  } catch {
    return {
      success: false,
      message: "Failed to sync server time",
      code: "INTERNAL_ERROR",
      serverTime: new Date(),
      isExpired: false,
    };
  }
}

export async function abandonExamSession(
  sessionId: string
): Promise<AbandonSessionResult> {
  try {
    const validated = abandonSessionSchema.parse({ sessionId });

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      "exam:abandon",
      { max: 10, windowSeconds: 3600 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: validated.sessionId },
    });

    if (!session || session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      };
    }

    if (session.status !== "active") {
      return {
        success: false,
        message: "Session is not active",
        code: "SESSION_NOT_ACTIVE",
      };
    }

    const now = new Date();

    await prisma.examSession.update({
      where: { id: validated.sessionId },
      data: {
        status: "abandoned",
        updatedAt: now,
      },
    });

    return {
      success: true,
      message: "Exam session abandoned",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Abandon exam session error:", error);
    return {
      success: false,
      message: "Failed to abandon exam session",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getExamResults(
  sessionId: string
): Promise<ExamResultsResult> {
  try {
    const validated = getResultsSchema.parse({ sessionId });

    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const rateLimitResult = await checkRateLimit(
      "exam:results",
      { max: 20, windowSeconds: 3600 },
      userSession.userId
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        code: "RATE_LIMITED",
      };
    }

    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: validated.sessionId },
      include: {
        answers: true,
      },
    });

    if (!session || session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      };
    }

    if (session.status !== "completed") {
      return {
        success: false,
        message: "Exam session not completed",
        code: "SESSION_NOT_COMPLETED",
      };
    }

    const exam = await prisma.exam.findUnique({
      where: { id: session.examId },
      select: {
        title: true,
        examType: true,
        category: true,
        passingScore: true,
      },
    });

    if (!exam) {
      return {
        success: false,
        message: "Exam not found",
        code: "EXAM_NOT_FOUND",
      };
    }

    const category = exam.category || "practice";
    const correctAnswers = session.answers.filter(
      (a) => a.isCorrect === true
    ).length;
    const score = session.score || 0;

    const timeSpent = session.answers.reduce((sum, a) => sum + a.timeSpent, 0);

    const passed = exam.passingScore ? score >= exam.passingScore : undefined;

    let questionDetails:
      | Array<{
          questionText: string;
          userAnswer?: string;
          correctAnswer?: string;
          isCorrect: boolean;
          explanation?: string;
        }>
      | undefined = undefined;

    if (category === "practice") {
      const questionIds = session.answers.map((a) => a.questionId);
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: { options: true },
      });

      questionDetails = session.answers
        .map((answer) => {
          const question = questions.find((q) => q.id === answer.questionId);
          if (!question) return null;

          const decrypted = formatQuestionForClient(question, false);
          const userOption = question.options.find(
            (opt) => opt.id === answer.selectedOptionId
          );
          const correctOption = question.options.find((opt) => opt.isCorrect);

          return {
            questionText: decrypted.questionText,
            userAnswer: userOption
              ? formatQuestionForClient(question, false).options.find(
                  (o) => o.id === userOption.id
                )?.optionText
              : answer.textAnswer || undefined,
            correctAnswer: correctOption
              ? formatQuestionForClient(question, false).options.find(
                  (o) => o.id === correctOption.id
                )?.optionText
              : undefined,
            isCorrect: answer.isCorrect || false,
            explanation: question.answerExplanation || undefined,
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null);
    }

    return {
      success: true,
      message: "Results retrieved",
      data: {
        sessionId: validated.sessionId,
        examTitle: exam.title,
        examType: exam.examType,
        category,
        score,
        correctAnswers,
        totalQuestions: session.totalQuestions,
        timeSpent,
        passed,
        completedAt: session.completedAt!,
        questions: questionDetails,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }

    console.error("Get exam results error:", error);
    return {
      success: false,
      message: "Failed to get exam results",
      code: "INTERNAL_ERROR",
    };
  }
}
