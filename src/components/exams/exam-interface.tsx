"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Clock,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import Image from "next/image";

// Mock exam data
const mockExamData = {
  exam_type: "JAMB",
  year: 2024,
  subject: "Mathematics",
  time_limit: 2400, // 40 minutes for 20 questions (120 seconds per question)
  questions: [
    {
      question_id: "q1",
      question_type: "multiple_choice",
      question_text: "What is the value of x in the equation 2x + 5 = 13?",
      question_image: "",
      options: [
        { option_text: "3", option_image: "", is_correct: false },
        { option_text: "4", option_image: "", is_correct: true },
        { option_text: "5", option_image: "", is_correct: false },
        { option_text: "6", option_image: "", is_correct: false },
      ],
      question_point: 2,
      difficulty_level: "easy",
      tags: ["algebra", "equations"],
    },
    {
      question_id: "q2",
      question_type: "true_false",
      question_text: "The sum of angles in a triangle is 180 degrees.",
      question_image: "",
      options: [
        { option_text: "True", option_image: "", is_correct: true },
        { option_text: "False", option_image: "", is_correct: false },
      ],
      question_point: 1,
      difficulty_level: "easy",
      tags: ["geometry"],
    },
    {
      question_id: "q3",
      question_type: "multiple_choice",
      question_text: "What is the derivative of x² with respect to x?",
      question_image: "",
      options: [
        { option_text: "x", option_image: "", is_correct: false },
        { option_text: "2x", option_image: "", is_correct: true },
        { option_text: "x²", option_image: "", is_correct: false },
        { option_text: "2x²", option_image: "", is_correct: false },
      ],
      question_point: 3,
      difficulty_level: "medium",
      tags: ["calculus", "derivatives"],
    },
    {
      question_id: "q4",
      question_type: "multiple_choice",
      question_text: "What is the value of sin(30°)?",
      question_image: "",
      options: [
        { option_text: "0", option_image: "", is_correct: false },
        { option_text: "0.5", option_image: "", is_correct: true },
        { option_text: "1", option_image: "", is_correct: false },
        { option_text: "√3/2", option_image: "", is_correct: false },
      ],
      question_point: 2,
      difficulty_level: "easy",
      tags: ["trigonometry"],
    },
    {
      question_id: "q5",
      question_type: "true_false",
      question_text:
        "The equation x² + y² = 25 represents a circle with radius 5.",
      question_image: "",
      options: [
        { option_text: "True", option_image: "", is_correct: true },
        { option_text: "False", option_image: "", is_correct: false },
      ],
      question_point: 1,
      difficulty_level: "easy",
      tags: ["geometry", "conic sections"],
    },
    {
      question_id: "q6",
      question_type: "multiple_choice",
      question_text: "Solve for x: 3x² - 12 = 0",
      question_image: "",
      options: [
        { option_text: "±2", option_image: "", is_correct: true },
        { option_text: "±3", option_image: "", is_correct: false },
        { option_text: "±4", option_image: "", is_correct: false },
        { option_text: "±1", option_image: "", is_correct: false },
      ],
      question_point: 3,
      difficulty_level: "medium",
      tags: ["algebra", "quadratic equations"],
    },
    {
      question_id: "q7",
      question_type: "multiple_choice",
      question_text:
        "What is the area of a circle with radius 7 cm? (Use π ≈ 22/7)",
      question_image: "",
      options: [
        { option_text: "44 cm²", option_image: "", is_correct: false },
        { option_text: "154 cm²", option_image: "", is_correct: true },
        { option_text: "22 cm²", option_image: "", is_correct: false },
        { option_text: "77 cm²", option_image: "", is_correct: false },
      ],
      question_point: 2,
      difficulty_level: "easy",
      tags: ["geometry", "area"],
    },
    {
      question_id: "q8",
      question_type: "true_false",
      question_text: "The function f(x) = x³ is an even function.",
      question_image: "",
      options: [
        { option_text: "True", option_image: "", is_correct: false },
        { option_text: "False", option_image: "", is_correct: true },
      ],
      question_point: 1,
      difficulty_level: "medium",
      tags: ["algebra", "functions"],
    },
    {
      question_id: "q9",
      question_type: "multiple_choice",
      question_text:
        "What is the probability of rolling a 6 on a fair six-sided die?",
      question_image: "",
      options: [
        { option_text: "1/6", option_image: "", is_correct: true },
        { option_text: "1/3", option_image: "", is_correct: false },
        { option_text: "1/2", option_image: "", is_correct: false },
        { option_text: "1/4", option_image: "", is_correct: false },
      ],
      question_point: 2,
      difficulty_level: "easy",
      tags: ["probability"],
    },
    {
      question_id: "q10",
      question_type: "multiple_choice",
      question_text: "What is the value of log₂(8)?",
      question_image: "",
      options: [
        { option_text: "2", option_image: "", is_correct: false },
        { option_text: "3", option_image: "", is_correct: true },
        { option_text: "4", option_image: "", is_correct: false },
        { option_text: "1", option_image: "", is_correct: false },
      ],
      question_point: 3,
      difficulty_level: "medium",
      tags: ["logarithms"],
    },
    {
      question_id: "q11",
      question_type: "true_false",
      question_text:
        "The median of a data set is always one of the data points.",
      question_image: "",
      options: [
        { option_text: "True", option_image: "", is_correct: false },
        { option_text: "False", option_image: "", is_correct: true },
      ],
      question_point: 1,
      difficulty_level: "medium",
      tags: ["statistics"],
    },
    {
      question_id: "q12",
      question_type: "multiple_choice",
      question_text: "What is the slope of the line y = 3x + 2?",
      question_image: "",
      options: [
        { option_text: "2", option_image: "", is_correct: false },
        { option_text: "3", option_image: "", is_correct: true },
        { option_text: "1", option_image: "", is_correct: false },
        { option_text: "0", option_image: "", is_correct: false },
      ],
      question_point: 2,
      difficulty_level: "easy",
      tags: ["algebra", "linear equations"],
    },
    {
      question_id: "q13",
      question_type: "multiple_choice",
      question_text: "Solve the inequality: 2x - 4 > 6",
      question_image: "",
      options: [
        { option_text: "x > 5", option_image: "", is_correct: true },
        { option_text: "x < 5", option_image: "", is_correct: false },
        { option_text: "x > 1", option_image: "", is_correct: false },
        { option_text: "x < 1", option_image: "", is_correct: false },
      ],
      question_point: 3,
      difficulty_level: "medium",
      tags: ["algebra", "inequalities"],
    },
    {
      question_id: "q14",
      question_type: "true_false",
      question_text:
        "The cosine of an angle in a right triangle is the ratio of the adjacent side to the hypotenuse.",
      question_image: "",
      options: [
        { option_text: "True", option_image: "", is_correct: true },
        { option_text: "False", option_image: "", is_correct: false },
      ],
      question_point: 1,
      difficulty_level: "easy",
      tags: ["trigonometry"],
    },
    {
      question_id: "q15",
      question_type: "multiple_choice",
      question_text: "What is the sum of the first 10 positive integers?",
      question_image: "",
      options: [
        { option_text: "45", option_image: "", is_correct: false },
        { option_text: "55", option_image: "", is_correct: true },
        { option_text: "50", option_image: "", is_correct: false },
        { option_text: "60", option_image: "", is_correct: false },
      ],
      question_point: 3,
      difficulty_level: "medium",
      tags: ["arithmetic", "series"],
    },
    {
      question_id: "q16",
      question_type: "multiple_choice",
      question_text: "What is the integral of 3x² dx?",
      question_image: "",
      options: [
        { option_text: "x³ + C", option_image: "", is_correct: true },
        { option_text: "3x³ + C", option_image: "", is_correct: false },
        { option_text: "x² + C", option_image: "", is_correct: false },
        { option_text: "3x + C", option_image: "", is_correct: false },
      ],
      question_point: 4,
      difficulty_level: "hard",
      tags: ["calculus", "integrals"],
    },
    {
      question_id: "q17",
      question_type: "true_false",
      question_text: "A square is a regular polygon.",
      question_image: "",
      options: [
        { option_text: "True", option_image: "", is_correct: true },
        { option_text: "False", option_image: "", is_correct: false },
      ],
      question_point: 1,
      difficulty_level: "easy",
      tags: ["geometry"],
    },
    {
      question_id: "q18",
      question_type: "multiple_choice",
      question_text: "What is the value of tan(45°)?",
      question_image: "",
      options: [
        { option_text: "0", option_image: "", is_correct: false },
        { option_text: "1", option_image: "", is_correct: true },
        { option_text: "√2", option_image: "", is_correct: false },
        { option_text: "√3", option_image: "", is_correct: false },
      ],
      question_point: 2,
      difficulty_level: "easy",
      tags: ["trigonometry"],
    },
    {
      question_id: "q19",
      question_type: "multiple_choice",
      question_text: "If f(x) = 2x + 3 and g(x) = x - 1, what is f(g(x))?",
      question_image: "",
      options: [
        { option_text: "2x + 1", option_image: "", is_correct: true },
        { option_text: "2x - 1", option_image: "", is_correct: false },
        { option_text: "x + 2", option_image: "", is_correct: false },
        { option_text: "2x + 3", option_image: "", is_correct: false },
      ],
      question_point: 4,
      difficulty_level: "hard",
      tags: ["algebra", "functions"],
    },
    {
      question_id: "q20",
      question_type: "true_false",
      question_text:
        "The mean of a data set is always greater than the median.",
      question_image: "",
      options: [
        { option_text: "True", option_image: "", is_correct: false },
        { option_text: "False", option_image: "", is_correct: true },
      ],
      question_point: 1,
      difficulty_level: "medium",
      tags: ["statistics"],
    },
  ],
};

const optionLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export default function ExamInterface() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(mockExamData.time_limit);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "warning" | "info";
    title: string;
    description: string;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = mockExamData.questions[currentQuestionIndex];
  const totalQuestions = mockExamData.questions.length;
  const answeredQuestions = Object.keys(answers).length;

  // Show alert function
  const showAlert = useCallback(
    (
      type: "success" | "warning" | "info",
      title: string,
      description: string,
      duration = 3000
    ) => {
      setAlertMessage({ type, title, description });

      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }

      alertTimeoutRef.current = setTimeout(() => {
        setAlertMessage(null);
      }, duration);
    },
    []
  );

  // Memoized submit function
  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const answeredCount = Object.keys(answers).length;
    const results = {
      answers,
      timeSpent: mockExamData.time_limit - timeRemaining,
      answeredCount,
      totalQuestions: mockExamData.questions.length,
    };

    console.log("Exam submitted:", results);
    showAlert(
      "success",
      "Exam Submitted",
      "Your exam has been submitted successfully!"
    );
    setShowSubmitDialog(false);
  }, [answers, timeRemaining, showAlert]);

  // Memoized auto-submit function
  const handleAutoSubmit = useCallback(() => {
    showAlert(
      "warning",
      "Time's Up!",
      "Submitting exam automatically...",
      2000
    );
    setTimeout(() => {
      submitExam();
    }, 2000);
  }, [submitExam, showAlert]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining, handleAutoSubmit]);

  // Disable copy/paste
  useEffect(() => {
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showAlert("warning", "Copy Disabled", "Copy is disabled during the exam");
    };

    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      showAlert(
        "warning",
        "Paste Disabled",
        "Paste is disabled during the exam"
      );
    };

    const preventCut = (e: ClipboardEvent) => {
      e.preventDefault();
      showAlert("warning", "Cut Disabled", "Cut is disabled during the exam");
    };

    document.addEventListener("copy", preventCopy);
    document.addEventListener("paste", preventPaste);
    document.addEventListener("cut", preventCut);

    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("paste", preventPaste);
      document.removeEventListener("cut", preventCut);
    };
  }, [showAlert]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Cleanup alert timeout on unmount
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // Memoized utility functions
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
      } catch (err) {
        console.error("Failed to enter fullscreen mode", err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error("Failed to exit fullscreen mode", err);
      }
    }
  }, []);

  const handleAnswerSelect = useCallback(
    (optionIndex: number) => {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.question_id]: optionIndex,
      }));
    },
    [currentQuestion.question_id]
  );

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }, [currentQuestionIndex, totalQuestions]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleQuestionNavigate = useCallback((index: number) => {
    setCurrentQuestionIndex(index);
  }, []);

  const handleSubmitClick = useCallback(() => {
    setShowSubmitDialog(true);
  }, []);

  const isQuestionAnswered = useCallback(
    (questionId: string) => {
      return questionId in answers;
    },
    [answers]
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 p-4 my-12">
      {/* Alert Notification */}
      {alertMessage && (
        <div className="fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-top-2">
          <Alert
            variant={
              alertMessage.type === "warning" ? "destructive" : "default"
            }
          >
            {alertMessage.type === "success" && (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {alertMessage.type === "warning" && (
              <AlertTriangle className="h-4 w-4" />
            )}
            {alertMessage.type === "info" && <Info className="h-4 w-4" />}
            <AlertTitle>{alertMessage.title}</AlertTitle>
            <AlertDescription>{alertMessage.description}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="px-4 md:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3>
                {mockExamData.exam_type} {mockExamData.year}
              </h3>
              <p className="text-sm text-gray-600">{mockExamData.subject}</p>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-4 py-2 ${timeRemaining < 300 ? "bg-red-600" : "bg-primary/10"} rounded-lg`}
              >
                <Clock
                  className={`h-5 w-5 ${timeRemaining < 300 ? "text-white" : "text-primary"}`}
                />
                <span
                  className={`font-mono font-bold ${
                    timeRemaining < 300 ? "text-white" : "text-primary"
                  }`}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="gap-2"
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="h-4 w-4" />
                    Exit
                  </>
                ) : (
                  <>
                    <Maximize className="h-4 w-4" />
                    Fullscreen
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Question Card */}
        <Card className="px-4 md:px-8 py-6">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium text-gray-600">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                    {currentQuestion.question_point}{" "}
                    {currentQuestion.question_point === 1 ? "point" : "points"}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded capitalize">
                    {currentQuestion.difficulty_level}
                  </span>
                </div>

                <div className="prose max-w-none">
                  <p className="text-lg mb-6 select-none">
                    {currentQuestion.question_text}
                  </p>
                  {currentQuestion.question_image && (
                    <div className="mb-6">
                      <Image
                        src={currentQuestion.question_image}
                        alt="Question diagram"
                        width={500}
                        height={500}
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected =
                  answers[currentQuestion.question_id] === index;
                const isTrueFalse =
                  currentQuestion.question_type === "true_false";

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {isTrueFalse
                          ? option.option_text.charAt(0)
                          : optionLabels[index]}
                      </div>
                      <div className="flex-1 space-y-2">
                        {option.option_text && (
                          <span className="block select-none">
                            {option.option_text}
                          </span>
                        )}
                        {option.option_image && (
                          <Image
                            src={option.option_image}
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
          </div>
        </Card>

        {/* Navigation */}
        <Card className="px-4 md:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentQuestionIndex === totalQuestions - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <Button onClick={handleSubmitClick} className="gap-2">
              <Send className="h-4 w-4" />
              Submit Exam
            </Button>
          </div>
        </Card>

        {/* Question Navigator */}
        <Card className="px-4 md:px-8 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4>Question Navigator</h4>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-primary"></div>
                  <span className="text-gray-600">
                    Answered ({answeredQuestions})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded border-2 border-gray-300"></div>
                  <span className="text-gray-600">
                    Unanswered ({totalQuestions - answeredQuestions})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {mockExamData.questions.map((question, index) => {
                const isAnswered = isQuestionAnswered(question.question_id);
                const isCurrent = index === currentQuestionIndex;

                return (
                  <Button
                    key={question.question_id}
                    variant={isAnswered ? "default" : "outline"}
                    onClick={() => handleQuestionNavigate(index)}
                    className={`h-10 w-full ${
                      isCurrent ? "ring-2 ring-primary ring-offset-2" : ""
                    }`}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your exam? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Questions:</span>
              <span className="font-medium">{totalQuestions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Answered:</span>
              <span className="font-medium text-green-600">
                {answeredQuestions}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unanswered:</span>
              <span className="font-medium text-red-600">
                {totalQuestions - answeredQuestions}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Time Remaining:</span>
              <span className="font-medium">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          {totalQuestions - answeredQuestions > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                You have {totalQuestions - answeredQuestions} unanswered{" "}
                {totalQuestions - answeredQuestions === 1
                  ? "question"
                  : "questions"}
                . Are you sure you want to submit?
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
            >
              Continue Exam
            </Button>
            <Button onClick={submitExam}>Submit Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
