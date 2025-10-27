"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Shield, 
  Eye, 
  EyeOff,
  Maximize,
  Minimize,
  Flag,
  XCircle
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useExamSession } from "@/hooks/use-exam-session";
import { useAntiCheat } from "@/hooks/use-anti-cheat";

interface ExamInterfaceProps {
  sessionId: string;
  examCategory: "practice" | "test" | "recruitment" | "competition" | "challenge";
  onExamComplete: (sessionId: string) => void;
  onExamAbandon: () => void;
}

const optionLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function ExamInterfaceV2({
  sessionId,
  examCategory,
  onExamComplete,
  onExamAbandon
}: ExamInterfaceProps) {
  const {
    sessionState,
    antiCheatState,
    setAntiCheatState,
    resumeSession,
    loadQuestion,
    submitQuestionAnswer,
    completeSession,
    abandonSession,
    recordViolation,
    goToQuestion,
    goToNextQuestion,
    goToPreviousQuestion,
  } = useExamSession();

  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>();
  const [textAnswer, setTextAnswer] = useState("");
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const isStrictMode = ["test", "recruitment", "competition", "challenge"].includes(examCategory);
  const isPracticeMode = examCategory === "practice";
  const isLinearNavigation = ["recruitment", "competition", "challenge"].includes(examCategory);

  // Anti-cheat monitoring
  const { containerRef, enterFullscreen, exitFullscreen } = useAntiCheat({
    isEnabled: isStrictMode,
    antiCheatState,
    setAntiCheatState,
    onViolation: recordViolation,
    examCategory,
  });

  // Initialize session from sessionId
  useEffect(() => {
    async function initializeSession() {
      // Only resume if not already initialized and sessionId doesn't match
      if (isInitialized || sessionState.sessionId === sessionId) {
        return;
      }

      const result = await resumeSession(sessionId);
      if (result.success) {
        setIsInitialized(true);
      } else {
        toast.error(result.message || "Failed to load session");
      }
    }

    initializeSession();
  }, [sessionId, sessionState.sessionId, isInitialized, resumeSession]);

  // Load initial question
  useEffect(() => {
    if (isInitialized && !sessionState.currentQuestion) {
      loadQuestion(0);
    }
  }, [isInitialized, sessionState.currentQuestion, loadQuestion]);

  // Handle violation warnings
  useEffect(() => {
    if (sessionState.violationCount >= 8) {
      setShowViolationWarning(true);
    }
  }, [sessionState.violationCount]);

  // Auto-enter fullscreen for strict modes
  useEffect(() => {
    if (isStrictMode && sessionState.status === "active") {
      const timer = setTimeout(() => {
        enterFullscreen();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isStrictMode, sessionState.status, enterFullscreen]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleAnswerSelect = useCallback((optionId: string) => {
    setSelectedAnswer(optionId);
    setTextAnswer("");
  }, []);

  const handleTextAnswerChange = useCallback((value: string) => {
    setTextAnswer(value);
    setSelectedAnswer(undefined);
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    if (!sessionState.currentQuestion) return;

    const result = await submitQuestionAnswer(
      sessionState.currentQuestion.id,
      selectedAnswer,
      textAnswer || undefined
    );

    if (result.success) {
      // Show feedback for practice mode
      if (isPracticeMode && result.feedback) {
        const isCorrect = result.feedback.isCorrect;
        toast(isCorrect ? "Correct!" : "Incorrect", {
          description: result.feedback.explanation || `The correct answer is ${result.feedback.correctOptionId}`,
          duration: 3000,
        });
      }

      // Auto-advance for non-practice modes
      if (!isPracticeMode && !isLinearNavigation) {
        setTimeout(() => {
          if (sessionState.currentQuestionIndex < sessionState.totalQuestions - 1) {
            goToNextQuestion();
          }
        }, 500);
      }

      // Linear navigation auto-advance
      if (isLinearNavigation) {
        setTimeout(() => {
          if (sessionState.currentQuestionIndex < sessionState.totalQuestions - 1) {
            goToNextQuestion();
          } else {
            // Auto-complete for linear navigation
            completeSession().then((result) => {
              if (result.success && sessionState.sessionId) {
                onExamComplete(sessionState.sessionId);
              }
            });
          }
        }, 500);
      }

      // Clear current answer
      setSelectedAnswer(undefined);
      setTextAnswer("");
    }
  }, [
    sessionState.currentQuestion,
    sessionState.currentQuestionIndex,
    sessionState.totalQuestions,
    sessionState.sessionId,
    selectedAnswer,
    textAnswer,
    submitQuestionAnswer,
    isPracticeMode,
    isLinearNavigation,
    goToNextQuestion,
    completeSession,
    onExamComplete
  ]);

  const handleCompleteExam = useCallback(async () => {
    const result = await completeSession();
    if (result.success) {
      onExamComplete(sessionState.sessionId!);
    }
  }, [completeSession, onExamComplete, sessionState.sessionId]);

  const handleAbandonExam = useCallback(async () => {
    const result = await abandonSession();
    if (result.success) {
      onExamAbandon();
    }
    setShowAbandonDialog(false);
  }, [abandonSession, onExamAbandon]);

  const toggleQuestionFlag = useCallback((questionIndex: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  }, []);

  const getProgressPercentage = () => {
    return (Object.keys(sessionState.answers).length / sessionState.totalQuestions) * 100;
  };

  const isCurrentQuestionAnswered = () => {
    return sessionState.currentQuestion ? 
      sessionState.currentQuestion.id in sessionState.answers : false;
  };

  const canSubmitAnswer = () => {
    if (isCurrentQuestionAnswered()) return false;
    return selectedAnswer || textAnswer.trim().length > 0;
  };

  if (sessionState.status !== "active" || !sessionState.currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-gray-50 ${antiCheatState.isFullscreen ? "p-4" : "p-4 my-12"}`}
    >
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b z-40 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold truncate">
              Question {sessionState.currentQuestionIndex + 1} of {sessionState.totalQuestions}
            </h1>
            {sessionState.currentQuestion.questionType === "multiple_choice" && (
              <Badge variant="outline" className="text-xs">
                {sessionState.currentQuestion.questionPoint} 
                {sessionState.currentQuestion.questionPoint === 1 ? " point" : " points"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            {sessionState.remainingTime !== null && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  sessionState.remainingTime < 300 
                    ? "bg-red-600 text-white" 
                    : sessionState.remainingTime < 900
                    ? "bg-orange-500 text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span className="font-mono font-medium text-sm">
                  {formatTime(sessionState.remainingTime)}
                </span>
              </div>
            )}

            {/* Progress */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <div className="w-24">
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>
              <span className="text-sm font-medium">
                {Object.keys(sessionState.answers).length}/{sessionState.totalQuestions}
              </span>
            </div>

            {/* Fullscreen Toggle */}
            {!isStrictMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={antiCheatState.isFullscreen ? exitFullscreen : enterFullscreen}
              >
                {antiCheatState.isFullscreen ? (
                  <>
                    <Minimize className="h-4 w-4 mr-1" />
                    Exit
                  </>
                ) : (
                  <>
                    <Maximize className="h-4 w-4 mr-1" />
                    Fullscreen
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-24 max-w-7xl mx-auto">
        {/* Anti-cheat Status */}
        {isStrictMode && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${sessionState.violationCount === 0 ? "text-green-600" : "text-red-600"}`} />
                    <span className="text-sm font-medium">
                      Security: {sessionState.violationCount === 0 ? "Secure" : `${sessionState.violationCount} Violations`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {antiCheatState.isTabVisible ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {antiCheatState.isTabVisible ? "Focused" : "Unfocused"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={antiCheatState.isFullscreen ? "default" : "destructive"}>
                    {antiCheatState.isFullscreen ? "Fullscreen Active" : "Fullscreen Required"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline">
                    {sessionState.currentQuestion.questionType.replace("_", " ").toUpperCase()}
                  </Badge>
                  
                  {!isLinearNavigation && !isPracticeMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuestionFlag(sessionState.currentQuestionIndex)}
                      className={flaggedQuestions.has(sessionState.currentQuestionIndex) ? "border-orange-500 text-orange-600" : ""}
                    >
                      <Flag className="h-3 w-3 mr-1" />
                      {flaggedQuestions.has(sessionState.currentQuestionIndex) ? "Flagged" : "Flag"}
                    </Button>
                  )}
                </div>

                <div className="prose max-w-none">
                  <p className="text-lg mb-6 leading-relaxed select-none">
                    {sessionState.currentQuestion.questionText}
                  </p>
                  
                  {sessionState.currentQuestion.questionImage && (
                    <div className="mb-6">
                      <Image
                        src={sessionState.currentQuestion.questionImage}
                        alt="Question diagram"
                        width={500}
                        height={300}
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Multiple Choice Options */}
            {sessionState.currentQuestion.questionType === "multiple_choice" && (
              <div className="space-y-3">
                {sessionState.currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === option.id;
                  const isTrueFalse = sessionState.currentQuestion!.options.length === 2;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerSelect(option.id)}
                      disabled={isCurrentQuestionAnswered()}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isTrueFalse ? option.optionText.charAt(0) : optionLabels[index]}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <span className="block select-none">
                            {option.optionText}
                          </span>
                          
                          {option.optionImage && (
                            <Image
                              src={option.optionImage}
                              alt={`Option ${optionLabels[index]}`}
                              width={300}
                              height={200}
                              className="max-w-full h-auto rounded border border-gray-200"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text Answer Input */}
            {sessionState.currentQuestion.questionType === "text" && (
              <div className="space-y-3">
                <Textarea
                  value={textAnswer}
                  onChange={(e) => handleTextAnswerChange(e.target.value)}
                  disabled={isCurrentQuestionAnswered()}
                  placeholder="Enter your answer here..."
                  className="min-h-[120px] resize-none"
                  maxLength={5000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Maximum 5000 characters</span>
                  <span>{textAnswer.length}/5000</span>
                </div>
              </div>
            )}

            {/* Submit Answer Button */}
            {!isCurrentQuestionAnswered() && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!canSubmitAnswer()}
                  className="px-8"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Answer
                </Button>
              </div>
            )}

            {/* Answer Submitted Notice */}
            {isCurrentQuestionAnswered() && (
              <div className="mt-6">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Answer submitted successfully.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            {!isLinearNavigation && (
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={sessionState.currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}

            {/* Next Button */}
            {!isLinearNavigation && (
              <Button
                variant="outline"
                onClick={goToNextQuestion}
                disabled={sessionState.currentQuestionIndex === sessionState.totalQuestions - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Abandon Button */}
            <Button
              variant="outline"
              onClick={() => setShowAbandonDialog(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Abandon
            </Button>

            {/* Complete Button */}
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete Exam
            </Button>
          </div>
        </div>
      </div>

      {/* Question Navigator - Only for non-linear navigation */}
      {!isLinearNavigation && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Array.from({ length: sessionState.totalQuestions }, (_, index) => {
                const isAnswered = sessionState.questionOrder[index] in sessionState.answers;
                const isCurrent = index === sessionState.currentQuestionIndex;
                const isFlagged = flaggedQuestions.has(index);

                return (
                  <Button
                    key={index}
                    variant={isAnswered ? "default" : "outline"}
                    onClick={() => goToQuestion(index)}
                    className={`h-10 w-full relative ${
                      isCurrent ? "ring-2 ring-primary ring-offset-2" : ""
                    } ${
                      isFlagged ? "border-orange-500" : ""
                    }`}
                  >
                    {index + 1}
                    {isFlagged && (
                      <Flag className="h-2 w-2 absolute -top-1 -right-1 text-orange-500" />
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Exam?</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete and submit your exam? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Questions:</span>
                  <span className="font-medium">{sessionState.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Answered:</span>
                  <span className="font-medium text-green-600">
                    {Object.keys(sessionState.answers).length}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unanswered:</span>
                  <span className="font-medium text-red-600">
                    {sessionState.totalQuestions - Object.keys(sessionState.answers).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Violations:</span>
                  <span className={`font-medium ${sessionState.violationCount > 0 ? "text-red-600" : "text-green-600"}`}>
                    {sessionState.violationCount}
                  </span>
                </div>
              </div>
            </div>

            {sessionState.remainingTime && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Time Remaining:</span>
                <span className="font-medium">{formatTime(sessionState.remainingTime)}</span>
              </div>
            )}
          </div>

          {sessionState.totalQuestions - Object.keys(sessionState.answers).length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have {sessionState.totalQuestions - Object.keys(sessionState.answers).length} unanswered 
                questions. Are you sure you want to submit?
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Exam
            </Button>
            <Button onClick={handleCompleteExam} className="bg-green-600 hover:bg-green-700">
              Complete & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Abandon Confirmation Dialog */}
      <Dialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Abandon Exam?</DialogTitle>
            <DialogDescription>
              Are you sure you want to abandon this exam? All your progress will be lost and cannot be recovered.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              This action is permanent. Your answers will not be saved and you will not receive a score.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbandonDialog(false)}>
              Continue Exam
            </Button>
            <Button variant="destructive" onClick={handleAbandonExam}>
              Yes, Abandon Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Violation Warning Dialog */}
      <Dialog open={showViolationWarning} onOpenChange={setShowViolationWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Violation Warning
            </DialogTitle>
            <DialogDescription>
              You are approaching the violation limit. Your exam will be automatically submitted 
              after 10 violations.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Current violations: {sessionState.violationCount}/10</strong>
              <br />
              Please ensure you follow all exam rules to avoid automatic submission.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button onClick={() => setShowViolationWarning(false)}>
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}