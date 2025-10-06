"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import { verifyTOTP, verifyBackupCode } from "@/lib/actions/two-factor";
import OTPInput from "@/components/ui/input-otp";
import Link from "next/link";
import { toast } from "sonner";

export default function TwoFactorVerificationPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showBackupCode, setShowBackupCode] = useState(false);

  const handleVerifyTOTP = async () => {
    if (code.length !== 6) {
      toast.error("Invalid code", {
        description: "Please enter a 6-digit code.",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyTOTP({
        code,
        trustDevice,
      });

      if (result.success) {
        toast.success("Authentication successful", {
          description: "Redirecting to dashboard...",
        });
        router.push("/dashboard");
      } else {
        toast.error("Invalid code", {
          description: result.message || "The code you entered is incorrect.",
        });
        setCode("");
      }
    } catch (error) {
      toast.error("Verification failed", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Verify TOTP error:", error);
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyBackupCode = async () => {
    if (code.length < 8) {
      toast.error("Invalid code", {
        description: "Backup codes are at least 8 characters.",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyBackupCode({
        code: code.toUpperCase(),
        trustDevice,
        disableSession: false,
      });

      if (result.success) {
        toast.success("Backup code verified", {
          description: "This code is now invalid. Redirecting to dashboard...",
        });
        router.push("/dashboard");
      } else {
        toast.error("Invalid backup code", {
          description:
            result.message || "The backup code is incorrect or already used.",
        });
        setCode("");
      }
    } catch (error) {
      toast.error("Verification failed", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Verify backup code error:", error);
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (showBackupCode) {
      handleVerifyBackupCode();
    } else {
      handleVerifyTOTP();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h3>Two-Factor Authentication</h3>
          <p className="mt-2 text-sm text-gray-600">
            {showBackupCode
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-6">
              {/* Code Input */}
              <div>
                <Label className="text-center block mb-4">
                  {showBackupCode ? "Backup Code" : "Authentication Code"}
                </Label>
                {showBackupCode ? (
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXXXX"
                    className="w-full text-center text-2xl font-mono tracking-widest border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                    disabled={isVerifying}
                    maxLength={12}
                  />
                ) : (
                  <div className="flex justify-center">
                    <OTPInput
                      length={6}
                      value={code}
                      onChange={setCode}
                      disabled={isVerifying}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Trust Device */}
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Checkbox
                  id="trustDevice"
                  checked={trustDevice}
                  onCheckedChange={(checked) =>
                    setTrustDevice(checked as boolean)
                  }
                  disabled={isVerifying}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="trustDevice"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Trust this device for 60 days
                  </Label>
                  <p className="mt-0.5 text-xs text-gray-600">
                    You won&lsquo;t need to enter a code on this device for 60
                    days
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isVerifying ||
                  (showBackupCode ? code.length < 8 : code.length !== 6)
                }
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and Continue"
                )}
              </Button>

              {/* Toggle Backup Code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowBackupCode(!showBackupCode);
                    setCode("");
                  }}
                  className="text-sm text-green-600 hover:text-green-700 hover:underline"
                  disabled={isVerifying}
                >
                  {showBackupCode
                    ? "Use authenticator app instead"
                    : "Use a backup code instead"}
                </button>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-900">
            {showBackupCode ? (
              <>
                <p className="font-medium">Using a backup code?</p>
                <p className="mt-1">
                  Enter one of the backup codes you saved when enabling 2FA.
                  Each code can only be used once.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">
                  Can&lsquo;t access your authenticator app?
                </p>
                <p className="mt-1">
                  If you&lsquo;ve lost your phone, you can use one of your
                  backup codes to sign in. Click the link above to enter a
                  backup code.
                </p>
              </>
            )}
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// File: src/app/(protected)/2fa/page.tsx
