"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

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
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <Icons.alert className="h-10 w-10 text-destructive" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>

          <p className="text-sm text-muted-foreground">
            An error occurred while processing your request. Please try again.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground font-mono break-all">
            {error.message || "Unknown error"}
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="ghost" asChild>
            <a href="/register">Back to Registration</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
