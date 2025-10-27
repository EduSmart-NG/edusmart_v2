"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useExamSession } from "@/hooks/use-exam-session";
import { ExamConfigComponent } from "./exam-config";
import { ExamInstructions } from "./exam-instructions";
import { ExamInterfaceV2 } from "./exam-interface-v2";
import { ExamResults } from "./exam-results";
import type { Exam, ExamResultsData } from "@/types/exam-session";
import type { ExamConfig } from "@/hooks/use-exam-session";

interface ExamFlowProps {
  examId: string;
  invitationToken?: string;
  onExamComplete?: () => void;
  onBackToDashboard?: () => void;
}

type FlowState = 
  | "loading" 
  | "access_denied" 
  | "configuration" 
  | "instructions" 
  | "exam" 
  | "completed" 
  | "results";

export function ExamFlow({ 
  examId, 
  invitationToken, 
  onExamComplete, 
  onBackToDashboard 
}: ExamFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>("loading");
  const [exam, setExam] = useState<Exam | null>(null);
  const [category, setCategory] = useState<string>("");
  const [instructions, setInstructions] = useState<string[]>([]);
  const [examConfig, setExamConfig] = useState<ExamConfig>({
    numQuestions: 20,
    shuffleQuestions: false,
    shuffleOptions: false,
    timeLimit: undefined,
  });
  const [examResults, setExamResults] = useState<ExamResultsData | null>(null);
  const [error, setError] = useState<string>("");

  const {
    sessionState,
    checkAccess,
    getInstructions,
    startSession,
    loadQuestion,
    getResults,
  } = useExamSession();

  // Initial access check
  useEffect(() => {
    async function initializeExam() {
      try {
        setFlowState("loading");
        
        const accessResult = await checkAccess(examId, invitationToken);
        
        if (!accessResult.success || !accessResult.data) {
          setError(accessResult.message);
          setFlowState("access_denied");
          return;
        }

        const { exam: examData, requiresConfig } = accessResult.data;
        setExam(examData);
        setCategory(examData.category || "practice");

        // Set default config based on exam
        setExamConfig({
          numQuestions: Math.min(20, examData.totalQuestions || 20),
          shuffleQuestions: examData.shuffleQuestions,
          shuffleOptions: examData.randomizeOptions,
          timeLimit: examData.duration || undefined,
        });

        if (requiresConfig) {
          setFlowState("configuration");
        } else {
          // Get instructions and go directly to instructions page
          const instructionsResult = await getInstructions(examId, invitationToken);
          if (instructionsResult.success && instructionsResult.data) {
            setInstructions(instructionsResult.data.instructions);
            setFlowState("instructions");
          } else {
            setError(instructionsResult.message);
            setFlowState("access_denied");
          }
        }
      } catch (error) {
        console.error("Failed to initialize exam:", error);
        setError("Failed to initialize exam. Please try again.");
        setFlowState("access_denied");
      }
    }

    if (examId) {
      initializeExam();
    }
  }, [examId, invitationToken, checkAccess, getInstructions]);

  const handleConfigComplete = async () => {
    if (!exam) return;

    try {
      const instructionsResult = await getInstructions(examId, invitationToken);
      if (instructionsResult.success && instructionsResult.data) {
        setInstructions(instructionsResult.data.instructions);
        setFlowState("instructions");
      } else {
        setError(instructionsResult.message);
        setFlowState("access_denied");
      }
    } catch (error) {
      console.error("Failed to get instructions:", error);
      toast.error("Failed to load exam instructions");
    }
  };

  const handleStartExam = async () => {
    if (!exam) return;

    try {
      const requiresConfig = ["practice", "test"].includes(category);
      const config = requiresConfig ? examConfig : undefined;

      const sessionResult = await startSession(examId, invitationToken, config);
      
      if (sessionResult.success) {
        setFlowState("exam");
        // Load first question
        setTimeout(() => {
          loadQuestion(0);
        }, 500);
      } else {
        setError(sessionResult.message);
        toast.error("Failed to start exam session");
      }
    } catch (error) {
      console.error("Failed to start exam:", error);
      toast.error("Failed to start exam session");
    }
  };

  const handleExamComplete = async (sessionId: string) => {
    try {
      setFlowState("completed");
      
      // Get results
      const resultsResponse = await getResults(sessionId);
      if (resultsResponse.success && resultsResponse.data) {
        setExamResults(resultsResponse.data);
        setFlowState("results");
      } else {
        toast.error("Failed to load exam results");
        setFlowState("results"); // Still show results page, just without detailed data
      }
      
      onExamComplete?.();
    } catch (error) {
      console.error("Failed to get exam results:", error);
      toast.error("Failed to load exam results");
      setFlowState("results");
    }
  };

  const handleExamAbandon = () => {
    setFlowState("configuration");
    toast.info("Exam session abandoned");
  };

  const handleRetakeExam = () => {
    // Reset to configuration or instructions based on exam type
    const requiresConfig = ["practice", "test"].includes(category);
    setFlowState(requiresConfig ? "configuration" : "instructions");
  };

  const handleBackToDashboard = () => {
    onBackToDashboard?.();
  };

  // Loading state
  if (flowState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Loading Exam</h3>
                <p className="text-sm text-muted-foreground">
                  Checking access and preparing your exam...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access denied state
  if (flowState === "access_denied") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-red-600">Access Denied</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {error || "You do not have access to this exam."}
                </p>
              </div>
              {onBackToDashboard && (
                <Button onClick={onBackToDashboard} variant="outline">
                  Back to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam completion loading state
  if (flowState === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Processing Results</h3>
                <p className="text-sm text-muted-foreground">
                  Calculating your score and preparing results...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Configuration Phase */}
      {flowState === "configuration" && exam && (
        <div className="container mx-auto py-8">
          <ExamConfigComponent
            exam={exam}
            category={category}
            onConfigChange={setExamConfig}
            onStartExam={handleConfigComplete}
          />
        </div>
      )}

      {/* Instructions Phase */}
      {flowState === "instructions" && exam && (
        <div className="container mx-auto py-8">
          <ExamInstructions
            examId={examId}
            title={exam.title}
            instructions={instructions}
            examType={exam.examType}
            category={category}
            timeLimit={examConfig.timeLimit}
            shuffleQuestions={examConfig.shuffleQuestions}
            shuffleOptions={examConfig.shuffleOptions}
            onStartExam={handleStartExam}
          />
        </div>
      )}

      {/* Exam Phase */}
      {flowState === "exam" && sessionState.sessionId && (
        <ExamInterfaceV2
          sessionId={sessionState.sessionId}
          examCategory={category as "practice" | "test" | "recruitment" | "competition" | "challenge"}
          onExamComplete={handleExamComplete}
          onExamAbandon={handleExamAbandon}
        />
      )}

      {/* Results Phase */}
      {flowState === "results" && examResults && (
        <div className="container mx-auto py-8">
          <ExamResults
            results={examResults}
            examCategory={category as "practice" | "test" | "recruitment" | "competition" | "challenge"}
            onRetakeExam={handleRetakeExam}
            onBackToDashboard={handleBackToDashboard}
            showDetailedResults={category === "practice"}
          />
        </div>
      )}

      {/* Error state fallback */}
      {flowState === "results" && !examResults && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load exam results. Please contact support if this persists.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4 text-center">
                {onBackToDashboard && (
                  <Button onClick={onBackToDashboard} variant="outline">
                    Back to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}