"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Download,
  CheckCircle2,
} from "lucide-react";
import { enable2FA, verifyTOTP } from "@/lib/actions/two-factor";
import { useUserManagement } from "@/hooks/use-user-management";
import QRCode from "react-qr-code";
import OTPInput from "@/components/ui/input-otp";
import { toast } from "sonner";

interface Enable2FAWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "password" | "qr-code" | "verify" | "backup-codes";

export default function Enable2FAWizard({
  open,
  onOpenChange,
}: Enable2FAWizardProps) {
  const { refreshSession } = useUserManagement();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [hasScannedQR, setHasScannedQR] = useState(false);
  const [hasSavedCodes, setHasSavedCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await enable2FA({ password });

      if (result.success && result.data) {
        setTotpURI(result.data.totpURI);
        setBackupCodes(result.data.backupCodes);
        setStep("qr-code");
        toast.success("Password verified", {
          description:
            "Proceed to scan the QR code with your authenticator app.",
        });
      } else {
        toast.error(result.message || "Failed to enable 2FA", {
          description: "Please check your password and try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to enable 2FA", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Enable 2FA error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Invalid code", {
        description: "Please enter a 6-digit code.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyTOTP({
        code: verificationCode,
        trustDevice: false,
      });

      if (result.success) {
        await refreshSession();
        setStep("backup-codes");
        toast.success("Two-factor authentication verified!", {
          description: "Please save your backup codes in the next step.",
        });
      } else {
        toast.error(result.message || "Verification failed", {
          description: "Please check the code and try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to verify code", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Verify TOTP error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Backup codes copied to clipboard", {
      description: "Make sure to save them in a secure place.",
    });
  };

  const downloadBackupCodes = () => {
    const content = `EduSmart Backup Codes\n\nSave these codes in a secure place. Each code can only be used once.\n\n${backupCodes.join("\n")}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edusmart-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes saved to file", {
      description: "Keep this file in a secure location.",
    });
  };

  const handleClose = () => {
    if (step === "backup-codes" && !hasSavedCodes) {
      toast.error("Please save your backup codes", {
        description: "You need to save your backup codes before closing.",
        duration: 5000,
      });
      return;
    }

    setStep("password");
    setPassword("");
    setShowPassword(false);
    setTotpURI("");
    setBackupCodes([]);
    setVerificationCode("");
    setHasScannedQR(false);
    setHasSavedCodes(false);
    onOpenChange(false);
  };

  const handleFinish = () => {
    if (!hasSavedCodes) {
      toast.error("Please confirm you have saved your backup codes", {
        description: "Check the box to confirm before finishing.",
        duration: 5000,
      });
      return;
    }

    handleClose();
    toast.success("Two-factor authentication enabled successfully!", {
      description: "Your account is now more secure.",
    });
  };

  const secretKey = totpURI.split("secret=")[1]?.split("&")[0] || "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Enable Two-Factor Authentication
            <span className="ml-2 text-sm font-normal text-gray-500">
              Step{" "}
              {step === "password"
                ? 1
                : step === "qr-code"
                  ? 2
                  : step === "verify"
                    ? 3
                    : 4}{" "}
              of 4
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === "password" && "Verify your password to continue"}
            {step === "qr-code" &&
              "Scan the QR code with your authenticator app"}
            {step === "verify" && "Enter the code from your authenticator app"}
            {step === "backup-codes" &&
              "Save your backup codes in a secure place"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Password Verification */}
        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              We need to verify your identity before enabling 2FA for security
              reasons.
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!password || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: QR Code */}
        {step === "qr-code" && (
          <div className="space-y-4">
            <div className="flex justify-center rounded-lg bg-white p-4">
              <QRCode value={totpURI} size={200} />
            </div>

            <div className="space-y-2">
              <Label>Or enter this key manually:</Label>
              <div className="flex gap-2">
                <Input
                  value={secretKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(secretKey);
                    toast.success("Secret key copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">Instructions:</p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>Open your authenticator app</li>
                <li>Scan the QR code or enter the key manually</li>
                <li>The app will generate a 6-digit code</li>
              </ol>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="scanned"
                checked={hasScannedQR}
                onCheckedChange={(checked) =>
                  setHasScannedQR(checked as boolean)
                }
              />
              <Label htmlFor="scanned" className="cursor-pointer text-sm">
                I&lsquo;ve scanned the QR code with my authenticator app
              </Label>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("password")}
              >
                Back
              </Button>
              <Button
                onClick={() => setStep("verify")}
                disabled={!hasScannedQR}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Verify Code */}
        {step === "verify" && (
          <div className="space-y-4">
            <div>
              <Label>Enter the 6-digit code from your authenticator app</Label>
              <div className="mt-3">
                <OTPInput
                  length={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              The code refreshes every 30 seconds. Make sure to enter it
              quickly!
            </div>

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("qr-code")}
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Backup Codes */}
        {step === "backup-codes" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-900">
                ⚠️ Save these codes in a secure place
              </p>
              <p className="mt-1 text-xs text-yellow-800">
                You&lsquo;ll need these codes to access your account if you lose
                your phone. Each code can only be used once.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-4">
              {backupCodes.map((code, index) => (
                <div key={index} className="font-mono text-sm">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={copyBackupCodes}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={downloadBackupCodes}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="saved"
                checked={hasSavedCodes}
                onCheckedChange={(checked) =>
                  setHasSavedCodes(checked as boolean)
                }
              />
              <Label htmlFor="saved" className="cursor-pointer text-sm">
                I have saved my backup codes in a secure place
              </Label>
            </div>

            <Button
              onClick={handleFinish}
              disabled={!hasSavedCodes}
              className="w-full"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Finish Setup
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// File: src/app/(protected)/dashboard/settings/components/Enable2FAWizard.tsx
