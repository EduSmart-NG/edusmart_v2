import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Account Deletion",
  description: "Please check your email to complete account deletion",
};
export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg space-y-6 p-6">
        <div className="text-center">
          <h3>Check Your Email</h3>

          <p className="mt-2 text-gray-600">
            We&lsquo;ve sent a verification link to your email address. Please
            click the link to complete your account deletion.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <h4>Next Steps:</h4>
            <ol className="mt-2 list-inside list-decimal space-y-2 text-sm text-gray-700">
              <li>Check your email inbox</li>
              <li>Look for an email from EduSmart</li>
              <li>Click the verification link in the email</li>
              <li>Your account deletion will be completed</li>
            </ol>
          </div>
        </div>

        <div className="border-t pt-6">
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go To Homepage
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
