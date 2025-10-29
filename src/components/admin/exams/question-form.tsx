"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Upload, X, Plus } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import {
  DIFFICULTY_LEVELS,
  EXAM_TYPES,
  optionLabels,
  QUESTION_TYPES,
  SUBJECTS,
  YEARS,
} from "@/lib/utils/exam";
import { AddQuestionFormProps } from "@/types/question";
import { useCreateQuestion, useUpdateQuestion } from "@/hooks/use-questions";
import type { QuestionUploadInput } from "@/lib/validations/question";

export default function AddQuestionForm({
  initialData = {},
  onSubmit,
  isEditing = false,
  questionId,
}: AddQuestionFormProps) {
  const router = useRouter();

  // TanStack Query mutations
  const createMutation = useCreateQuestion({
    onSuccess: (data) => {
      if (data.success) {
        // Call custom onSubmit if provided (for backward compatibility)
        if (onSubmit) {
          const legacyQuestionData = {
            exam_type: formData.exam_type,
            year: parseInt(formData.year),
            subject: formData.subject,
            question_type: formData.question_type,
            question_text: formData.question_text,
            question_image: questionImage?.name || "",
            options: options.map((opt) => ({
              option_text: opt.option_text,
              option_image:
                opt.option_image?.name || opt.option_image_preview || "",
              is_correct: opt.is_correct,
            })),
            question_point: parseFloat(formData.question_point),
            answer_explanation: formData.answer_explanation || "",
            difficulty_level: formData.difficulty_level,
            tags: formData.tags
              ? formData.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : [],
            time_limit: formData.time_limit
              ? parseInt(formData.time_limit)
              : null,
            language: "en",
          };

          try {
            onSubmit(legacyQuestionData, false);
          } catch (error) {
            console.error("Legacy onSubmit handler error:", error);
          }
        }

        // Navigate back to questions list
        router.push("/cp/admin-dashboard/questions");
      }
    },
  });

  const updateMutation = useUpdateQuestion({
    onSuccess: (data) => {
      if (data.success && questionId) {
        // Call custom onSubmit if provided (for backward compatibility)
        if (onSubmit) {
          const legacyQuestionData = {
            exam_type: formData.exam_type,
            year: parseInt(formData.year),
            subject: formData.subject,
            question_type: formData.question_type,
            question_text: formData.question_text,
            question_image: questionImage?.name || "",
            options: options.map((opt) => ({
              option_text: opt.option_text,
              option_image:
                opt.option_image?.name || opt.option_image_preview || "",
              is_correct: opt.is_correct,
            })),
            question_point: parseFloat(formData.question_point),
            answer_explanation: formData.answer_explanation || "",
            difficulty_level: formData.difficulty_level,
            tags: formData.tags
              ? formData.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : [],
            time_limit: formData.time_limit
              ? parseInt(formData.time_limit)
              : null,
            language: "en",
          };

          try {
            onSubmit(legacyQuestionData, false);
          } catch (error) {
            console.error("Legacy onSubmit handler error:", error);
          }
        }

        // Navigate back to questions list
        router.push("/cp/admin-dashboard/questions");
      }
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string>(
    initialData.question_image || ""
  );

  const [formData, setFormData] = useState({
    exam_type: initialData.exam_type || "",
    year: initialData.year || "",
    subject: initialData.subject || "",
    question_type: initialData.question_type || "",
    question_text: initialData.question_text || "",
    question_point: initialData.question_point || "",
    answer_explanation: initialData.answer_explanation || "",
    difficulty_level: initialData.difficulty_level || "",
    tags: initialData.tags || "",
    time_limit: initialData.time_limit || "",
  });

  const [options, setOptions] = useState(() => {
    // Initialize options from initialData if available
    if (initialData.options && initialData.options.length > 0) {
      return initialData.options.map((opt) => ({
        option_text: opt.option_text,
        option_image: null as File | null,
        option_image_preview: opt.option_image || "",
        is_correct: opt.is_correct,
      }));
    }

    // Default initialization
    return [
      {
        option_text: "",
        option_image: null as File | null,
        option_image_preview: "",
        is_correct: false,
      },
      {
        option_text: "",
        option_image: null as File | null,
        option_image_preview: "",
        is_correct: false,
      },
    ];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update question image preview when initialData changes
  useEffect(() => {
    if (initialData.question_image) {
      setQuestionImagePreview(initialData.question_image);
    }
  }, [initialData.question_image]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleQuestionImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image too large", {
          description: "Question image must be less than 10MB",
        });
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type", {
          description: "Only JPEG, PNG, WebP, and GIF images are allowed",
        });
        return;
      }

      setQuestionImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuestionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeQuestionImage = () => {
    setQuestionImage(null);
    setQuestionImagePreview(initialData.question_image || "");
  };

  const handleOptionImageUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image too large", {
          description: "Option image must be less than 10MB",
        });
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type", {
          description: "Only JPEG, PNG, WebP, and GIF images are allowed",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setOptions((prev) =>
          prev.map((opt, i) =>
            i === index
              ? {
                  ...opt,
                  option_image: file,
                  option_image_preview: reader.result as string,
                }
              : opt
          )
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const removeOptionImage = (index: number) => {
    // Restore original image if it exists in initialData
    const originalImage =
      initialData.options && initialData.options[index]
        ? initialData.options[index].option_image
        : "";

    setOptions((prev) =>
      prev.map((opt, i) =>
        i === index
          ? {
              ...opt,
              option_image: null,
              option_image_preview: originalImage,
            }
          : opt
      )
    );
  };

  const handleOptionTextChange = (index: number, value: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, option_text: value } : opt))
    );
  };

  const handleOptionCorrectToggle = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({ ...opt, is_correct: i === index }))
    );
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions((prev) => [
        ...prev,
        {
          option_text: "",
          option_image: null,
          option_image_preview: "",
          is_correct: false,
        },
      ]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleQuestionTypeChange = (value: string) => {
    handleInputChange("question_type", value);
    if (value === "true_false") {
      setOptions([
        {
          option_text: "True",
          option_image: null,
          option_image_preview: "",
          is_correct: false,
        },
        {
          option_text: "False",
          option_image: null,
          option_image_preview: "",
          is_correct: false,
        },
      ]);
    } else if (
      formData.question_type === "true_false" ||
      !initialData.options
    ) {
      // Only reset if coming from true_false or no initial data
      setOptions([
        {
          option_text: "",
          option_image: null,
          option_image_preview: "",
          is_correct: false,
        },
        {
          option_text: "",
          option_image: null,
          option_image_preview: "",
          is_correct: false,
        },
      ]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.exam_type) newErrors.exam_type = "Exam type is required";
    if (!formData.year) newErrors.year = "Year is required";
    if (!formData.subject) newErrors.subject = "Subject is required";
    if (!formData.question_type)
      newErrors.question_type = "Question type is required";
    if (!formData.question_text)
      newErrors.question_text = "Question text is required";
    if (!formData.question_point)
      newErrors.question_point = "Question points are required";
    if (!formData.difficulty_level)
      newErrors.difficulty_level = "Difficulty level is required";

    const hasCorrectAnswer = options.some((opt) => opt.is_correct);
    if (!hasCorrectAnswer) {
      newErrors.options = "At least one correct answer must be selected";
    }

    if (formData.question_type === "multiple_choice") {
      const hasEmptyOption = options.some((opt) => !opt.option_text.trim());
      if (hasEmptyOption) {
        newErrors.options = "All option texts must be filled";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      exam_type: initialData.exam_type || "",
      year: initialData.year || "",
      subject: initialData.subject || "",
      question_type: initialData.question_type || "",
      question_text: initialData.question_text || "",
      question_point: initialData.question_point || "",
      answer_explanation: initialData.answer_explanation || "",
      difficulty_level: initialData.difficulty_level || "",
      tags: initialData.tags || "",
      time_limit: initialData.time_limit || "",
    });

    // Reset options to initial data or default
    if (initialData.options && initialData.options.length > 0) {
      setOptions(
        initialData.options.map((opt) => ({
          option_text: opt.option_text,
          option_image: null as File | null,
          option_image_preview: opt.option_image || "",
          is_correct: opt.is_correct,
        }))
      );
    } else {
      setOptions([
        {
          option_text: "",
          option_image: null,
          option_image_preview: "",
          is_correct: false,
        },
        {
          option_text: "",
          option_image: null,
          option_image_preview: "",
          is_correct: false,
        },
      ]);
    }

    setQuestionImage(null);
    setQuestionImagePreview(initialData.question_image || "");
    setErrors({});
  };

  const handleSubmit = async (addAnother: boolean = false) => {
    // Clear previous errors
    setErrors({});

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      // ============================================
      // STEP 1: PREPARE QUESTION DATA
      // ============================================
      const questionData: QuestionUploadInput = {
        exam_type: formData.exam_type as QuestionUploadInput["exam_type"],
        year: parseInt(formData.year),
        subject: formData.subject,
        question_type:
          formData.question_type as QuestionUploadInput["question_type"],
        question_text: formData.question_text,
        question_point: parseFloat(formData.question_point),
        answer_explanation: formData.answer_explanation || undefined,
        difficulty_level:
          formData.difficulty_level as QuestionUploadInput["difficulty_level"],
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        time_limit: formData.time_limit
          ? parseInt(formData.time_limit)
          : undefined,
        language: "en",
        options: options.map((opt, index) => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          order_index: index,
          has_image: opt.option_image !== null || !!opt.option_image_preview,
        })),
        has_question_image: questionImage !== null || !!questionImagePreview,
      };

      // ============================================
      // STEP 2: CREATE FORMDATA
      // ============================================
      const formDataToSend = new FormData();

      // Add question data as JSON string
      formDataToSend.append("data", JSON.stringify(questionData));

      // Add question image if exists (new file)
      if (questionImage) {
        formDataToSend.append("question_image", questionImage);
      }

      // Add option images if exist (new files)
      options.forEach((option, index) => {
        if (option.option_image) {
          formDataToSend.append(`option_image_${index}`, option.option_image);
        }
      });

      // ============================================
      // STEP 3: CALL TANSTACK QUERY MUTATION
      // ============================================
      if (isEditing && questionId) {
        await updateMutation.mutateAsync({
          questionId,
          formData: formDataToSend,
        });
      } else {
        await createMutation.mutateAsync(formDataToSend);
      }

      // Reset form if adding another
      if (addAnother) {
        resetForm();
      }
    } catch (error) {
      // Errors are handled by the mutation hooks
      console.error("Error submitting question:", error);
    }
  };

  return (
    <div>
      <Card className="px-4 md:px-8 py-6">
        <div className="flex flex-col gap-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Basic Information</h4>
              <p className="text-sm text-gray-600">
                General details about the question
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
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="question_type">
                  Question Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.question_type}
                  onValueChange={handleQuestionTypeChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.question_type && (
                  <p className="text-xs text-red-500">{errors.question_type}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="difficulty_level">
                  Difficulty Level <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.difficulty_level}
                  onValueChange={(value) =>
                    handleInputChange("difficulty_level", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.difficulty_level && (
                  <p className="text-xs text-red-500">
                    {errors.difficulty_level}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="question_point">
                  Points <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="question_point"
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.question_point}
                  onChange={(e) =>
                    handleInputChange("question_point", e.target.value)
                  }
                  disabled={isLoading}
                />
                {errors.question_point && (
                  <p className="text-xs text-red-500">
                    {errors.question_point}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  type="text"
                  placeholder="algebra, equations, problem-solving"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-600">
                  Separate multiple tags with commas
                </p>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="time_limit">Time Limit (Optional)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  placeholder="Time in seconds"
                  value={formData.time_limit}
                  onChange={(e) =>
                    handleInputChange("time_limit", e.target.value)
                  }
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-600">
                  Leave empty for no time limit
                </p>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Question Content</h4>
              <p className="text-sm text-gray-600">
                The main question text and optional image
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="question_text">
                Question Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="question_text"
                placeholder="Enter the question..."
                value={formData.question_text}
                onChange={(e) =>
                  handleInputChange("question_text", e.target.value)
                }
                disabled={isLoading}
                rows={4}
              />
              {errors.question_text && (
                <p className="text-xs text-red-500">{errors.question_text}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="question_image">Question Image (Optional)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="question_image"
                  type="file"
                  accept="image/*"
                  onChange={handleQuestionImageUpload}
                  disabled={isLoading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("question_image")?.click()
                  }
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {questionImagePreview ? "Change Image" : "Upload Image"}
                </Button>
                {questionImagePreview && (
                  <div className="relative">
                    <Image
                      src={questionImagePreview}
                      alt="Question preview"
                      width={500}
                      height={500}
                      className="h-20 w-20 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeQuestionImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600">
                Max 10MB. Supported: JPEG, PNG, WebP, GIF
              </p>
            </div>
          </div>

          {/* Answer Options */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Answer Options</h4>
              <p className="text-sm text-gray-600">
                {formData.question_type === "true_false"
                  ? "Select the correct answer"
                  : "Add answer options and mark the correct one(s)"}
              </p>
            </div>

            {errors.options && (
              <p className="text-xs text-red-500">{errors.options}</p>
            )}

            <div className="space-y-4">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                        {formData.question_type === "true_false"
                          ? option.option_text.charAt(0)
                          : optionLabels[index]}
                      </div>
                      <Label className="font-medium">
                        {formData.question_type === "true_false"
                          ? option.option_text
                          : `Option ${optionLabels[index]}`}
                      </Label>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`correct-${index}`} className="text-sm">
                          Correct
                        </Label>
                        <Switch
                          id={`correct-${index}`}
                          checked={option.is_correct}
                          onCheckedChange={() =>
                            handleOptionCorrectToggle(index)
                          }
                          disabled={isLoading}
                          className="cursor-pointer"
                        />
                      </div>
                      {formData.question_type === "multiple_choice" &&
                        options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                    </div>
                  </div>

                  {formData.question_type === "multiple_choice" && (
                    <>
                      <Input
                        placeholder={`Enter option ${optionLabels[index]} text`}
                        value={option.option_text}
                        onChange={(e) =>
                          handleOptionTextChange(index, e.target.value)
                        }
                        disabled={isLoading}
                      />

                      <div className="flex items-center gap-4">
                        <Input
                          id={`option-image-${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleOptionImageUpload(index, e)}
                          disabled={isLoading}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById(`option-image-${index}`)
                              ?.click()
                          }
                          disabled={isLoading}
                        >
                          <Upload className="h-3 w-3 mr-2" />
                          {option.option_image_preview
                            ? "Change Image"
                            : "Add Image"}
                        </Button>
                        {option.option_image_preview && (
                          <div className="relative">
                            <Image
                              src={option.option_image_preview}
                              alt={`Option ${optionLabels[index]}`}
                              width={500}
                              height={500}
                              className="h-16 w-16 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                              onClick={() => removeOptionImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        Max 10MB per image. Supported: JPEG, PNG, WebP, GIF
                      </p>
                    </>
                  )}
                </div>
              ))}

              {formData.question_type === "multiple_choice" &&
                options.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    disabled={isLoading}
                    className="w-full md:w-fit"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option {optionLabels[options.length]}
                  </Button>
                )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Additional Information</h4>
              <p className="text-sm text-gray-600">
                Optional explanation for the answer
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="answer_explanation">
                Answer Explanation (Optional)
              </Label>
              <Textarea
                id="answer_explanation"
                placeholder="Explain why this is the correct answer..."
                value={formData.answer_explanation}
                onChange={(e) =>
                  handleInputChange("answer_explanation", e.target.value)
                }
                disabled={isLoading}
                rows={4}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col md:flex-row gap-3">
            <Button
              onClick={() => handleSubmit(false)}
              className="w-full md:w-fit"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading
                ? isEditing
                  ? "Updating Question..."
                  : "Uploading Question..."
                : isEditing
                  ? "Update Question"
                  : "Add Question"}
            </Button>

            {/* Only show "Save and Add Another" for create mode */}
            {!isEditing && (
              <Button
                onClick={() => handleSubmit(true)}
                variant="outline"
                className="w-full md:w-fit"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Add Another
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
