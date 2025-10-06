import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function GoodbyePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h3>Account Deleted</h3>
          <p className="mt-2 text-gray-600">
            Your account has been permanently deleted from our system.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            We&lsquo;re sorry to see you go. If you change your mind, you can
            always create a new account.
          </p>
          <div className="mt-6">
            <Button>
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
