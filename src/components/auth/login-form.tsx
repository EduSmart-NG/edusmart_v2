// src/components/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginUser, resendVerificationEmail } from "@/lib/actions/login";
import type { LoginResult } from "@/types/auth";
import Link from "next/link";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    rememberMe: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
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

  const handleResendVerification = async (email?: string) => {
    if (!email && !formData.identifier.includes("@")) {
      toast.error("Please provide your email address to resend verification.");
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerificationEmail(
        email || formData.identifier
      );

      if (result.success) {
        toast.success(result.message, {
          duration: 5000,
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to resend verification email. Please try again.");
      console.log(error);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.identifier.trim()) {
      setErrors({ identifier: "Email or username is required" });
      return;
    }

    if (!formData.password) {
      setErrors({ password: "Password is required" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await loginUser(formData);

      if (result.success) {
        toast.success("Welcome back!", {
          description: "Redirecting to your dashboard...",
          duration: 3000,
        });

        // Redirect after brief delay
        setTimeout(() => {
          router.replace(result.redirectTo || "/dashboard");
        }, 500);
      } else {
        handleLoginError(result);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginError = (result: LoginResult) => {
    switch (result.code) {
      case "UNVERIFIED_EMAIL":
        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-medium">Email Not Verified</p>
            <p className="text-sm">
              Please verify your email before logging in.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleResendVerification(result.userEmail)}
              disabled={isResending}
              className="mt-1"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
          </div>,
          {
            duration: 10000,
            closeButton: true,
          }
        );
        break;

      case "INVALID_CREDENTIALS":
        toast.error("Invalid email/username or password. Please try again.", {
          description: "Check your credentials and try again.",
        });
        setErrors({
          identifier: " ",
          password: "Incorrect credentials",
        });
        break;

      case "RATE_LIMITED":
        toast.error(
          `Too many login attempts. Please try again in ${result.retryAfter} seconds.`,
          {
            duration: 8000,
          }
        );
        break;

      case "ACCOUNT_LOCKED":
        const minutes = Math.ceil((result.retryAfter || 900) / 60);
        toast.error(
          `Account temporarily locked due to multiple failed login attempts.`,
          {
            description: `Please try again in ${minutes} minutes.`,
            duration: 10000,
          }
        );
        break;

      default:
        toast.error(
          result.message || "Something went wrong. Please try again."
        );
    }

    // Set field errors if provided
    if (result.errors) {
      setErrors(result.errors);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Google login coming soon!");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <h3 className="text-center">Login to your account</h3>
          <CardDescription className="text-center">
            Enter your email or username below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="identifier">Email or Username</FieldLabel>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="john@example.com or username"
                  value={formData.identifier}
                  onChange={(e) =>
                    handleInputChange("identifier", e.target.value)
                  }
                  disabled={isLoading}
                  required
                  autoComplete="username"
                  className={errors.identifier ? "border-red-500" : ""}
                />
                {errors.identifier && errors.identifier !== " " && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.identifier}
                  </p>
                )}
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                    className={cn(
                      "pr-10",
                      errors.password ? "border-red-500" : ""
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {errors.password && errors.password !== " " && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </Field>

              <Field>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      handleInputChange("rememberMe", checked === true)
                    }
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me for 7 days
                  </label>
                </div>
              </Field>

              <Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    aria-hidden="true"
                    focusable="false"
                    data-prefix="fab"
                    data-icon="google"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 488 512"
                  >
                    <path
                      fill="currentColor"
                      d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                    ></path>
                  </svg>
                  Login with Google
                </Button>

                <FieldDescription className="text-center mt-4">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/register"
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
