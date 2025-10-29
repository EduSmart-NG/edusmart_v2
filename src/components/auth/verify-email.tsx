"use client";

import { useState, useEffect, useCallback } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/lib/actions/login";
import { Loader2, Mail, Clock } from "lucide-react";

// Storage key for countdown persistence
const COUNTDOWN_KEY = "email_verification_countdown";
const COUNTDOWN_DURATION = 60; // seconds

interface VerifyEmailClientProps {
  initialEmail: string;
}

export default function VerifyEmailClient({
  initialEmail,
}: VerifyEmailClientProps) {
  const [email] = useState<string>(initialEmail);
  const [countdown, setCountdown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // Initialize countdown from sessionStorage on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem(COUNTDOWN_KEY);
    if (storedData) {
      try {
        const { endTime, storedEmail } = JSON.parse(storedData);

        // Only restore countdown if it's for the same email
        if (storedEmail === initialEmail) {
          const remaining = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
          );

          if (remaining > 0) {
            setCountdown(remaining);
          } else {
            // Expired, clear storage
            sessionStorage.removeItem(COUNTDOWN_KEY);
          }
        } else {
          // Different email, clear old countdown
          sessionStorage.removeItem(COUNTDOWN_KEY);
        }
      } catch (error) {
        console.error("Error restoring countdown:", error);
        sessionStorage.removeItem(COUNTDOWN_KEY);
      }
    }
  }, [initialEmail]);

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

  // Handle resend verification email
  const handleResend = useCallback(async () => {
    if (!email) {
      toast.error("Email address not found. Please register again.");
      return;
    }

    if (countdown > 0) {
      toast.error(`Please wait ${countdown} seconds before resending.`);
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerificationEmail(email);

      if (result.success) {
        toast.success(result.message, {
          description: "Check your inbox and spam folder.",
          duration: 5000,
        });

        // Start countdown
        const endTime = Date.now() + COUNTDOWN_DURATION * 1000;
        setCountdown(COUNTDOWN_DURATION);

        // Persist countdown in sessionStorage
        sessionStorage.setItem(
          COUNTDOWN_KEY,
          JSON.stringify({ endTime, storedEmail: email })
        );
      } else {
        toast.error(result.message, {
          description: "Please try again or contact support.",
        });
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend verification email.", {
        description: "Please try again later.",
      });
    } finally {
      setIsResending(false);
    }
  }, [email, countdown]);

  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isResendDisabled = countdown > 0 || isResending;

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center px-4">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Icons.alert className="h-10 w-10 text-primary" />
          </div>

          <h3 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h3>

          <p className="text-muted-foreground">
            We&apos;ve sent you a verification link to complete your
            registration. Please check your email and click the verification
            link to activate your account.
          </p>

          {email && (
            <p className="text-sm text-muted-foreground mt-2">
              Sent to:{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">What&apos;s next?</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Return to the login page to access your account</li>
            </ol>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground font-medium">
              Didn&apos;t receive the email?
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            onClick={handleResend}
            disabled={isResendDisabled}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
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
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>

          <Button asChild variant="default" className="w-full">
            <Link href="/auth/login">Go to Login</Link>
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/auth/register">Back to Registration</Link>
          </Button>
        </div>

        <p className="px-8 text-center text-sm text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:support@edusmart.com"
            className="hover:text-primary underline underline-offset-4"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
