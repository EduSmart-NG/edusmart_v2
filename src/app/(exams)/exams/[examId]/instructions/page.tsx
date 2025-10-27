"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExamInstructions } from "@/components/exams/exam-instructions";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkExamAccess, getExamInstructions, startExamSession } from "@/lib/actions/exam-session";
import { getActiveSession } from "@/lib/utils/exam-route-guards";
import { toast } from "sonner";
import type { Exam } from "@/types/exam-session";

interface InstructionsPageProps {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ token?: string; config?: string }>;
}

export default function InstructionsPage({
  params,
  searchParams,
}: InstructionsPageProps) {
  const { examId } = use(params);
  const { token, config } = use(searchParams);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exam, setExam] = useState<Exam | null>(null);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [examConfig, setExamConfig] = useState<{
    numQuestions: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    timeLimit?: number;
  } | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function loadInstructions() {
      try {
        setLoading(true);

        // Check if there's already an active session
        const activeSessionCheck = await getActiveSession(examId);
        if (activeSessionCheck.hasActiveSession && activeSessionCheck.sessionId) {
          // Redirect to the active session
          router.push(`/exams/${examId}/session/${activeSessionCheck.sessionId}`);
          return;
        }

        // Check access
        const accessResult = await checkExamAccess(examId, token);
        if (!accessResult.success || !accessResult.data) {
          setError(accessResult.message);
          setLoading(false);
          return;
        }

        setExam(accessResult.data.exam);

        // Get instructions
        const instructionsResult = await getExamInstructions(examId, token);
        if (!instructionsResult.success || !instructionsResult.data) {
          setError(instructionsResult.message);
          setLoading(false);
          return;
        }

        setInstructions(instructionsResult.data.instructions);

        // Parse config from URL if provided
        if (config) {
          try {
            const parsedConfig = JSON.parse(decodeURIComponent(config));
            setExamConfig(parsedConfig);
          } catch (e) {
            console.error("Failed to parse config:", e);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to load instructions:", error);
        setError("Failed to load exam instructions");
        setLoading(false);
      }
    }

    loadInstructions();
  }, [examId, token, config, router]);

  const handleStartExam = async () => {
    if (!exam) return;

    try {
      setStarting(true);

      const category = exam.category || "practice";
      const requiresConfig = category === "practice" || category === "test";

      // If config is required but not provided, redirect back to config page
      if (requiresConfig && !examConfig) {
        toast.error("Exam configuration required");
        router.push(`/exams/${examId}${token ? `?token=${token}` : ""}`);
        return;
      }

      // Start the session
      const sessionResult = await startExamSession({
        examId,
        invitationToken: token,
        config: requiresConfig ? examConfig! : undefined,
      });

      if (sessionResult.success && sessionResult.data) {
        // Redirect to the session page
        router.push(`/exams/${examId}/session/${sessionResult.data.sessionId}`);
      } else {
        toast.error(sessionResult.message);
        setStarting(false);
      }
    } catch (error) {
      console.error("Failed to start exam:", error);
      toast.error("Failed to start exam session");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Loading Instructions</h3>
                <p className="text-sm text-muted-foreground">
                  Preparing your exam instructions...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-red-600">Access Denied</h3>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <Button onClick={() => router.push("/dashboard")} variant="outline">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <ExamInstructions
          examId={examId}
          title={exam.title}
          instructions={instructions}
          examType={exam.examType}
          category={exam.category || "practice"}
          timeLimit={examConfig?.timeLimit || exam.duration}
          shuffleQuestions={examConfig?.shuffleQuestions ?? exam.shuffleQuestions}
          shuffleOptions={examConfig?.shuffleOptions ?? exam.randomizeOptions}
          onStartExam={handleStartExam}
          isLoading={starting}
        />
      </div>
    </div>
  );
}
