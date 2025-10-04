"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import { resetPassword } from "@/lib/actions/password-reset";
import type { PasswordResetResult } from "@/types/auth";
import Link from "next/link";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [token, setToken] = useState<string | null>(null);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Extract token from URL on mount
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast.error("Invalid reset link");
      router.push("/auth/forgot-password");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, router]);

  // Validate password in real-time
  useEffect(() => {
    const pwd = formData.password;
    setPasswordValidation({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    });
  }, [formData.password]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error on input
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!Object.values(passwordValidation).every(Boolean)) {
      newErrors.password = "Password does not meet complexity requirements";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);

    try {
      const result: PasswordResetResult = await resetPassword({
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (result.success) {
        toast.success("Password reset successful!", {
          description: "You can now log in with your new password.",
        });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push(result.redirectTo || "/auth/login");
        }, 2000);
      } else {
        // Handle specific error codes
        if (
          result.code === "EXPIRED_TOKEN" ||
          result.code === "INVALID_TOKEN"
        ) {
          toast.error(result.message, {
            description: "Please request a new password reset link.",
            action: {
              label: "Request New Link",
              onClick: () => router.push("/auth/forgot-password"),
            },
          });
        } else {
          toast.error(result.message);
          setErrors({ password: result.message });
        }
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const passwordStrength =
    Object.values(passwordValidation).filter(Boolean).length;
  const strengthPercentage = (passwordStrength / 5) * 100;
  const strengthColor =
    strengthPercentage <= 40
      ? "bg-red-500"
      : strengthPercentage <= 80
        ? "bg-yellow-500"
        : "bg-green-500";
  const strengthLabel =
    strengthPercentage <= 40
      ? "Weak"
      : strengthPercentage <= 80
        ? "Medium"
        : "Strong";

  return (
    <div className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardHeader className="text-center">
          <h3>Reset your password</h3>
          <CardDescription>Enter a new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* New Password Field */}
              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    disabled={isLoading}
                    required
                    className={
                      errors.password ? "border-red-500 pr-10" : "pr-10"
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <FieldDescription className="text-red-500">
                    {errors.password}
                  </FieldDescription>
                )}

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Password strength:</span>
                      <span
                        className={cn(
                          "font-medium",
                          strengthPercentage <= 40
                            ? "text-red-600"
                            : strengthPercentage <= 80
                              ? "text-yellow-600"
                              : "text-green-600"
                        )}
                      >
                        {strengthLabel}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          strengthColor
                        )}
                        style={{ width: `${strengthPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Password Requirements Checklist */}
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-700">
                    Password must contain:
                  </p>
                  <div className="grid gap-1">
                    {[
                      { key: "length", label: "At least 8 characters" },
                      { key: "uppercase", label: "One uppercase letter (A-Z)" },
                      { key: "lowercase", label: "One lowercase letter (a-z)" },
                      { key: "number", label: "One number (0-9)" },
                      {
                        key: "special",
                        label: "One special character (!@#$%^&*)",
                      },
                    ].map((requirement) => (
                      <div
                        key={requirement.key}
                        className="flex items-center gap-2 text-xs"
                      >
                        {passwordValidation[
                          requirement.key as keyof typeof passwordValidation
                        ] ? (
                          <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        )}
                        <span
                          className={
                            passwordValidation[
                              requirement.key as keyof typeof passwordValidation
                            ]
                              ? "text-green-700"
                              : "text-gray-600"
                          }
                        >
                          {requirement.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Field>

              {/* Confirm Password Field */}
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm New Password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    disabled={isLoading}
                    required
                    className={
                      errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <FieldDescription className="text-red-500">
                    {errors.confirmPassword}
                  </FieldDescription>
                )}
              </Field>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>

              <FieldDescription className="text-center">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
