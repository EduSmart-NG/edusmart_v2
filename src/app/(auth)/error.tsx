"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Auth error:", error);
  }, [error]);

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-md space-y-6 p-8">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Icons.alert className="h-10 w-10 text-destructive" />
          </div>

          {/* Error Title */}
          <h2 className="mb-3 text-2xl font-semibold">Something went wrong</h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            An error occurred while processing your request. Please try again.
          </p>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground font-mono break-all">
              {error.message || "Unknown error"}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex flex-col space-y-2">
            <Button onClick={reset}>Try again</Button>
            <Button asChild className="w-full">
              <Link href="/auth/register">Return to Registration</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
