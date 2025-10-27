"use client";

import { use, useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import { ExamConfigComponent } from "@/components/exams/exam-config";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkExamAccess } from "@/lib/actions/exam-session";
import { getActiveSession } from "@/lib/utils/exam-route-guards";
import type { Exam } from "@/types/exam-session";

interface ExamPageProps {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default function ExamPage({
  params,
  searchParams,
}: ExamPageProps) {
  const { examId } = use(params);
  const { token } = use(searchParams);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exam, setExam] = useState<Exam | null>(null);
  const [category, setCategory] = useState<string>("");
  const [examConfig, setExamConfig] = useState<{
    numQuestions: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    timeLimit?: number;
  }>({
    numQuestions: 20,
    shuffleQuestions: false,
    shuffleOptions: false,
    timeLimit: undefined,
  });

  // Basic validation
  if (!examId || typeof examId !== "string") {
    notFound();
  }

  useEffect(() => {
    async function initializeExam() {
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

        // If exam doesn't require config (recruitment/competition/challenge)
        // redirect directly to instructions
        if (!requiresConfig) {
          const tokenParam = token ? `?token=${token}` : "";
          router.push(`/exams/${examId}/instructions${tokenParam}`);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to initialize exam:", error);
        setError("Failed to initialize exam. Please try again.");
        setLoading(false);
      }
    }

    initializeExam();
  }, [examId, token, router]);

  const handleConfigComplete = () => {
    // Navigate to instructions with config
    const configParam = encodeURIComponent(JSON.stringify(examConfig));
    const tokenParam = token ? `&token=${token}` : "";
    router.push(`/exams/${examId}/instructions?config=${configParam}${tokenParam}`);
  };

  if (loading) {
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
        <ExamConfigComponent
          exam={exam}
          category={category}
          onConfigChange={setExamConfig}
          onStartExam={handleConfigComplete}
        />
      </div>
    </div>
  );
}
