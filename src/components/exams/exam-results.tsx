"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Award, 
  TrendingUp,
  RotateCcw,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3
} from "lucide-react";
import type { ExamResultsData } from "@/types/exam-session";

interface ExamResultsProps {
  results: ExamResultsData;
  examCategory: "practice" | "test" | "recruitment" | "competition" | "challenge";
  onRetakeExam?: () => void;
  onBackToDashboard: () => void;
  showDetailedResults?: boolean;
}

export function ExamResults({ 
  results, 
  examCategory, 
  onRetakeExam, 
  onBackToDashboard,
  showDetailedResults = true
}: ExamResultsProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("overview");

  const isPracticeMode = examCategory === "practice";
  const isCompetitive = ["competition", "challenge"].includes(examCategory);
  const canRetake = ["practice", "test"].includes(examCategory);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-orange-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeLabel = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "bg-green-100 text-green-800 border-green-200" };
    if (score >= 80) return { label: "Very Good", color: "bg-blue-100 text-blue-800 border-blue-200" };
    if (score >= 70) return { label: "Good", color: "bg-orange-100 text-orange-800 border-orange-200" };
    if (score >= 60) return { label: "Fair", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { label: "Needs Improvement", color: "bg-red-100 text-red-800 border-red-200" };
  };

  const toggleQuestionExpansion = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const scorePercentage = results.score;
  const grade = getGradeLabel(scorePercentage);
  const avgTimePerQuestion = results.timeSpent / results.totalQuestions;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            {results.passed ? (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
            ) : results.passed === false ? (
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-2xl mb-2">Exam Completed!</CardTitle>
          <CardDescription className="text-lg">
            {results.examTitle} • {results.examType}
          </CardDescription>
          
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge className={grade.color}>
              {grade.label}
            </Badge>
            
            <Badge variant="outline">
              {results.category.charAt(0).toUpperCase() + results.category.slice(1)} Mode
            </Badge>
            
            {isCompetitive && results.leaderboardPosition && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                <Award className="h-3 w-3 mr-1" />
                Rank #{results.leaderboardPosition}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Score Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Score Circle */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className={`text-6xl font-bold ${getScoreColor(scorePercentage)}`}>
                  {Math.round(scorePercentage)}%
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  {results.correctAnswers} of {results.totalQuestions} correct
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Score Progress</span>
                <span>{results.correctAnswers}/{results.totalQuestions}</span>
              </div>
              <Progress value={(results.correctAnswers / results.totalQuestions) * 100} className="h-3" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-green-600">{results.correctAnswers}</div>
                <div className="text-xs text-muted-foreground">Correct</div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-red-600">
                  {results.totalQuestions - results.correctAnswers}
                </div>
                <div className="text-xs text-muted-foreground">Incorrect</div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(results.timeSpent)}
                </div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(avgTimePerQuestion)}s
                </div>
                <div className="text-xs text-muted-foreground">Avg/Question</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pass/Fail Status */}
      {results.passed !== undefined && (
        <Alert variant={results.passed ? "default" : "destructive"}>
          {results.passed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <strong>
              {results.passed ? "Congratulations! You passed the exam." : "Unfortunately, you did not pass the exam."}
            </strong>
            {!results.passed && canRetake && (
              <span> You can retake the exam to improve your score.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Competitive Results */}
      {isCompetitive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-purple-600">
                  #{results.leaderboardPosition || "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">Your Rank</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-blue-600">
                  {results.totalParticipants || "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">Total Participants</div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-green-600">
                  {results.totalParticipants && results.leaderboardPosition
                    ? Math.round(((results.totalParticipants - results.leaderboardPosition + 1) / results.totalParticipants) * 100)
                    : "N/A"}%
                </div>
                <div className="text-sm text-muted-foreground">Percentile</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {showDetailedResults && isPracticeMode && results.questions && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Review</CardTitle>
            <CardDescription>
              Review your answers and learn from explanations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Question Overview</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Review</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {results.questions.map((question, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 ${
                        question.isCorrect 
                          ? "border-green-200 bg-green-50" 
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Q{index + 1}</span>
                        {question.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {question.isCorrect ? "Correct" : "Incorrect"}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="detailed" className="space-y-4">
                {results.questions.map((question, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={question.isCorrect ? "default" : "destructive"}>
                              Question {index + 1}
                            </Badge>
                            {question.isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">
                            {question.questionText}
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuestionExpansion(index)}
                        >
                          {expandedQuestions.has(index) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {expandedQuestions.has(index) && (
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {question.userAnswer && (
                            <div>
                              <div className="text-sm font-medium mb-1">Your Answer:</div>
                              <div className={`text-sm p-2 rounded ${
                                question.isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                              }`}>
                                {question.userAnswer}
                              </div>
                            </div>
                          )}
                          
                          {question.correctAnswer && !question.isCorrect && (
                            <div>
                              <div className="text-sm font-medium mb-1">Correct Answer:</div>
                              <div className="text-sm p-2 rounded bg-green-50 text-green-800">
                                {question.correctAnswer}
                              </div>
                            </div>
                          )}
                          
                          {question.explanation && (
                            <div>
                              <div className="text-sm font-medium mb-1">Explanation:</div>
                              <div className="text-sm p-2 rounded bg-blue-50 text-blue-800">
                                {question.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {canRetake && onRetakeExam && (
              <Button onClick={onRetakeExam} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Retake Exam
              </Button>
            )}
            
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Certificate
            </Button>
            
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Results
            </Button>
            
            <Button variant="outline" onClick={onBackToDashboard} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Completion Time */}
      <div className="text-center text-sm text-muted-foreground">
        Completed on {new Date(results.completedAt).toLocaleDateString()} at {new Date(results.completedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}