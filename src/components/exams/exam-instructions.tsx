"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Eye,
  MousePointer,
  Keyboard,
  Monitor,
  Timer,
  BookOpen
} from "lucide-react";

interface ExamInstructionsProps {
  examId: string;
  title: string;
  instructions: string[];
  examType: string;
  category: string;
  timeLimit?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  onStartExam: () => void;
  isLoading?: boolean;
}

export function ExamInstructions({
  examId: _examId,
  title,
  instructions,
  examType,
  category,
  timeLimit,
  shuffleQuestions,
  shuffleOptions,
  onStartExam,
  isLoading = false
}: ExamInstructionsProps) {
  const isStrictMode = ["test", "recruitment", "competition", "challenge"].includes(category);
  const isPracticeMode = category === "practice";

  const getCategoryConfig = () => {
    switch (category) {
      case "practice":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          features: [
            "Immediate feedback after each question",
            "Explanations for correct answers",
            "Full navigation (previous/next)",
            "Optional timer",
            "No anti-cheat monitoring"
          ]
        };
      case "test":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          features: [
            "Timed examination",
            "No immediate feedback",
            "Navigation allowed",
            "Basic anti-cheat monitoring",
            "Results shown after completion"
          ]
        };
      case "recruitment":
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200",
          features: [
            "Linear navigation only",
            "Strict anti-cheat monitoring",
            "Automatic fullscreen",
            "No feedback during exam",
            "Professional assessment"
          ]
        };
      case "competition":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          features: [
            "Linear navigation only",
            "Strict anti-cheat monitoring",
            "Automatic fullscreen",
            "Leaderboard ranking",
            "Competitive assessment"
          ]
        };
      case "challenge":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          features: [
            "Live challenge mode",
            "Real-time progress tracking",
            "Strict anti-cheat monitoring",
            "Limited time only",
            "Live leaderboard updates"
          ]
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          features: ["Standard exam mode"]
        };
    }
  };

  const categoryConfig = getCategoryConfig();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div>
              <CardTitle className="text-2xl mb-2">{title}</CardTitle>
              <CardDescription>{examType} Examination</CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge className={categoryConfig.color}>
                {category.charAt(0).toUpperCase() + category.slice(1)} Mode
              </Badge>
              
              {timeLimit && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(timeLimit)}
                </Badge>
              )}
              
              {shuffleQuestions && (
                <Badge variant="outline">
                  Questions Shuffled
                </Badge>
              )}
              
              {shuffleOptions && (
                <Badge variant="outline">
                  Options Shuffled
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Basic Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Exam Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm leading-relaxed">{instruction}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Mode-specific Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {category.charAt(0).toUpperCase() + category.slice(1)} Mode Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {categoryConfig.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2.5 flex-shrink-0" />
                <span className="text-sm leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Anti-cheat Warning for Strict Modes */}
      {isStrictMode && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <strong>⚠️ Anti-cheat Monitoring Enabled</strong>
                <p className="mt-2 text-sm">
                  This exam uses advanced monitoring to ensure fairness and integrity. 
                  Any violation may result in automatic exam submission.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Monitor className="h-4 w-4" />
                    Screen Monitoring
                  </div>
                  <ul className="ml-6 space-y-1 text-xs">
                    <li>• Automatic fullscreen mode</li>
                    <li>• Exit detection and prevention</li>
                    <li>• Window focus monitoring</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Eye className="h-4 w-4" />
                    Activity Monitoring
                  </div>
                  <ul className="ml-6 space-y-1 text-xs">
                    <li>• Tab switching detection</li>
                    <li>• Application switching alerts</li>
                    <li>• Mouse activity tracking</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Keyboard className="h-4 w-4" />
                    Input Monitoring
                  </div>
                  <ul className="ml-6 space-y-1 text-xs">
                    <li>• Copy/paste prevention</li>
                    <li>• Keyboard shortcut blocking</li>
                    <li>• Developer tools blocking</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <MousePointer className="h-4 w-4" />
                    Navigation Control
                  </div>
                  <ul className="ml-6 space-y-1 text-xs">
                    <li>• Right-click menu disabled</li>
                    <li>• Browser navigation blocked</li>
                    <li>• Linear question progression</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-medium text-red-800">
                  Violation Policy: After 10 violations, your exam will be automatically submitted. 
                  Make sure you&apos;re in a quiet environment with no distractions.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Practice Mode Notice */}
      {isPracticeMode && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>Practice Mode Benefits:</strong> This is a learning-focused mode where you&apos;ll receive 
            immediate feedback and explanations. Take your time to understand each concept.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Pre-exam Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Before You Start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Technical Requirements:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Stable internet connection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Modern web browser
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {isStrictMode ? "Fullscreen capability" : "Comfortable screen size"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  No browser extensions that may interfere
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Environment Setup:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Quiet, distraction-free space
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {timeLimit ? `${formatDuration(timeLimit)} of uninterrupted time` : "Adequate time available"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {isStrictMode ? "No other applications running" : "Minimal distractions"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Necessary materials within reach
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={onStartExam}
          disabled={isLoading}
          size="lg"
          className="px-12 py-3 text-lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
              Starting Exam...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-3" />
              I&apos;m Ready - Start Exam
            </>
          )}
        </Button>
      </div>

      {isStrictMode && (
        <p className="text-center text-xs text-muted-foreground">
          By starting this exam, you acknowledge that anti-cheat monitoring will be active 
          and that violations may result in automatic submission.
        </p>
      )}
    </div>
  );
}