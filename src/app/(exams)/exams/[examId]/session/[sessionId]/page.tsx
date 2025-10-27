"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExamInterfaceV2 } from "@/components/exams/exam-interface-v2";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateActiveSession } from "@/lib/utils/exam-route-guards";

interface SessionPageProps {
  params: Promise<{ examId: string; sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { examId, sessionId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [examCategory, setExamCategory] = useState<
    "practice" | "test" | "recruitment" | "competition" | "challenge"
  >("practice");

  useEffect(() => {
    async function validateSession() {
      try {
        setLoading(true);

        const validation = await validateActiveSession(sessionId);

        if (!validation.isValid) {
          if (validation.redirectTo) {
            router.push(validation.redirectTo);
          }
          setError(validation.message || "Invalid session");
          setLoading(false);
          return;
        }

        // Set exam category
        if (validation.session) {
          setExamCategory(
            validation.session.examType as
              | "practice"
              | "test"
              | "recruitment"
              | "competition"
              | "challenge"
          );
        }

        setLoading(false);
      } catch (error) {
        console.error("Session validation error:", error);
        setError("Failed to validate session");
        setLoading(false);
      }
    }

    validateSession();
  }, [sessionId, router]);

  const handleExamComplete = (completedSessionId: string) => {
    // Navigate to results page
    router.push(`/exams/${examId}/results/${completedSessionId}`);
  };

  const handleExamAbandon = () => {
    // Navigate back to exam entry
    router.push(`/exams/${examId}`);
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
                  Validating session and loading exam...
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
                <h3 className="text-lg font-semibold text-red-600">
                  Session Error
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <Button
                onClick={() => router.push(`/exams/${examId}`)}
                variant="outline"
              >
                Back to Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ExamInterfaceV2
        sessionId={sessionId}
        examCategory={examCategory}
        onExamComplete={handleExamComplete}
        onExamAbandon={handleExamAbandon}
      />
    </div>
  );
}
