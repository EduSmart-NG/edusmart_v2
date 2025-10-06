"use client";

import { useState, useEffect } from "react";
import { useUserManagement } from "@/hooks/use-user-management";
import { userHasPassword } from "@/lib/actions/user-management";
import { Button } from "@/components/ui/button";
import { Key, AlertCircle, CheckCircle2 } from "lucide-react";
import Enable2FAWizard from "@/components/dashboard/settings/enable-2fa-wizard";
import Disable2FAModal from "@/components/dashboard/settings/disable-2fa";
import { BackupCodesModal } from "@/components/dashboard/settings/backup-code";
import { toast } from "sonner";
import SettingsLoading from "@/components/dashboard/settings/settings-loading";

export default function TwoFactorSettingsClient() {
  const { session, isLoading } = useUserManagement();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [checkingPassword, setCheckingPassword] = useState(true);
  const [showEnableWizard, setShowEnableWizard] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

  useEffect(() => {
    async function checkPassword() {
      if (!session?.user.id) return;

      setCheckingPassword(true);
      try {
        const result = await userHasPassword(session.user.id);
        if (result.success && result.data !== undefined) {
          setHasPassword(result.data);
        } else {
          toast.error("Failed to check password status", {
            description: "Please refresh the page and try again.",
          });
        }
      } catch (error) {
        toast.error("An unexpected error occurred", {
          description: "Unable to verify password status.",
        });
        console.error("Check password error:", error);
      } finally {
        setCheckingPassword(false);
      }
    }

    checkPassword();
  }, [session?.user.id]);

  const twoFactorEnabled = session?.user.twoFactorEnabled || false;

  if (isLoading || checkingPassword) {
    return <SettingsLoading />;
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No session found. Please log in.</p>
      </div>
    );
  }

  // OAuth users without password cannot use 2FA
  if (!hasPassword) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-orange-600" />
            <div>
              <h4 className="text-orange-900">
                Two-Factor Authentication Not Available
              </h4>
              <p className="mt-2 text-sm text-orange-800">
                Two-factor authentication is only available for accounts with
                passwords. You signed up using a social account (Google,
                Facebook, or TikTok) and don&lsquo;t have a password set.
              </p>
              <p className="mt-3 text-sm text-orange-800">
                To use 2FA, you need to set a password for your account first.
                Use the &quot;Forgot Password&quot; flow to create a password.
              </p>
              <Button
                variant="outline"
                className="mt-4 border-orange-600 text-orange-600 hover:bg-orange-100 max-sm:w-full"
                asChild
              >
                <a href="/auth/forgot-password">Set Password</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-6">
        {/* 2FA Status Card */}
        <div className="rounded-lg border p-6">
          <div className="flex flex-col gap-3 md:flex-row items-center justify-between">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4>Two-Factor Authentication</h4>
                  {twoFactorEnabled && (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Enabled
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {twoFactorEnabled
                    ? "Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when signing in."
                    : "Protect your account by requiring a verification code in addition to your password when signing in."}
                </p>

                {twoFactorEnabled && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Key className="h-4 w-4 text-gray-500" />
                      <span>Using authenticator app (TOTP)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col max-sm:w-full gap-2">
              {twoFactorEnabled ? (
                <Button
                  variant="outline"
                  onClick={() => setShowDisableModal(true)}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  onClick={() => setShowEnableWizard(true)}
                  className="w-full md:w-fit"
                >
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Backup Codes Section - Only show if 2FA is enabled */}
        {twoFactorEnabled && (
          <div className="rounded-lg border p-6">
            <div className="flex max-sm:flex-col items-start justify-between">
              <div className="flex gap-4">
                <div className="flex-1">
                  <h4>Backup Codes</h4>
                  <p className="mt-1 text-sm text-gray-600">
                    Use backup codes to access your account if you lose access
                    to your authenticator app. Each code can only be used once.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowBackupCodesModal(true)}
                className="mt-4 max-sm:w-full"
              >
                View Codes
              </Button>
            </div>
          </div>
        )}

        {/* How 2FA Works */}
        <div className="rounded-lg border bg-blue-50 p-6">
          <h4 className="text-blue-900">How Two-Factor Authentication Works</h4>
          <ol className="mt-3 space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>
                Download an authenticator app like Google Authenticator, Authy,
                or Microsoft Authenticator on your phone
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>
                Scan the QR code we provide with your authenticator app
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>
                Enter the 6-digit code from your app to verify the setup
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">4.</span>
              <span>Save your backup codes in a secure place</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">5.</span>
              <span>
                When signing in, you&lsquo;ll enter your password AND a code
                from your authenticator app
              </span>
            </li>
          </ol>
        </div>

        {/* Security Tips */}
        {!twoFactorEnabled && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
            <h4 className="text-yellow-900">
              Why Enable Two-Factor Authentication?
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-yellow-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                <span>
                  Protect your account even if someone steals your password
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                <span>Receive alerts about unauthorized access attempts</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                <span>
                  Meet security requirements for sensitive data access
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                <span>
                  Add an extra layer of defense against phishing attacks
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Modals */}
      <Enable2FAWizard
        open={showEnableWizard}
        onOpenChange={setShowEnableWizard}
      />

      <Disable2FAModal
        open={showDisableModal}
        onOpenChange={setShowDisableModal}
      />

      <BackupCodesModal
        open={showBackupCodesModal}
        onOpenChange={setShowBackupCodesModal}
      />
    </div>
  );
}
