"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { createSubject, updateSubject } from "@/lib/actions/subjects";
import type { SubjectFormProps } from "@/types/subject";

export default function SubjectForm({
  initialData = {},
  onSubmit,
  isEditing = false,
  subjectId,
}: SubjectFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData.name || "",
    code: initialData.code || "",
    description: initialData.description || "",
    isActive: initialData.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============================================
  // HANDLERS
  // ============================================

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      isActive: true,
    });
    setErrors({});
  };

  const handleSubmit = async (addAnother: boolean) => {
    // Clear previous errors
    setErrors({});

    // ============================================
    // STEP 1: VALIDATION
    // ============================================
    if (!formData.name.trim()) {
      setErrors({ name: "Subject name is required" });
      toast.error("Subject name is required");
      return;
    }

    setIsLoading(true);

    try {
      // ============================================
      // STEP 2: PREPARE DATA
      // ============================================
      const subjectData = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
        isActive: formData.isActive,
      };

      // ============================================
      // STEP 3: CALL SERVER ACTION (CREATE OR UPDATE)
      // ============================================
      const result =
        isEditing && subjectId
          ? await updateSubject(subjectId, subjectData)
          : await createSubject(subjectData);

      // ============================================
      // STEP 4: HANDLE RESPONSE
      // ============================================
      if (result.success) {
        // Success!
        toast.success(
          isEditing
            ? "Subject updated successfully!"
            : "Subject created successfully!",
          {
            description: `Subject: ${formData.name}`,
            duration: 5000,
          }
        );

        // Call custom onSubmit if provided (for backward compatibility)
        if (onSubmit) {
          await onSubmit(subjectData, addAnother);
        }

        // Reset form if adding another
        if (addAnother && !isEditing) {
          resetForm();
        }

        // Redirect if not adding another
        if (!addAnother) {
          window.location.href = "/cp/admin-dashboard/subjects";
        }
      } else {
        // Error
        toast.error(result.message || "Failed to save subject", {
          description: result.errors
            ? Object.values(result.errors).join(", ")
            : undefined,
          duration: 5000,
        });

        // Set field-specific errors if available
        if (result.errors) {
          setErrors(result.errors);
        }
      }
    } catch (error) {
      console.error("Subject submit error:", error);
      toast.error("An unexpected error occurred", {
        description: "Please try again later",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div>
      <Card className="px-4 md:px-8 py-6">
        <div className="flex flex-col gap-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4>Basic Information</h4>
              <p className="text-sm text-gray-600">
                Required information for the subject
              </p>
            </div>

            {/* Subject Name */}
            <div className="grid gap-3">
              <Label htmlFor="name">
                Subject Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Mathematics, English, Physics"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={isLoading}
                required
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
              <p className="text-xs text-gray-600">
                The full name of the subject
              </p>
            </div>

            {/* Subject Code */}
            <div className="grid gap-3">
              <Label htmlFor="code">Subject Code (Optional)</Label>
              <Input
                id="code"
                placeholder="e.g., MATH, ENG, PHY"
                value={formData.code}
                onChange={(e) =>
                  handleInputChange("code", e.target.value.toUpperCase())
                }
                disabled={isLoading}
                maxLength={10}
              />
              {errors.code && (
                <p className="text-xs text-red-500">{errors.code}</p>
              )}
              <p className="text-xs text-gray-600">
                A short code for the subject (2-10 uppercase characters)
              </p>
            </div>

            {/* Description */}
            <div className="grid gap-3">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the subject..."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                disabled={isLoading}
                rows={4}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-gray-600">
                Optional description (max 500 characters)
              </p>
            </div>
          </div>

          {/* Status Settings */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4>Status Settings</h4>
              <p className="text-sm text-gray-600">
                Control the availability of this subject
              </p>
            </div>

            {/* Active Status */}
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="font-medium">
                    Active Status
                  </Label>
                  <p className="text-sm text-gray-600">
                    Enable or disable this subject in the system
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    handleInputChange("isActive", checked)
                  }
                  disabled={isLoading}
                />
              </div>
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
                  ? "Updating Subject..."
                  : "Creating Subject..."
                : isEditing
                  ? "Update Subject"
                  : "Create Subject"}
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
