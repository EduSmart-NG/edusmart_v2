"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { createUserByAdmin } from "@/lib/actions/admin-create-user";
import {
  createUserSchema,
  USER_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  type CreateUserAdminInput,
  type UserRole,
} from "@/lib/validations/admin-user-creation";
import { toast } from "sonner";
import { ZodError } from "zod";
import { Card } from "../ui/card";

/**
 * Form state interface for type safety
 */
interface FormState {
  name: string;
  email: string;
  username: string;
  role: UserRole | "";
}

/**
 * Field-specific error messages
 */
interface FormErrors {
  name?: string;
  email?: string;
  username?: string;
  role?: string;
}

export default function CreateUserForm() {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    username: "",
    role: "",
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAction, setSubmitAction] = useState<"add-more" | "exit">("exit");

  /**
   * Handle input changes for text fields
   * Clears field-specific errors on change
   */
  const handleInputChange = (field: keyof FormState, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handle username input with validation
   * Only allows lowercase letters, numbers, and underscores
   */
  const handleUsernameChange = (value: string): void => {
    // Auto-convert to lowercase and remove invalid characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData((prev) => ({ ...prev, username: sanitized }));

    // Clear username error when user starts typing
    if (errors.username) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.username;
        return newErrors;
      });
    }
  };

  /**
   * Handle role selection
   */
  const handleRoleChange = (value: string): void => {
    setFormData((prev) => ({ ...prev, role: value as UserRole }));

    // Clear role error when user selects a role
    if (errors.role) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.role;
        return newErrors;
      });
    }
  };

  /**
   * Validate form data before submission
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    try {
      // Validate with Zod schema
      createUserSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        // Map Zod errors to form errors
        const fieldErrors: FormErrors = {};
        error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof FormErrors;
          if (field) {
            fieldErrors[field] = issue.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  /**
   * Handle form submission
   * Validates data, calls server action, and handles response
   */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    action: "add-more" | "exit"
  ): Promise<void> => {
    e.preventDefault();

    // Set the action type
    setSubmitAction(action);

    // Clear previous errors
    setErrors({});

    // Validate form data
    if (!validateForm()) {
      toast.error("Validation failed", {
        description: "Please check the form for errors.",
      });
      return;
    }

    // Set loading state
    setIsLoading(true);

    try {
      // Call server action
      const result = await createUserByAdmin(formData as CreateUserAdminInput);

      if (result.success && result.data) {
        // Success - show toast with username
        toast.success("User created successfully", {
          description: `${formData.email} has been added with username: ${formData.username}. Check console for temporary password.`,
          duration: 5000,
        });

        if (action === "add-more") {
          // Reset form to add another user
          setFormData({
            name: "",
            email: "",
            username: "",
            role: "",
          });
          setErrors({});
          setIsLoading(false);
        } else {
          // Redirect to users list after short delay
          setTimeout(() => {
            router.replace("/cp/admin-dashboard/users");
          }, 1500);
        }
      } else {
        // Server-side error
        toast.error(result.message || "Failed to create user", {
          description: result.error || "Please try again.",
        });

        // If it's a validation error, try to extract field errors
        if (result.code === "VALIDATION_ERROR" && result.error) {
          try {
            const zodErrors = JSON.parse(result.error);
            const fieldErrors: FormErrors = {};
            zodErrors.forEach((issue: { path: string[]; message: string }) => {
              const field = issue.path[0] as keyof FormErrors;
              if (field) {
                fieldErrors[field] = issue.message;
              }
            });
            setErrors(fieldErrors);
          } catch {
            // If parsing fails, just show the general error
          }
        }

        // Handle specific error codes
        if (result.code === "DUPLICATE_EMAIL") {
          setErrors({ email: "This email is already registered" });
        } else if (result.code === "DUPLICATE_USERNAME") {
          setErrors({ username: "This username is already taken" });
        }

        setIsLoading(false);
      }
    } catch (error) {
      // Unexpected error
      console.error("Form submission error:", error);
      toast.error("An unexpected error occurred", {
        description: "Please try again later.",
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Name Field */}
          <div className="grid gap-3">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={isLoading}
              className={errors.name ? "border-red-500" : ""}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-red-500">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="grid gap-3">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) =>
                handleInputChange("email", e.target.value.toLowerCase())
              }
              disabled={isLoading}
              className={errors.email ? "border-red-500" : ""}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {/* Username Field */}
          <div className="grid gap-3">
            <Label htmlFor="username">
              Username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="john_doe"
              value={formData.username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              disabled={isLoading}
              className={errors.username ? "border-red-500" : ""}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              maxLength={20}
            />

            {errors.username && (
              <p id="username-error" className="text-xs text-red-500">
                {errors.username}
              </p>
            )}
          </div>

          {/* Role Field */}
          <div className="grid gap-3">
            <Label htmlFor="role">
              User Role <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={handleRoleChange}
              disabled={isLoading}
            >
              <SelectTrigger
                id="role"
                className={errors.role ? "border-red-500" : ""}
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? "role-error" : undefined}
              >
                <SelectValue placeholder="Select user role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {ROLE_DISPLAY_NAMES[role]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[role]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p id="role-error" className="text-xs text-red-500">
                {errors.role}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Password Information Card */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-amber-800 dark:text-amber-300">
              Temporary Password
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              A secure temporary password has been sent to the user
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
              handleSubmit(
                e as unknown as React.FormEvent<HTMLFormElement>,
                "add-more"
              )
            }
            disabled={isLoading}
          >
            {isLoading && submitAction === "add-more" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Save & Add More
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
              handleSubmit(
                e as unknown as React.FormEvent<HTMLFormElement>,
                "exit"
              )
            }
            disabled={isLoading}
          >
            {isLoading && submitAction === "exit" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Save & Exit
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
