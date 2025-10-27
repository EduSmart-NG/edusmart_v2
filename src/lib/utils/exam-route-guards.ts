"use server";

import prisma from "@/lib/prisma";
import { verifyUserSession } from "@/lib/utils/exam-session-helpers";

export interface SessionValidation {
  isValid: boolean;
  session?: {
    id: string;
    examId: string;
    userId: string;
    status: string;
    examType: string;
  };
  redirectTo?: string;
  message?: string;
}

/**
 * Validates that a session exists, belongs to the user, and is in active state
 */
export async function validateActiveSession(
  sessionId: string
): Promise<SessionValidation> {
  try {
    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        isValid: false,
        redirectTo: "/login",
        message: "Authentication required",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        examId: true,
        userId: true,
        status: true,
        examType: true,
      },
    });

    if (!session) {
      return {
        isValid: false,
        redirectTo: "/dashboard",
        message: "Session not found",
      };
    }

    if (session.userId !== userSession.userId) {
      return {
        isValid: false,
        redirectTo: "/dashboard",
        message: "Unauthorized access",
      };
    }

    if (session.status !== "active") {
      // If completed, redirect to results
      if (session.status === "completed") {
        return {
          isValid: false,
          redirectTo: `/exams/${session.examId}/results/${sessionId}`,
          message: "Session already completed",
        };
      }

      // For other statuses (abandoned, expired), redirect to exam entry
      return {
        isValid: false,
        redirectTo: `/exams/${session.examId}`,
        message: `Session is ${session.status}`,
      };
    }

    return {
      isValid: true,
      session,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return {
      isValid: false,
      redirectTo: "/dashboard",
      message: "Failed to validate session",
    };
  }
}

/**
 * Validates that a session exists, belongs to the user, and is completed
 */
export async function validateCompletedSession(
  sessionId: string
): Promise<SessionValidation> {
  try {
    const userSession = await verifyUserSession();
    if (!userSession) {
      return {
        isValid: false,
        redirectTo: "/login",
        message: "Authentication required",
      };
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        examId: true,
        userId: true,
        status: true,
        examType: true,
      },
    });

    if (!session) {
      return {
        isValid: false,
        redirectTo: "/dashboard",
        message: "Session not found",
      };
    }

    if (session.userId !== userSession.userId) {
      return {
        isValid: false,
        redirectTo: "/dashboard",
        message: "Unauthorized access",
      };
    }

    if (session.status !== "completed") {
      // If still active, redirect to session
      if (session.status === "active") {
        return {
          isValid: false,
          redirectTo: `/exams/${session.examId}/session/${sessionId}`,
          message: "Session still active",
        };
      }

      // For other statuses, redirect to exam entry
      return {
        isValid: false,
        redirectTo: `/exams/${session.examId}`,
        message: `Session is ${session.status}`,
      };
    }

    return {
      isValid: true,
      session,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return {
      isValid: false,
      redirectTo: "/dashboard",
      message: "Failed to validate session",
    };
  }
}

/**
 * Checks if user has an active session for a given exam
 */
export async function getActiveSession(examId: string): Promise<{
  hasActiveSession: boolean;
  sessionId?: string;
}> {
  try {
    const userSession = await verifyUserSession();
    if (!userSession) {
      return { hasActiveSession: false };
    }

    const activeSession = await prisma.examSession.findFirst({
      where: {
        examId,
        userId: userSession.userId,
        status: "active",
      },
      select: {
        id: true,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    if (activeSession) {
      return {
        hasActiveSession: true,
        sessionId: activeSession.id,
      };
    }

    return { hasActiveSession: false };
  } catch (error) {
    console.error("Get active session error:", error);
    return { hasActiveSession: false };
  }
}
