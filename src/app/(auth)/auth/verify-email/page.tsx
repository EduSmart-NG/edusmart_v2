import { Metadata } from "next";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verify Email | EduSmart",
  description: "Verify your email address to complete registration",
};

// Simple client component - middleware handles protection
export default function VerifyEmailPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Icons.alert className="h-10 w-10 text-primary" />
          </div>

          <h3>Check your email</h3>

          <p>
            We&apos;ve sent you a verification link to complete your
            registration. Please check your email and click the verification
            link to activate your account.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <h4>What&apos;s next?</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Return to the login page to access your account</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email?
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <Button asChild variant="default">
            <Link href="/auth/login">Go to Login</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/register">Back to Registration</Link>
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
