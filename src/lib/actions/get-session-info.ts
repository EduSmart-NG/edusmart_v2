"use server";

import prisma from "@/lib/prisma";
import { verifyUserSession } from "@/lib/utils/exam-session-helpers";

export interface SessionInfo {
  success: boolean;
  data?: {
    sessionId: string;
    examId: string;
    startedAt: Date;
    serverEndTime: Date | null;
    totalQuestions: number;
    questionOrder: string[];
    timeLimit: number | null;
    examType: string;
  };
  message?: string;
  code?: string;
}

export async function getSessionInfo(sessionId: string): Promise<SessionInfo> {
  try {
    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        examId: true,
        startedAt: true,
        timeLimit: true,
        totalQuestions: true,
        questionOrder: true,
        status: true,
        examType: true,
      },
    });

    if (!session) {
      return {
        success: false,
        message: "Session not found",
        code: "SESSION_NOT_FOUND",
      };
    }

    if (session.userId !== userSession.userId) {
      return {
        success: false,
        message: "Unauthorized access",
        code: "UNAUTHORIZED",
      };
    }

    if (session.status !== "active") {
      return {
        success: false,
        message: `Session is ${session.status}`,
        code: "SESSION_NOT_ACTIVE",
      };
    }

    // Calculate server end time
    let serverEndTime: Date | null = null;
    if (session.timeLimit) {
      serverEndTime = new Date(
        session.startedAt.getTime() + session.timeLimit * 60 * 1000
      );
    }

    const questionOrder: string[] = JSON.parse(session.questionOrder);

    return {
      success: true,
      data: {
        sessionId: session.id,
        examId: session.examId,
        startedAt: session.startedAt,
        serverEndTime,
        totalQuestions: session.totalQuestions,
        questionOrder,
        timeLimit: session.timeLimit,
        examType: session.examType,
      },
    };
  } catch (error) {
    console.error("Get session info error:", error);
    return {
      success: false,
      message: "Failed to get session info",
      code: "INTERNAL_ERROR",
    };
  }
}
