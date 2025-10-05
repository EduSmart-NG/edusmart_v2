"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

/**
 * Email Verified Client Component
 *
 * Displays the email verification result and handles auto-redirect
 *
 * @param error - Error type from Better Auth redirect (null if successful)
 */

interface EmailVerifiedClientProps {
  error: string | null;
}

export default function EmailVerifiedClient({
  error,
}: EmailVerifiedClientProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  // Countdown timer effect
  useEffect(() => {
    // Only start countdown if verification was successful (no error)
    if (!error) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [error]);

  // Separate effect to handle redirect when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && !error) {
      router.replace("/auth/login");
    }
  }, [countdown, error, router]);

  // Verification failed - show error state
  if (error) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          <div className="flex flex-col space-y-2 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>

            <h3>Verification Failed</h3>

            <p className="text-sm text-muted-foreground">
              {error === "invalid_token"
                ? "The verification link is invalid or has expired."
                : error === "already_verified"
                  ? "This email has already been verified."
                  : "An error occurred during verification."}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">What can you do?</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                {error === "invalid_token" && (
                  <>
                    <li>Request a new verification email</li>
                    <li>Check if you used the latest verification link</li>
                    <li>Make sure the link wasn&apos;t truncated</li>
                  </>
                )}
                {error === "already_verified" && (
                  <>
                    <li>Your email is already verified</li>
                    <li>You can proceed to login</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button asChild variant="default">
              <Link href="/auth/login">Go to Login</Link>
            </Button>

            {error === "invalid_token" && (
              <Button asChild variant="outline">
                <Link href="/auth/register">Request New Link</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Verification successful - show success state with countdown
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in zoom-in-50 duration-300">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          <h3 className="animate-in fade-in-50 slide-in-from-bottom-3 duration-300 delay-100">
            Email Verified Successfully!
          </h3>

          <p className="text-sm text-muted-foreground animate-in fade-in-50 slide-in-from-bottom-3 duration-300 delay-200">
            Your email has been verified. You can now sign in to your account.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4 animate-in fade-in-50 slide-in-from-bottom-3 duration-300 delay-300">
          <div className="flex items-center justify-center space-x-2">
            <Icons.spinner className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Redirecting to login in{" "}
              <span className="font-bold text-primary text-lg tabular-nums">
                {countdown}
              </span>{" "}
              {countdown === 1 ? "second" : "seconds"}...
            </p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-center text-muted-foreground">
              You will be automatically redirected to the login page
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-2 animate-in fade-in-50 slide-in-from-bottom-3 duration-300 delay-400">
          <Button
            onClick={() => router.replace("/auth/login")}
            variant="default"
            className="w-full"
          >
            Continue to Login Now
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>

        <p className="px-8 text-center text-xs text-muted-foreground animate-in fade-in-50 duration-300 delay-500">
          Welcome to EduSmart! Start your learning journey today.
        </p>
      </div>
    </div>
  );
}
