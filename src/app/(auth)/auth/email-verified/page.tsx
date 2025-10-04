"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function EmailVerifiedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const [countdown, setCountdown] = useState(5);
  const [isValidAccess, setIsValidAccess] = useState(false);
  const hasValidated = useRef(false);

  useEffect(() => {
    // Prevent multiple validations
    if (hasValidated.current) return;
    hasValidated.current = true;

    // Validate access - must have either token or error parameter
    if (!token && !error) {
      router.replace("/auth/register");
      return;
    }

    setIsValidAccess(true);

    // Only start countdown if verification was successful
    if (!error && token) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.replace("/auth/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [error, token, router]);

  // Show loading while validating access
  if (!isValidAccess) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <div className="flex items-center space-x-2">
          <Icons.spinner className="h-6 w-6 animate-spin" />
          <span>Validating...</span>
        </div>
      </div>
    );
  }

  // Verification failed
  if (error) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          <div className="flex flex-col space-y-2 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Verification Failed
            </h1>

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
              <h3 className="font-medium">What can you do?</h3>
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

  // Verification successful
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in zoom-in-50 duration-300">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight animate-in fade-in-50 slide-in-from-bottom-3 duration-300 delay-100">
            Email Verified Successfully!
          </h1>

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
            onClick={() => router.push("/auth/login")}
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
