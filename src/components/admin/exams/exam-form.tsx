"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRecaptchaToken } from "@/hooks/use-recaptcha-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  EXAM_CATEGORIES,
  EXAM_STATUS,
  EXAM_TYPES,
  SUBJECTS,
  YEARS,
} from "@/lib/utils/exam";
import {
  createExam,
  updateExam,
  searchQuestions,
} from "@/lib/actions/exam-upload";
import type { QuestionDecrypted } from "@/types/exam-api";

// ============================================
// TYPES
// ============================================

interface CreateExamFormProps {
  initialData?: Partial<{
    exam_type: string;
    subject: string;
    year: string;
    title: string;
    description: string;
    duration: string;
    passing_score: string;
    max_attempts: string;
    shuffle_questions: boolean;
    randomize_options: boolean;
    is_public: boolean;
    is_free: boolean;
    status: string;
    category: string;
    start_date: string;
    end_date: string;
    questions: QuestionDecrypted[];
  }>;
  onSubmit?: (data: { examId: string; exam: unknown }) => Promise<void>;
  isEditing?: boolean;
  examId?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function CreateExamForm({
  initialData = {},
  onSubmit,
  isEditing = false,
  examId,
}: CreateExamFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // reCAPTCHA hook
  const {
    generateToken,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
  } = useRecaptchaToken();

  const [formData, setFormData] = useState({
    exam_type: initialData.exam_type || "",
    subject: initialData.subject || "",
    year: initialData.year || "",
    title: initialData.title || "",
    description: initialData.description || "",
    duration: initialData.duration || "",
    passing_score: initialData.passing_score || "",
    max_attempts: initialData.max_attempts || "",
    shuffle_questions: initialData.shuffle_questions || false,
    randomize_options: initialData.randomize_options || false,
    is_public: initialData.is_public || false,
    is_free: initialData.is_free || false,
    status: initialData.status || "draft",
    category: initialData.category || "",
    start_date: initialData.start_date || "",
    end_date: initialData.end_date || "",
  });

  const [questionFilters, setQuestionFilters] = useState({
    exam_type: "",
    year: "",
    subject: "",
    difficulty_level: "",
  });

  const [availableQuestions, setAvailableQuestions] = useState<
    QuestionDecrypted[]
  >([]);
  const [selectedQuestions, setSelectedQuestions] = useState<
    QuestionDecrypted[]
  >(initialData.questions || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData.start_date ? new Date(initialData.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData.end_date ? new Date(initialData.end_date) : undefined
  );
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Memoize the total points calculation
  const totalPoints = useMemo(() => {
    return selectedQuestions.reduce((sum, q) => sum + q.questionPoint, 0);
  }, [selectedQuestions]);

  // Memoized fetch questions function
  const fetchQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      const filters: Record<string, string | number> = {
        limit: 50,
        offset: 0,
      };

      if (questionFilters.exam_type)
        filters.exam_type = questionFilters.exam_type;
      if (questionFilters.year) filters.year = parseInt(questionFilters.year);
      if (questionFilters.subject) filters.subject = questionFilters.subject;
      if (questionFilters.difficulty_level)
        filters.difficulty_level = questionFilters.difficulty_level;

      const result = await searchQuestions(filters);

      if (result.success && "data" in result) {
        setAvailableQuestions(result.data.questions);
      } else {
        toast.error(result.message || "Failed to load questions");
        setAvailableQuestions([]);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
      setAvailableQuestions([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [questionFilters]);

  // Memoized handlers
  const handleInputChange = useCallback(
    (field: string, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (prev[field]) {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        }
        return prev;
      });
    },
    []
  );

  const handleFilterChange = useCallback((field: string, value: string) => {
    setQuestionFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleQuestionSelection = useCallback((question: QuestionDecrypted) => {
    setSelectedQuestions((prev) => {
      const isSelected = prev.some((q) => q.id === question.id);
      if (isSelected) {
        return prev.filter((q) => q.id !== question.id);
      } else {
        return [...prev, question];
      }
    });
  }, []);

  const removeQuestion = useCallback((questionId: string) => {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }, []);

  const handleStartDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      const formattedDate = date.toISOString();
      setFormData((prev) => ({ ...prev, start_date: formattedDate }));
      setStartDateOpen(false);
    }
  }, []);

  const handleEndDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      const formattedDate = date.toISOString();
      setFormData((prev) => ({ ...prev, end_date: formattedDate }));
      setEndDateOpen(false);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.exam_type) newErrors.exam_type = "Exam type is required";
    if (!formData.subject) newErrors.subject = "Subject is required";
    if (!formData.year) newErrors.year = "Year is required";
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.duration) newErrors.duration = "Duration is required";
    if (!formData.status) newErrors.status = "Status is required";

    if (selectedQuestions.length === 0) {
      newErrors.questions = "At least one question must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedQuestions.length]);

  const resetForm = useCallback(() => {
    setFormData({
      exam_type: initialData.exam_type || "",
      subject: initialData.subject || "",
      year: initialData.year || "",
      title: initialData.title || "",
      description: initialData.description || "",
      duration: initialData.duration || "",
      passing_score: initialData.passing_score || "",
      max_attempts: initialData.max_attempts || "",
      shuffle_questions: initialData.shuffle_questions || false,
      randomize_options: initialData.randomize_options || false,
      is_public: initialData.is_public || false,
      is_free: initialData.is_free || false,
      status: initialData.status || "draft",
      category: initialData.category || "",
      start_date: initialData.start_date || "",
      end_date: initialData.end_date || "",
    });

    setSelectedQuestions(initialData.questions || []);
    setStartDate(
      initialData.start_date ? new Date(initialData.start_date) : undefined
    );
    setEndDate(
      initialData.end_date ? new Date(initialData.end_date) : undefined
    );
    setErrors({});
  }, [initialData]);

  const handleSubmit = useCallback(
    async (addAnother: boolean = false) => {
      // Clear previous errors
      setErrors({});

      if (!validateForm()) {
        toast.error("Please fix the errors in the form");
        return;
      }

      setIsLoading(true);

      try {
        // Generate reCAPTCHA token
        const action = isEditing ? "exam_update" : "exam_create";
        const recaptchaToken = await generateToken(action);

        if (!recaptchaToken) {
          toast.error(
            recaptchaError || "Failed to verify reCAPTCHA. Please try again."
          );
          setIsLoading(false);
          return;
        }

        // Create FormData
        const formDataToSend = new FormData();
        formDataToSend.append("exam_type", formData.exam_type);
        formDataToSend.append("subject", formData.subject);
        formDataToSend.append("year", formData.year);
        formDataToSend.append("title", formData.title);
        formDataToSend.append("description", formData.description || "");
        formDataToSend.append("duration", formData.duration);
        formDataToSend.append("passing_score", formData.passing_score || "");
        formDataToSend.append("max_attempts", formData.max_attempts || "");
        formDataToSend.append(
          "shuffle_questions",
          String(formData.shuffle_questions)
        );
        formDataToSend.append(
          "randomize_options",
          String(formData.randomize_options)
        );
        formDataToSend.append("is_public", String(formData.is_public));
        formDataToSend.append("is_free", String(formData.is_free));
        formDataToSend.append("status", formData.status);
        formDataToSend.append("category", formData.category || "");
        formDataToSend.append("start_date", formData.start_date || "");
        formDataToSend.append("end_date", formData.end_date || "");
        formDataToSend.append(
          "question_ids",
          JSON.stringify(selectedQuestions.map((q) => q.id))
        );

        // Log data being sent for debugging
        console.log("Form data being sent:", {
          exam_type: formData.exam_type,
          subject: formData.subject,
          year: formData.year,
          title: formData.title,
          description: formData.description,
          duration: formData.duration,
          passing_score: formData.passing_score,
          max_attempts: formData.max_attempts,
          status: formData.status,
          category: formData.category,
          start_date: formData.start_date,
          end_date: formData.end_date,
          question_count: selectedQuestions.length,
        });

        // Call appropriate server action
        const result =
          isEditing && examId
            ? await updateExam(examId, formDataToSend, recaptchaToken)
            : await createExam(formDataToSend, recaptchaToken);

        if (result.success) {
          toast.success(result.message, {
            description: `Exam ID: ${result.data.examId}`,
            duration: 5000,
          });

          // Call custom onSubmit if provided
          if (onSubmit) {
            try {
              await onSubmit(result.data);
            } catch (error) {
              console.error("Custom onSubmit handler error:", error);
            }
          }

          // Reset form if adding another
          if (addAnother) {
            resetForm();
            setShowQuestionSearch(false);
          } else {
            router.replace("/cp/admin-dashboard/exams/");
          }
        } else {
          // Show detailed error message
          toast.error(result.message, {
            description: result.errors
              ? Object.entries(result.errors)
                  .map(([field, msg]) => `${field}: ${msg}`)
                  .join(", ")
              : undefined,
            duration: 5000,
          });

          // Set field-specific errors
          if (result.errors) {
            setErrors(result.errors);
            console.error("Form validation errors:", result.errors);
          }
        }
      } catch (error) {
        console.error("Error saving exam:", error);
        toast.error("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      validateForm,
      isEditing,
      generateToken,
      recaptchaError,
      formData,
      selectedQuestions,
      examId,
      onSubmit,
      router,
      resetForm,
    ]
  );

  const toggleQuestionSearch = useCallback(() => {
    setShowQuestionSearch((prev) => !prev);
  }, []);

  // Update dates when initialData changes
  useEffect(() => {
    if (initialData.start_date) {
      setStartDate(new Date(initialData.start_date));
    }
    if (initialData.end_date) {
      setEndDate(new Date(initialData.end_date));
    }
  }, [initialData.start_date, initialData.end_date]);

  // Fetch questions when filters change
  useEffect(() => {
    if (showQuestionSearch) {
      fetchQuestions();
    }
  }, [questionFilters, showQuestionSearch, fetchQuestions]);

  return (
    <div>
      <Card className="px-4 md:px-8 py-6">
        <div className="flex flex-col gap-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Basic Information</h4>
              <p className="text-sm text-gray-600">
                General details about the exam
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="exam_type">
                  Exam Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.exam_type}
                  onValueChange={(value) =>
                    handleInputChange("exam_type", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.exam_type && (
                  <p className="text-xs text-red-500">{errors.exam_type}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => handleInputChange("subject", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subject && (
                  <p className="text-xs text-red-500">{errors.subject}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="year">
                  Year <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.year}
                  onValueChange={(value) => handleInputChange("year", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.year && (
                  <p className="text-xs text-red-500">{errors.year}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="title">
                Exam Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., WAEC Mathematics 2024 Mock Exam"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description or instructions for the exam..."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                disabled={isLoading}
                rows={3}
              />
            </div>
          </div>

          {/* Exam Settings */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Exam Settings</h4>
              <p className="text-sm text-gray-600">
                Configure exam parameters and behavior
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="duration">
                  Duration (minutes) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 120"
                  value={formData.duration}
                  onChange={(e) =>
                    handleInputChange("duration", e.target.value)
                  }
                  disabled={isLoading}
                />
                {errors.duration && (
                  <p className="text-xs text-red-500">{errors.duration}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="passing_score">Passing Score (Optional)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  placeholder="e.g., 50"
                  value={formData.passing_score}
                  onChange={(e) =>
                    handleInputChange("passing_score", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="max_attempts">Max Attempts (Optional)</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  placeholder="e.g., 3"
                  value={formData.max_attempts}
                  onChange={(e) =>
                    handleInputChange("max_attempts", e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-xs text-red-500">{errors.status}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="start_date">Start Date (Optional)</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="start_date"
                      className="w-full justify-between font-normal bg-transparent"
                      type="button"
                      disabled={isLoading}
                    >
                      {startDate
                        ? startDate.toLocaleDateString()
                        : "Select start date"}
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-full overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateSelect}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                      defaultMonth={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="end_date"
                      className="w-full justify-between font-normal bg-transparent"
                      type="button"
                      disabled={isLoading}
                    >
                      {endDate
                        ? endDate.toLocaleDateString()
                        : "Select end date"}
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-full overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateSelect}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                      defaultMonth={startDate || new Date()}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="shuffle_questions" className="text-sm">
                  Shuffle Questions
                </Label>
                <Switch
                  id="shuffle_questions"
                  checked={formData.shuffle_questions}
                  onCheckedChange={(checked) =>
                    handleInputChange("shuffle_questions", checked)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="randomize_options" className="text-sm">
                  Randomize Options
                </Label>
                <Switch
                  id="randomize_options"
                  checked={formData.randomize_options}
                  onCheckedChange={(checked) =>
                    handleInputChange("randomize_options", checked)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="is_public" className="text-sm">
                  Public Access
                </Label>
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_public", checked)
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="is_free" className="text-sm">
                  Free to Take
                </Label>
                <Switch
                  id="is_free"
                  checked={formData.is_free}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_free", checked)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Question Selection */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Select Questions</h4>
              <p className="text-sm text-gray-600">
                Add questions to this exam from the question bank
              </p>
            </div>

            {errors.questions && (
              <p className="text-xs text-red-500">{errors.questions}</p>
            )}

            {/* Question Search/Filter */}
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={toggleQuestionSearch}
                disabled={isLoading}
                className="w-full md:w-fit"
              >
                <Search className="h-4 w-4 mr-2" />
                {showQuestionSearch
                  ? "Hide Question Bank"
                  : "Browse Question Bank"}
              </Button>

              {showQuestionSearch && (
                <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="filter_exam_type" className="text-sm">
                        Filter by Exam Type
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={questionFilters.exam_type}
                          onValueChange={(value) =>
                            handleFilterChange("exam_type", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All exam types" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXAM_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {questionFilters.exam_type && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFilterChange("exam_type", "")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="filter_year" className="text-sm">
                        Filter by Year
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={questionFilters.year}
                          onValueChange={(value) =>
                            handleFilterChange("year", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All years" />
                          </SelectTrigger>
                          <SelectContent>
                            {YEARS.slice(0, 5).map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {questionFilters.year && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFilterChange("year", "")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="filter_subject" className="text-sm">
                        Filter by Subject
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={questionFilters.subject}
                          onValueChange={(value) =>
                            handleFilterChange("subject", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All subjects" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBJECTS.slice(0, 10).map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {questionFilters.subject && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFilterChange("subject", "")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="filter_difficulty" className="text-sm">
                        Filter by Difficulty
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={questionFilters.difficulty_level}
                          onValueChange={(value) =>
                            handleFilterChange("difficulty_level", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        {questionFilters.difficulty_level && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleFilterChange("difficulty_level", "")
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isLoadingQuestions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableQuestions.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No questions found matching the filters
                        </p>
                      ) : (
                        availableQuestions.map((question) => {
                          const isSelected = selectedQuestions.some(
                            (q) => q.id === question.id
                          );
                          return (
                            <div
                              key={question.id}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/10 border-primary"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                              onClick={() => toggleQuestionSelection(question)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                      {question.examType}
                                    </span>
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                      {question.year}
                                    </span>
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                      {question.subject}
                                    </span>
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-primary">
                                      {question.questionPoint} pts
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium mb-1">
                                    {question.questionText}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  {isSelected ? (
                                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                                      ✓
                                    </div>
                                  ) : (
                                    <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Questions */}
            {selectedQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">
                    Selected Questions ({selectedQuestions.length})
                  </h5>
                  <div className="text-sm text-gray-600">
                    Total Points:{" "}
                    <span className="font-medium">{totalPoints}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="border rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-medium text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                {question.examType}
                              </span>
                              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                {question.subject}
                              </span>
                              <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-primary">
                                {question.questionPoint} pts
                              </span>
                            </div>
                            <p className="text-sm font-medium">
                              {question.questionText}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>

            {/* Submit Buttons */}
            <div className="flex flex-col md:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={() => handleSubmit(false)}
                className="w-full md:w-fit"
                disabled={isLoading || isRecaptchaLoading}
              >
                {(isLoading || isRecaptchaLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLoading || isRecaptchaLoading ? "Saving" : "Save and Exit"}
              </Button>

              <Button
                onClick={() => handleSubmit(true)}
                className="w-full md:w-fit"
                disabled={isLoading || isRecaptchaLoading}
              >
                {(isLoading || isRecaptchaLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save and Add Another
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
