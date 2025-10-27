"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExamResults } from "@/components/exams/exam-results";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateCompletedSession } from "@/lib/utils/exam-route-guards";
import { getExamResults } from "@/lib/actions/exam-session";
import type { ExamResultsData } from "@/types/exam-session";

interface ResultsPageProps {
  params: Promise<{ examId: string; sessionId: string }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { examId, sessionId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ExamResultsData | null>(null);
  const [examCategory, setExamCategory] = useState<
    "practice" | "test" | "recruitment" | "competition" | "challenge"
  >("practice");

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);

        // Validate that session is completed
        const validation = await validateCompletedSession(sessionId);

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

        // Get results
        const resultsResponse = await getExamResults(sessionId);
        if (!resultsResponse.success || !resultsResponse.data) {
          setError(resultsResponse.message);
          setLoading(false);
          return;
        }

        setResults(resultsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load results:", error);
        setError("Failed to load exam results");
        setLoading(false);
      }
    }

    loadResults();
  }, [sessionId, router]);

  const handleRetakeExam = () => {
    // Navigate back to exam entry page
    router.push(`/exams/${examId}`);
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Loading Results</h3>
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

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error || "Unable to load exam results. Please contact support if this persists."}
              </AlertDescription>
            </Alert>

            <div className="mt-4 text-center space-x-2">
              <Button onClick={handleBackToDashboard} variant="outline">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <ExamResults
          results={results}
          examCategory={examCategory}
          onRetakeExam={handleRetakeExam}
          onBackToDashboard={handleBackToDashboard}
          showDetailedResults={examCategory === "practice"}
        />
      </div>
    </div>
  );
}
