"use client";

import { useState, useEffect } from "react";
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
import { CreateExamFormProps, Question } from "@/types/exam";

// Dummy questions for demonstration
const DUMMY_QUESTIONS: Question[] = [
  {
    question_id: "q1",
    exam_type: "WAEC",
    year: 2024,
    subject: "Mathematics",
    question_text: "What is the value of x in the equation 2x + 5 = 15?",
    question_type: "multiple_choice",
    question_image: "",
    options: [
      { option_text: "3", option_image: "", is_correct: false },
      { option_text: "5", option_image: "", is_correct: true },
      { option_text: "7", option_image: "", is_correct: false },
      { option_text: "10", option_image: "", is_correct: false },
    ],
    question_point: 2,
    answer_explanation:
      "Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5",
    difficulty_level: "easy",
    tags: ["algebra", "equations"],
    time_limit: 120,
    language: "en",
  },
  {
    question_id: "q2",
    exam_type: "WAEC",
    year: 2024,
    subject: "Mathematics",
    question_text: "Is the square root of 16 equal to 4?",
    question_type: "true_false",
    question_image: "",
    options: [
      { option_text: "True", option_image: "", is_correct: true },
      { option_text: "False", option_image: "", is_correct: false },
    ],
    question_point: 1,
    answer_explanation: "The square root of 16 is 4 because 4 × 4 = 16",
    difficulty_level: "easy",
    tags: ["square roots", "basic math"],
    time_limit: 60,
    language: "en",
  },
  {
    question_id: "q3",
    exam_type: "JAMB",
    year: 2023,
    subject: "Physics",
    question_text: "What is the SI unit of force?",
    question_type: "multiple_choice",
    question_image: "",
    options: [
      { option_text: "Joule", option_image: "", is_correct: false },
      { option_text: "Newton", option_image: "", is_correct: true },
      { option_text: "Watt", option_image: "", is_correct: false },
      { option_text: "Pascal", option_image: "", is_correct: false },
    ],
    question_point: 2,
    answer_explanation:
      "The Newton (N) is the SI unit of force, named after Isaac Newton",
    difficulty_level: "easy",
    tags: ["units", "mechanics"],
    time_limit: 90,
    language: "en",
  },
  {
    question_id: "q4",
    exam_type: "JAMB",
    year: 2023,
    subject: "Physics",
    question_text: "Does light travel faster than sound?",
    question_type: "true_false",
    question_image: "",
    options: [
      { option_text: "True", option_image: "", is_correct: true },
      { option_text: "False", option_image: "", is_correct: false },
    ],
    question_point: 1,
    answer_explanation:
      "Light travels at approximately 299,792,458 m/s while sound travels at about 343 m/s in air",
    difficulty_level: "easy",
    tags: ["waves", "speed"],
    time_limit: 60,
    language: "en",
  },
];

export default function CreateExamForm({
  initialData = {},
  onSubmit,
  isEditing = false,
}: CreateExamFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);

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
  });

  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>(
    initialData.questions || []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData.start_date ? new Date(initialData.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData.end_date ? new Date(initialData.end_date) : undefined
  );
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Update dates when initialData changes
  useEffect(() => {
    if (initialData.start_date) {
      setStartDate(new Date(initialData.start_date));
    }
    if (initialData.end_date) {
      setEndDate(new Date(initialData.end_date));
    }
  }, [initialData.start_date, initialData.end_date]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setQuestionFilters((prev) => ({ ...prev, [field]: value }));
  };

  const getFilteredQuestions = () => {
    return DUMMY_QUESTIONS.filter((q) => {
      if (
        questionFilters.exam_type &&
        q.exam_type !== questionFilters.exam_type
      )
        return false;
      if (questionFilters.year && q.year.toString() !== questionFilters.year)
        return false;
      if (questionFilters.subject && q.subject !== questionFilters.subject)
        return false;
      return true;
    });
  };

  const toggleQuestionSelection = (question: Question) => {
    setSelectedQuestions((prev) => {
      const isSelected = prev.some(
        (q) => q.question_id === question.question_id
      );
      if (isSelected) {
        return prev.filter((q) => q.question_id !== question.question_id);
      } else {
        return [...prev, question];
      }
    });
  };

  const removeQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.filter((q) => q.question_id !== questionId)
    );
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      const formattedDate = date.toISOString();
      handleInputChange("start_date", formattedDate);
      setStartDateOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      const formattedDate = date.toISOString();
      handleInputChange("end_date", formattedDate);
      setEndDateOpen(false);
    }
  };

  const calculateTotalPoints = () => {
    return selectedQuestions.reduce((sum, q) => sum + q.question_point, 0);
  };

  const validateForm = (): boolean => {
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
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      const examData = {
        exam_type: formData.exam_type,
        subject: formData.subject,
        year: parseInt(formData.year),
        title: formData.title,
        description: formData.description || "",
        duration: parseInt(formData.duration),
        passing_score: formData.passing_score
          ? parseFloat(formData.passing_score)
          : null,
        max_attempts: formData.max_attempts
          ? parseInt(formData.max_attempts)
          : null,
        shuffle_questions: formData.shuffle_questions,
        randomize_options: formData.randomize_options,
        is_public: formData.is_public,
        is_free: formData.is_free,
        status: formData.status,
        category: formData.category || "",
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        questions: selectedQuestions,
      };

      if (onSubmit) {
        await onSubmit(examData);
      } else {
        console.log("Exam Data:", examData);
      }

      toast.success(
        isEditing ? "Exam updated successfully!" : "Exam created successfully!"
      );
    } catch (error) {
      console.error("Error saving exam:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuestions = getFilteredQuestions();

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
                onClick={() => setShowQuestionSearch(!showQuestionSearch)}
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
                  <div className="grid md:grid-cols-3 gap-4">
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
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredQuestions.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No questions found matching the filters
                      </p>
                    ) : (
                      filteredQuestions.map((question) => {
                        const isSelected = selectedQuestions.some(
                          (q) => q.question_id === question.question_id
                        );
                        return (
                          <div
                            key={question.question_id}
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
                                    {question.exam_type}
                                  </span>
                                  <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                    {question.year}
                                  </span>
                                  <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                    {question.subject}
                                  </span>
                                  <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
                                    {question.question_point} pts
                                  </span>
                                </div>
                                <p className="text-sm font-medium mb-1">
                                  {question.question_text}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Type: {question.question_type} | Difficulty:{" "}
                                  {question.difficulty_level}
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
                    <span className="font-medium">
                      {calculateTotalPoints()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.question_id}
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
                                {question.exam_type}
                              </span>
                              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                                {question.subject}
                              </span>
                              <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
                                {question.question_point} pts
                              </span>
                            </div>
                            <p className="text-sm font-medium">
                              {question.question_text}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(question.question_id)}
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

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full md:w-fit"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Saving Exam" : "Save Exam"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
