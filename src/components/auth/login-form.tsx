"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginUser, resendVerificationEmail } from "@/lib/actions/login";
import type { LoginResult } from "@/types/auth";
import Link from "next/link";
import { OAuthButtons } from "./oauth-button";
import { useRecaptchaToken } from "@/hooks/use-recaptcha-token";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get callback URL from query params (set by middleware)
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    generateToken,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
  } = useRecaptchaToken();

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.identifier.trim()) {
      setErrors({ identifier: "Please enter your email address" });
      return;
    }

    if (!formData.password) {
      setErrors({ password: "Please enter your password" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Generate reCAPTCHA token before login
      const recaptchaToken = await generateToken("signin");

      if (!recaptchaToken) {
        toast.error(
          recaptchaError || "Failed to verify reCAPTCHA. Please try again."
        );
        setIsLoading(false);
        return;
      }

      // Pass reCAPTCHA token via headers (Better Auth reads from x-captcha-token header)
      const result: LoginResult = await loginUser(formData, recaptchaToken);

      if (result.success) {
        // ✅ NEW: Check if 2FA verification is required
        if (result.twoFactorRedirect) {
          toast.info("Two-factor authentication required", {
            description: "Please enter your verification code.",
          });

          // Redirect to 2FA verification page with callback URL
          router.push(
            `/auth/2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`
          );
          return;
        }

        toast.success("Welcome back!", {
          description: "You have successfully logged in.",
        });

        // Use callbackUrl from middleware, fallback to result.redirectTo or /dashboard
        const redirectPath = result.redirectTo || callbackUrl;
        router.replace(redirectPath);
        router.refresh();
      } else {
        // Handle different error types
        switch (result.code) {
          case "UNVERIFIED_EMAIL":
            toast.error(result.message, {
              description: "Check your inbox for the verification link.",
              action: {
                label: "Resend Email",
                onClick: () => handleResendVerification(result.userEmail),
              },
              duration: 10000,
            });
            break;

          case "ACCOUNT_LOCKED":
            const minutes = result.retryAfter
              ? Math.ceil(result.retryAfter / 60)
              : 15;
            toast.error(result.message, {
              description: `Please try again in ${minutes} minutes.`,
              duration: 10000,
            });
            break;

          case "RATE_LIMITED":
            toast.error(result.message, {
              description: "Too many requests. Please slow down.",
              duration: 5000,
            });
            break;

          case "INVALID_CREDENTIALS":
          default:
            toast.error(result.message);
            if (result.errors) {
              setErrors(result.errors);
            }
            break;
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Combined loading state for button
  const isSubmitting = isLoading || isRecaptchaLoading;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <h3>Welcome back</h3>
          <CardDescription>Login with your email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="identifier">Email</FieldLabel>
                <Input
                  id="identifier"
                  placeholder="name@example.com"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isSubmitting}
                  value={formData.identifier}
                  onChange={(e) =>
                    handleInputChange("identifier", e.target.value)
                  }
                  className={errors.identifier ? "border-red-500" : ""}
                />
                {errors.identifier && (
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
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect="off"
                    disabled={isSubmitting}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={errors.password ? "border-red-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </Field>

              <Field>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      handleInputChange("rememberMe", checked as boolean)
                    }
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </label>
                </div>
              </Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isRecaptchaLoading ? "Verifying..." : "Logging in..."}
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
                      Or
                    </span>
                  </div>
                </div>

                <OAuthButtons mode="signin" />

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
