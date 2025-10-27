"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Shuffle, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Shield,
  Timer,
  Hash,
  Zap
} from "lucide-react";
import type { Exam } from "@/types/exam-session";
import type { ExamConfig } from "@/hooks/use-exam-session";

interface ExamConfigProps {
  exam: Exam;
  category: string;
  onConfigChange: (config: ExamConfig) => void;
  onStartExam: () => void;
  isLoading?: boolean;
}

export function ExamConfigComponent({ 
  exam, 
  category, 
  onConfigChange, 
  onStartExam,
  isLoading = false 
}: ExamConfigProps) {
  const [config, setConfig] = useState<ExamConfig>({
    numQuestions: Math.min(20, exam.totalQuestions || 20),
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.randomizeOptions,
    timeLimit: exam.duration || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isTestMode = category === "test";
  const isPracticeMode = category === "practice";
  const isConfigurable = isPracticeMode || isTestMode;

  // Validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (config.numQuestions < 1) {
      newErrors.numQuestions = "Number of questions must be at least 1";
    }
    if (config.numQuestions > (exam.totalQuestions || 80)) {
      newErrors.numQuestions = `Maximum ${exam.totalQuestions || 80} questions available`;
    }

    if (isTestMode && !config.timeLimit) {
      newErrors.timeLimit = "Time limit is required for test mode";
    }
    if (config.timeLimit && config.timeLimit < 1) {
      newErrors.timeLimit = "Time limit must be at least 1 minute";
    }
    if (config.timeLimit && config.timeLimit > 600) {
      newErrors.timeLimit = "Time limit cannot exceed 600 minutes";
    }

    setErrors(newErrors);
  }, [config, isTestMode, exam.totalQuestions]);

  // Update parent when config changes
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updateConfig = (updates: Partial<ExamConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const canStartExam = Object.keys(errors).length === 0 && !isLoading;

  const getTimerTypeLabel = () => {
    if (isPracticeMode) return "Advisory (informational)";
    return "Enforced countdown";
  };

  const getCategoryInfo = () => {
    switch (category) {
      case "practice":
        return {
          icon: <Zap className="h-4 w-4" />,
          label: "Practice Mode",
          description: "Learn with immediate feedback and flexible settings",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case "test":
        return {
          icon: <Timer className="h-4 w-4" />,
          label: "Test Mode", 
          description: "Timed assessment with anti-cheat monitoring",
          color: "bg-orange-100 text-orange-800 border-orange-200"
        };
      case "recruitment":
        return {
          icon: <Shield className="h-4 w-4" />,
          label: "Recruitment",
          description: "Professional assessment with strict monitoring",
          color: "bg-purple-100 text-purple-800 border-purple-200"
        };
      case "competition":
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: "Competition",
          description: "Competitive exam with leaderboard ranking",
          color: "bg-green-100 text-green-800 border-green-200"
        };
      case "challenge":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          label: "Challenge",
          description: "Live challenge with real-time progress tracking",
          color: "bg-red-100 text-red-800 border-red-200"
        };
      default:
        return {
          icon: <Settings className="h-4 w-4" />,
          label: "Standard",
          description: "Standard exam configuration",
          color: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const categoryInfo = getCategoryInfo();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Exam Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {exam.title}
              </CardTitle>
              <CardDescription className="text-base">
                {exam.examType} {exam.year} • {exam.subject}
              </CardDescription>
              <div className="flex items-center gap-2">
                <Badge className={categoryInfo.color}>
                  {categoryInfo.icon}
                  <span className="ml-1">{categoryInfo.label}</span>
                </Badge>
                {exam.totalQuestions && (
                  <Badge variant="outline">
                    <Hash className="h-3 w-3 mr-1" />
                    {exam.totalQuestions} Questions Available
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {exam.description && (
            <CardDescription className="mt-4 text-sm leading-relaxed">
              {exam.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Category Info */}
      <Alert>
        <categoryInfo.icon.type className="h-4 w-4" />
        <AlertDescription>
          <strong>{categoryInfo.label}:</strong> {categoryInfo.description}
        </AlertDescription>
      </Alert>

      {/* Configuration Panel */}
      {isConfigurable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Exam Configuration
            </CardTitle>
            <CardDescription>
              Customize your exam settings below. {isTestMode && "Time limit is required for test mode."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Number of Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="num-questions" className="text-sm font-medium">
                  Number of Questions
                </Label>
                <span className="text-sm text-muted-foreground">
                  {config.numQuestions} of {exam.totalQuestions || 80}
                </span>
              </div>
              <div className="space-y-3">
                <Slider
                  id="num-questions"
                  min={1}
                  max={exam.totalQuestions || 80}
                  step={1}
                  value={[config.numQuestions]}
                  onValueChange={([value]) => updateConfig({ numQuestions: value })}
                  className="w-full"
                />
                {errors.numQuestions && (
                  <p className="text-sm text-red-600">{errors.numQuestions}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Question Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffle-questions" className="text-sm font-medium">
                    Shuffle Questions
                  </Label>
                  <Switch
                    id="shuffle-questions"
                    checked={config.shuffleQuestions}
                    onCheckedChange={(checked) => updateConfig({ shuffleQuestions: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Randomize the order of questions
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffle-options" className="text-sm font-medium">
                    Shuffle Options
                  </Label>
                  <Switch
                    id="shuffle-options"
                    checked={config.shuffleOptions}
                    onCheckedChange={(checked) => updateConfig({ shuffleOptions: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Randomize the order of answer options
                </p>
              </div>
            </div>

            <Separator />

            {/* Time Limit */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="time-limit" className="text-sm font-medium">
                  Time Limit {isTestMode && <span className="text-red-500">*</span>}
                </Label>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimerTypeLabel()}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    id="time-limit"
                    type="number"
                    min={1}
                    max={600}
                    value={config.timeLimit || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      updateConfig({ timeLimit: value });
                    }}
                    placeholder={isPracticeMode ? "Optional" : "Required"}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
                
                {config.timeLimit && (
                  <p className="text-xs text-muted-foreground">
                    Estimated time: ~{Math.round(config.timeLimit / config.numQuestions * 10) / 10} minutes per question
                  </p>
                )}
                
                {errors.timeLimit && (
                  <p className="text-sm text-red-600">{errors.timeLimit}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixed Configuration for Non-Configurable Exams */}
      {!isConfigurable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Exam Settings
            </CardTitle>
            <CardDescription>
              This exam has pre-configured settings that cannot be modified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Questions</p>
                <p className="text-2xl font-bold text-primary">{exam.totalQuestions || 0}</p>
              </div>
              
              {exam.duration && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-2xl font-bold text-primary">{exam.duration}m</p>
                </div>
              )}
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Question Order</p>
                <div className="flex items-center gap-1">
                  <Shuffle className="h-4 w-4" />
                  <p className="text-sm">{exam.shuffleQuestions ? "Shuffled" : "Fixed"}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Answer Options</p>
                <div className="flex items-center gap-1">
                  <Shuffle className="h-4 w-4" />
                  <p className="text-sm">{exam.randomizeOptions ? "Shuffled" : "Fixed"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anti-cheat Notice for Strict Exams */}
      {["test", "recruitment", "competition", "challenge"].includes(category) && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Anti-cheat monitoring is enabled.</strong> This exam includes:
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              <li>Automatic fullscreen enforcement</li>
              <li>Tab switching detection</li>
              <li>Copy/paste blocking</li>
              <li>Window focus monitoring</li>
              <li>Violation tracking and auto-submission</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Start Exam Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onStartExam}
          disabled={!canStartExam}
          size="lg"
          className="px-8"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Starting Exam...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Start Exam
            </>
          )}
        </Button>
      </div>

      {!canStartExam && Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please fix the configuration errors above before starting the exam.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}