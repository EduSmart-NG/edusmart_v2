"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  checkExamAccess,
  getExamInstructions,
  startExamSession,
  getQuestion,
  submitAnswer,
  completeExam,
  trackViolation,
  syncServerTime,
  abandonExamSession,
  getExamResults,
} from "@/lib/actions/exam-session";
import { getSessionInfo } from "@/lib/actions/get-session-info";
import type {
  ExamAccessResult,
  ExamConfigResult,
  ExamSessionResult,
  GetQuestionResult,
  SubmitAnswerResult,
  ExamCompletionResult,
  ViolationTrackingResult,
  ExamResultsResult,
  AbandonSessionResult,
  QuestionData,
} from "@/types/exam-session";

export interface ExamConfig {
  numQuestions: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timeLimit?: number;
}

export interface ExamSessionState {
  sessionId: string | null;
  examId: string | null;
  startedAt: Date | null;
  serverEndTime: Date | null;
  totalQuestions: number;
  questionOrder: string[];
  timeLimit?: number;
  currentQuestionIndex: number;
  answers: Record<string, { selectedOptionId?: string; textAnswer?: string; timeSpent: number }>;
  currentQuestion: QuestionData | null;
  remainingTime: number | null;
  isExpired: boolean;
  violationCount: number;
  status: "idle" | "loading" | "active" | "completed" | "expired" | "abandoned";
}

export interface AntiCheatState {
  tabSwitches: number;
  windowBlurs: number;
  fullscreenExits: number;
  copyAttempts: number;
  pasteAttempts: number;
  isTabVisible: boolean;
  hasWindowFocus: boolean;
  isFullscreen: boolean;
}

export function useExamSession() {
  const [sessionState, setSessionState] = useState<ExamSessionState>({
    sessionId: null,
    examId: null,
    startedAt: null,
    serverEndTime: null,
    totalQuestions: 0,
    questionOrder: [],
    currentQuestionIndex: 0,
    answers: {},
    currentQuestion: null,
    remainingTime: null,
    isExpired: false,
    violationCount: 0,
    status: "idle",
  });

  const [antiCheatState, setAntiCheatState] = useState<AntiCheatState>({
    tabSwitches: 0,
    windowBlurs: 0,
    fullscreenExits: 0,
    copyAttempts: 0,
    pasteAttempts: 0,
    isTabVisible: true,
    hasWindowFocus: true,
    isFullscreen: false,
  });

  const timeSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<Date | null>(null);

  // Time synchronization functions
  const stopTimeSync = useCallback(() => {
    if (timeSyncIntervalRef.current) {
      clearInterval(timeSyncIntervalRef.current);
      timeSyncIntervalRef.current = null;
    }
  }, []);

  const startTimeSync = useCallback((sessionId: string) => {
    timeSyncIntervalRef.current = setInterval(async () => {
      try {
        const result = await syncServerTime(sessionId);
        if (result.success) {
          setSessionState(prev => ({
            ...prev,
            remainingTime: result.remainingTime || null,
            isExpired: result.isExpired,
          }));

          if (result.isExpired) {
            setSessionState(prev => ({ ...prev, status: "expired" }));
            stopTimeSync();
            toast.error("Time expired - exam auto-submitted");
          }
        }
      } catch (error) {
        console.error("Time sync failed:", error);
      }
    }, 30000); // Sync every 30 seconds
  }, [stopTimeSync]);

  // Check exam access
  const checkAccess = useCallback(async (examId: string, invitationToken?: string): Promise<ExamAccessResult> => {
    try {
      const result = await checkExamAccess(examId, invitationToken);
      if (!result.success) {
        toast.error(result.message);
      }
      return result;
    } catch (_error) {
      const result: ExamAccessResult = {
        success: false,
        message: "Failed to check exam access",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, []);

  // Get exam instructions
  const getInstructions = useCallback(async (examId: string, invitationToken?: string): Promise<ExamConfigResult> => {
    try {
      const result = await getExamInstructions(examId, invitationToken);
      if (!result.success) {
        toast.error(result.message);
      }
      return result;
    } catch (_error) {
      const result: ExamConfigResult = {
        success: false,
        message: "Failed to get exam instructions",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, []);

  // Start exam session
  const startSession = useCallback(async (
    examId: string,
    invitationToken?: string,
    config?: ExamConfig
  ): Promise<ExamSessionResult> => {
    try {
      setSessionState(prev => ({ ...prev, status: "loading" }));
      
      const result = await startExamSession({
        examId,
        invitationToken,
        config,
      });

      if (result.success && result.data) {
        setSessionState(prev => ({
          ...prev,
          sessionId: result.data!.sessionId,
          examId: result.data!.examId,
          startedAt: result.data!.startedAt,
          serverEndTime: result.data!.serverEndTime || null,
          totalQuestions: result.data!.totalQuestions,
          questionOrder: result.data!.questionOrder,
          timeLimit: result.data!.timeLimit,
          status: "active",
        }));

        // Start time synchronization
        startTimeSync(result.data.sessionId);
        
        toast.success("Exam session started successfully");
      } else {
        setSessionState(prev => ({ ...prev, status: "idle" }));
        toast.error(result.message);
      }

      return result;
    } catch (_error) {
      setSessionState(prev => ({ ...prev, status: "idle" }));
      const result: ExamSessionResult = {
        success: false,
        message: "Failed to start exam session",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, [startTimeSync]);

  // Load question
  const loadQuestion = useCallback(async (questionIndex: number): Promise<GetQuestionResult> => {
    if (!sessionState.sessionId) {
      const result: GetQuestionResult = {
        success: false,
        message: "No active session",
        code: "NO_SESSION",
      };
      return result;
    }

    try {
      const result = await getQuestion(sessionState.sessionId, questionIndex);

      if (result.success && result.data) {
        setSessionState(prev => ({
          ...prev,
          currentQuestionIndex: questionIndex,
          currentQuestion: result.data!.question,
          remainingTime: result.data!.remainingTime || null,
          isExpired: result.data!.isExpired,
        }));

        // Reset question timer
        questionTimerRef.current = new Date();
      } else {
        toast.error(result.message);
      }

      return result;
    } catch (_error) {
      const result: GetQuestionResult = {
        success: false,
        message: "Failed to load question",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, [sessionState.sessionId]);

  // Submit answer
  const submitQuestionAnswer = useCallback(async (
    questionId: string,
    selectedOptionId?: string,
    textAnswer?: string
  ): Promise<SubmitAnswerResult> => {
    if (!sessionState.sessionId) {
      const result: SubmitAnswerResult = {
        success: false,
        message: "No active session",
        code: "NO_SESSION",
      };
      return result;
    }

    const timeSpent = questionTimerRef.current 
      ? Math.floor((new Date().getTime() - questionTimerRef.current.getTime()) / 1000)
      : 0;

    try {
      const result = await submitAnswer({
        sessionId: sessionState.sessionId,
        questionId,
        selectedOptionId: selectedOptionId || null,
        textAnswer,
        timeSpent,
      });

      if (result.success) {
        setSessionState(prev => ({
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: { selectedOptionId, textAnswer, timeSpent },
          },
        }));
        toast.success("Answer submitted");
      } else {
        toast.error(result.message);
      }

      return result;
    } catch (_error) {
      const result: SubmitAnswerResult = {
        success: false,
        message: "Failed to submit answer",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, [sessionState.sessionId]);

  // Complete exam
  const completeSession = useCallback(async (): Promise<ExamCompletionResult> => {
    if (!sessionState.sessionId) {
      const result: ExamCompletionResult = {
        success: false,
        message: "No active session",
        code: "NO_SESSION",
      };
      return result;
    }

    try {
      const result = await completeExam(sessionState.sessionId);

      if (result.success) {
        setSessionState(prev => ({ ...prev, status: "completed" }));
        stopTimeSync();
        toast.success("Exam completed successfully");
      } else {
        toast.error(result.message);
      }

      return result;
    } catch (_error) {
      const result: ExamCompletionResult = {
        success: false,
        message: "Failed to complete exam",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, [sessionState.sessionId, stopTimeSync]);

  // Abandon session
  const abandonSession = useCallback(async (): Promise<AbandonSessionResult> => {
    if (!sessionState.sessionId) {
      const result: AbandonSessionResult = {
        success: false,
        message: "No active session",
        code: "NO_SESSION",
      };
      return result;
    }

    try {
      const result = await abandonExamSession(sessionState.sessionId);

      if (result.success) {
        setSessionState(prev => ({ ...prev, status: "abandoned" }));
        stopTimeSync();
        toast.success("Exam session abandoned");
      } else {
        toast.error(result.message);
      }

      return result;
    } catch (_error) {
      const result: AbandonSessionResult = {
        success: false,
        message: "Failed to abandon session",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, [sessionState.sessionId, stopTimeSync]);

  // Resume existing session
  const resumeSession = useCallback(async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setSessionState(prev => ({ ...prev, status: "loading" }));

      const sessionInfo = await getSessionInfo(sessionId);

      if (sessionInfo.success && sessionInfo.data) {
        setSessionState(prev => ({
          ...prev,
          sessionId: sessionInfo.data!.sessionId,
          examId: sessionInfo.data!.examId,
          startedAt: sessionInfo.data!.startedAt,
          serverEndTime: sessionInfo.data!.serverEndTime || null,
          totalQuestions: sessionInfo.data!.totalQuestions,
          questionOrder: sessionInfo.data!.questionOrder,
          timeLimit: sessionInfo.data!.timeLimit || undefined,
          status: "active",
        }));

        // Start time synchronization
        startTimeSync(sessionInfo.data.sessionId);

        return { success: true };
      } else {
        setSessionState(prev => ({ ...prev, status: "idle" }));
        return {
          success: false,
          message: sessionInfo.message || "Failed to resume session"
        };
      }
    } catch (error) {
      console.error("Resume session error:", error);
      setSessionState(prev => ({ ...prev, status: "idle" }));
      return {
        success: false,
        message: "Failed to resume session"
      };
    }
  }, [startTimeSync]);

  // Get results
  const getResults = useCallback(async (sessionId?: string): Promise<ExamResultsResult> => {
    const targetSessionId = sessionId || sessionState.sessionId;
    if (!targetSessionId) {
      const result: ExamResultsResult = {
        success: false,
        message: "No session ID provided",
        code: "NO_SESSION",
      };
      return result;
    }

    try {
      const result = await getExamResults(targetSessionId);
      if (!result.success) {
        toast.error(result.message);
      }
      return result;
    } catch (_error) {
      const result: ExamResultsResult = {
        success: false,
        message: "Failed to get exam results",
        code: "NETWORK_ERROR",
      };
      toast.error(result.message);
      return result;
    }
  }, [sessionState.sessionId]);

  // Record violation
  const recordViolation = useCallback(async (
    type: "tab_switch" | "window_blur" | "copy_attempt" | "paste_attempt" | "fullscreen_exit",
    metadata?: Record<string, unknown>
  ): Promise<ViolationTrackingResult | null> => {
    if (!sessionState.sessionId) {
      return null;
    }

    try {
      const result = await trackViolation({
        sessionId: sessionState.sessionId,
        type,
        metadata,
      });

      if (result.success && result.data) {
        setSessionState(prev => ({
          ...prev,
          violationCount: result.data!.violationCount,
          status: result.data!.autoSubmitted ? "completed" : prev.status,
        }));

        // Update local anti-cheat state
        setAntiCheatState(prev => {
          const updates: Partial<AntiCheatState> = {};
          switch (type) {
            case "tab_switch":
              updates.tabSwitches = prev.tabSwitches + 1;
              break;
            case "window_blur":
              updates.windowBlurs = prev.windowBlurs + 1;
              break;
            case "fullscreen_exit":
              updates.fullscreenExits = prev.fullscreenExits + 1;
              break;
            case "copy_attempt":
              updates.copyAttempts = prev.copyAttempts + 1;
              break;
            case "paste_attempt":
              updates.pasteAttempts = prev.pasteAttempts + 1;
              break;
          }
          return { ...prev, ...updates };
        });

        if (result.data.autoSubmitted) {
          stopTimeSync();
          toast.error("Too many violations - exam auto-submitted");
        } else {
          toast.warning(`Violation recorded: ${type.replace(/_/g, " ")}`);
        }
      }

      return result;
    } catch (error) {
      console.error("Failed to record violation:", error);
      return null;
    }
  }, [sessionState.sessionId, stopTimeSync]);


  // Navigation helpers
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < sessionState.totalQuestions) {
      loadQuestion(index);
    }
  }, [sessionState.totalQuestions, loadQuestion]);

  const goToNextQuestion = useCallback(() => {
    if (sessionState.currentQuestionIndex < sessionState.totalQuestions - 1) {
      loadQuestion(sessionState.currentQuestionIndex + 1);
    }
  }, [sessionState.currentQuestionIndex, sessionState.totalQuestions, loadQuestion]);

  const goToPreviousQuestion = useCallback(() => {
    if (sessionState.currentQuestionIndex > 0) {
      loadQuestion(sessionState.currentQuestionIndex - 1);
    }
  }, [sessionState.currentQuestionIndex, loadQuestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeSync();
    };
  }, [stopTimeSync]);

  return {
    sessionState,
    antiCheatState,
    setAntiCheatState,
    checkAccess,
    getInstructions,
    startSession,
    resumeSession,
    loadQuestion,
    submitQuestionAnswer,
    completeSession,
    abandonSession,
    getResults,
    recordViolation,
    goToQuestion,
    goToNextQuestion,
    goToPreviousQuestion,
  };
}