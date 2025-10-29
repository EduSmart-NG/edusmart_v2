"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useTransition,
} from "react";
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
import { searchQuestions } from "@/lib/actions/exam-upload";
import { useCreateExam, useUpdateExam } from "@/hooks/use-exams";
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

interface FormData {
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
}

interface QuestionFilters {
  exam_type: string;
  year: string;
  subject: string;
  difficulty_level: string;
}

// ============================================
// COMPONENT
// ============================================

export default function CreateExamForm({
  initialData = {},
  isEditing = false,
  examId,
}: CreateExamFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // reCAPTCHA hook
  const {
    generateToken,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
  } = useRecaptchaToken();

  // TanStack Query mutations
  const createMutation = useCreateExam({
    onSuccess: (data) => {
      if (data.success) {
        // Navigation is handled in handleSubmit based on addAnother flag
      }
    },
  });

  const updateMutation = useUpdateExam({
    onSuccess: (data) => {
      if (data.success) {
        // Navigation is handled in handleSubmit based on addAnother flag
      }
    },
  });

  const [formData, setFormData] = useState<FormData>(() => ({
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
  }));

  const [questionFilters, setQuestionFilters] = useState<QuestionFilters>({
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

  // Memoize total points and check if all available questions are selected
  const totalPoints = useMemo(() => {
    return selectedQuestions.reduce((sum, q) => sum + q.questionPoint, 0);
  }, [selectedQuestions]);

  const selectedQuestionIds = useMemo(() => {
    return new Set(selectedQuestions.map((q) => q.id));
  }, [selectedQuestions]);

  const allQuestionsSelected = useMemo(() => {
    return (
      availableQuestions.length > 0 &&
      availableQuestions.every((q) => selectedQuestionIds.has(q.id))
    );
  }, [availableQuestions, selectedQuestionIds]);

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

  // Optimized handlers with useCallback
  const handleInputChange = useCallback(
    (field: keyof FormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleFilterChange = useCallback(
    (field: keyof QuestionFilters, value: string) => {
      setQuestionFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const toggleQuestionSelection = useCallback((question: QuestionDecrypted) => {
    setSelectedQuestions((prev) => {
      const isSelected = prev.some((q) => q.id === question.id);
      return isSelected
        ? prev.filter((q) => q.id !== question.id)
        : [...prev, question];
    });
  }, []);

  const removeQuestion = useCallback((questionId: string) => {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }, []);

  // Fixed select all/unselect all logic
  const selectAllQuestions = useCallback(() => {
    setSelectedQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const newQuestions = availableQuestions.filter(
        (q) => !existingIds.has(q.id)
      );
      return [...prev, ...newQuestions];
    });
  }, [availableQuestions]);

  const unselectAllQuestions = useCallback(() => {
    setSelectedQuestions((prev) => {
      const availableIds = new Set(availableQuestions.map((q) => q.id));
      return prev.filter((q) => !availableIds.has(q.id));
    });
  }, [availableQuestions]);

  const handleStartDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      setFormData((prev) => ({ ...prev, start_date: date.toISOString() }));
      setStartDateOpen(false);
    }
  }, []);

  const handleEndDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      setFormData((prev) => ({ ...prev, end_date: date.toISOString() }));
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

  const handleSubmit = useCallback(
    async (addAnother: boolean = false) => {
      setErrors({});

      if (!validateForm()) {
        toast.error("Please fix the errors in the form");
        return;
      }

      try {
        const action = isEditing ? "exam_update" : "exam_create";
        const recaptchaToken = await generateToken(action);

        if (!recaptchaToken) {
          toast.error(
            recaptchaError || "Failed to verify reCAPTCHA. Please try again."
          );
          return;
        }

        // Prepare FormData for the mutation
        const formDataToSend = new FormData();

        // Add all form fields to FormData
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            formDataToSend.append(key, value.toString());
          }
        });

        // Add question IDs as JSON string (server expects JSON.parse)
        formDataToSend.append(
          "question_ids",
          JSON.stringify(selectedQuestions.map((q) => q.id))
        );

        // Call the appropriate mutation
        if (isEditing && examId) {
          const result = await updateMutation.mutateAsync({
            examId,
            data: formDataToSend,
            recaptchaToken,
          });

          if (result.success) {
            startTransition(() => {
              if (addAnother) {
                router.push("/cp/admin-dashboard/exams/new");
              } else {
                router.push("/cp/admin-dashboard/exams/");
              }
            });
          } else if (result.errors) {
            setErrors(result.errors);
          }
        } else {
          const result = await createMutation.mutateAsync({
            data: formDataToSend,
            recaptchaToken,
          });

          if (result.success) {
            startTransition(() => {
              if (addAnother) {
                router.push("/cp/admin-dashboard/exams/new");
              } else {
                router.push("/cp/admin-dashboard/exams/");
              }
            });
          } else if (result.errors) {
            setErrors(result.errors);
          }
        }
      } catch (error) {
        console.error("Error saving exam:", error);
        // The mutation hooks already handle error toasts
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
      createMutation,
      updateMutation,
      router,
    ]
  );

  const toggleQuestionSearch = useCallback(() => {
    setShowQuestionSearch((prev) => !prev);
  }, []);

  // Fetch questions when filters change
  useEffect(() => {
    if (showQuestionSearch) {
      fetchQuestions();
    }
  }, [questionFilters, showQuestionSearch, fetchQuestions]);

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    isRecaptchaLoading ||
    isPending;

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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      defaultMonth={startDate || new Date()}
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
                      disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
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

                  {/* Select All / Unselect All Buttons */}
                  {availableQuestions.length > 0 && (
                    <div className="pt-2 border-t flex gap-2">
                      {selectedQuestions.length < availableQuestions.length && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={selectAllQuestions}
                          disabled={
                            isSubmitting ||
                            isLoadingQuestions ||
                            allQuestionsSelected
                          }
                          className="text-green-600 border-green-600 hover:bg-green-50 disabled:opacity-50"
                        >
                          Select All ({availableQuestions.length})
                        </Button>
                      )}

                      {selectedQuestions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={unselectAllQuestions}
                          disabled={
                            isSubmitting ||
                            isLoadingQuestions ||
                            !selectedQuestions.some((q) =>
                              availableQuestions.some((aq) => aq.id === q.id)
                            )
                          }
                          className="text-red-600 border-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Unselect All
                        </Button>
                      )}
                    </div>
                  )}

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
                          const isSelected = selectedQuestionIds.has(
                            question.id
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
                          disabled={isSubmitting}
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

          {/* Form Actions */}
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <div className="flex flex-col md:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={() => handleSubmit(false)}
                className="w-full md:w-fit"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Saving..." : "Save and Exit"}
              </Button>

              <Button
                onClick={() => handleSubmit(true)}
                className="w-full md:w-fit"
                disabled={isSubmitting}
              >
                {isSubmitting && (
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
