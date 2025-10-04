"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Loader2, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordReset } from "@/lib/actions/password-reset";
import type { PasswordResetRequestResult } from "@/types/auth";
import Link from "next/link";

// Storage key for countdown persistence
const COUNTDOWN_KEY = "password_reset_countdown";
const COUNTDOWN_DURATION = 60; // seconds

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number>(0);

  // Initialize countdown from sessionStorage on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem(COUNTDOWN_KEY);
    if (!storedData) return;

    try {
      const { endTime, storedEmail } = JSON.parse(storedData);
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

      if (remaining > 0) {
        setCountdown(remaining);
        // Restore email if available and not already set
        if (storedEmail) {
          setEmail(storedEmail);
        }
      } else {
        // Expired, clear storage
        sessionStorage.removeItem(COUNTDOWN_KEY);
      }
    } catch (error) {
      console.error("Error restoring countdown:", error);
      sessionStorage.removeItem(COUNTDOWN_KEY);
    }
    // Only run once on mount
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) {
      sessionStorage.removeItem(COUNTDOWN_KEY);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          sessionStorage.removeItem(COUNTDOWN_KEY);
          return 0;
        }
        return newCount;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleInputChange = (value: string) => {
    setEmail(value);
    // Clear error on input
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check countdown
    if (countdown > 0) {
      toast.error(`Please wait ${countdown} seconds before trying again.`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result: PasswordResetRequestResult = await requestPasswordReset({
        email,
      });

      if (result.success) {
        setEmailSent(true);

        // Start countdown
        const endTime = Date.now() + COUNTDOWN_DURATION * 1000;
        setCountdown(COUNTDOWN_DURATION);

        // Persist countdown in sessionStorage
        sessionStorage.setItem(
          COUNTDOWN_KEY,
          JSON.stringify({ endTime, storedEmail: email })
        );

        toast.success("Email sent!", {
          description: result.message,
        });
      } else {
        // Handle rate limiting
        if (result.code === "RATE_LIMITED") {
          const minutes = result.retryAfter
            ? Math.ceil(result.retryAfter / 60)
            : 15;
          setError(
            `Too many attempts. Please try again in ${minutes} minutes.`
          );
          toast.error(result.message);
        } else {
          setError(result.message);
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast.error("Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend
  const handleResend = useCallback(async () => {
    if (!email) {
      toast.error("Email address not found.");
      return;
    }

    if (countdown > 0) {
      toast.error(`Please wait ${countdown} seconds before resending.`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result: PasswordResetRequestResult = await requestPasswordReset({
        email,
      });

      if (result.success) {
        // Start countdown
        const endTime = Date.now() + COUNTDOWN_DURATION * 1000;
        setCountdown(COUNTDOWN_DURATION);

        // Persist countdown in sessionStorage
        sessionStorage.setItem(
          COUNTDOWN_KEY,
          JSON.stringify({ endTime, storedEmail: email })
        );

        toast.success("Email sent!", {
          description: result.message,
        });
      } else {
        if (result.code === "RATE_LIMITED") {
          const minutes = result.retryAfter
            ? Math.ceil(result.retryAfter / 60)
            : 15;
          setError(
            `Too many attempts. Please try again in ${minutes} minutes.`
          );
          toast.error(result.message);
        } else {
          setError(result.message);
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend reset email");
    } finally {
      setIsLoading(false);
    }
  }, [email, countdown]);

  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isResendDisabled = countdown > 0 || isLoading;

  // Success state - email sent
  if (emailSent) {
    return (
      <div className={cn("flex w-full flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden">
          <CardHeader className="text-center space-y-2">
            <h3>Check Your Email</h3>
            <CardDescription className="text-balance">
              We&apos;ve sent password reset instructions to{" "}
              <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p>
                <strong>Next steps:</strong>
              </p>
              <ol className="mt-2 ml-4 list-decimal">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the password reset link in the email</li>
                <li>The link will expire in 1 hour</li>
                <li>Create a new secure password</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={isResendDisabled}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Resend in {formatCountdown(countdown)}
                  </>
                ) : (
                  "Resend Email"
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                  sessionStorage.removeItem(COUNTDOWN_KEY);
                  setCountdown(0);
                }}
              >
                Send to a different email
              </Button>

              <Link href="/auth/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>

            <FieldDescription className="text-center text-xs">
              Didn&apos;t receive the email? Check your spam folder or try
              again.
            </FieldDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial state - request reset
  return (
    <div className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardHeader className="text-center space-y-2">
          <h3>Forgot Password?</h3>
          <CardDescription className="text-balance">
            Enter your email address and we&apos;ll send you instructions to
            reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => handleInputChange(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                  autoFocus
                  className={error ? "border-red-500" : ""}
                />
                {error && (
                  <FieldDescription className="text-red-500">
                    {error}
                  </FieldDescription>
                )}
              </Field>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || countdown > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Wait {formatCountdown(countdown)}
                  </>
                ) : (
                  "Send Reset Instructions"
                )}
              </Button>

              <div className="text-center">
                <Link href="/auth/login">
                  <Button variant="ghost" type="button" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>

              <FieldDescription className="text-center text-xs">
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

      {/* Security notice */}
      <div className="text-center text-xs text-muted-foreground">
        <p>
          For security reasons, we don&apos;t reveal whether an email exists in
          our system.
        </p>
      </div>
    </div>
  );
}
