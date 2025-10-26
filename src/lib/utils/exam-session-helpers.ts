import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { decryptQuestion } from "@/lib/utils/question-decrypt";
import type { Question, QuestionOption } from "@/generated/prisma";
import { QuestionData } from "@/types/exam-session";

interface SessionLike {
  startedAt: Date;
  timeLimit: number | null;
}

export async function verifyUserSession(): Promise<{
  userId: string;
  userEmail: string;
} | null> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session || !session.user) {
      return null;
    }

    return {
      userId: session.user.id,
      userEmail: session.user.email,
    };
  } catch {
    return null;
  }
}

export function calculateRemainingTime(
  session: SessionLike,
  serverTime: Date
): number | null {
  if (!session.timeLimit) return null;

  const startedAt = new Date(session.startedAt);
  const elapsedSeconds = Math.floor(
    (serverTime.getTime() - startedAt.getTime()) / 1000
  );
  const remainingSeconds = session.timeLimit * 60 - elapsedSeconds;

  return Math.max(0, remainingSeconds);
}

export function isSessionExpired(
  session: SessionLike,
  serverTime: Date
): boolean {
  if (!session.timeLimit) return false;

  const remainingTime = calculateRemainingTime(session, serverTime);
  return remainingTime !== null && remainingTime <= 0;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectRandomQuestions<T extends { id: string }>(
  questions: T[],
  count: number
): T[] {
  if (questions.length <= count) return questions;
  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, count);
}

export function formatQuestionForClient(
  question: Question & { options: QuestionOption[] },
  hideAnswer: boolean
): QuestionData {
  const decrypted = decryptQuestion(question);

  const options = decrypted.options
    .map((opt) => ({
      id: opt.id,
      optionText: opt.optionText,
      optionImage: opt.optionImage || undefined,
      orderIndex: opt.orderIndex,
      ...(hideAnswer ? {} : { isCorrect: opt.isCorrect }),
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return {
    id: decrypted.id,
    questionText: decrypted.questionText,
    questionImage: decrypted.questionImage || undefined,
    questionType: decrypted.questionType,
    questionPoint: decrypted.questionPoint,
    timeLimit: decrypted.timeLimit || undefined,
    options,
  };
}
