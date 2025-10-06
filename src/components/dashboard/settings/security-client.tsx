"use client";

import { useEffect, useState } from "react";
import { useUserManagement } from "@/hooks/use-user-management";
import { userHasPassword } from "@/lib/actions/user-management";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Pencil } from "lucide-react";
import ChangePasswordModal from "@/components/dashboard/settings/change-password";
import Link from "next/link";
import SettingsLoading from "@/components/dashboard/settings/settings-loading";

export default function SecuritySettingsClient() {
  const { session, isLoading } = useUserManagement();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [checkingPassword, setCheckingPassword] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    async function checkPassword() {
      if (!session?.user.id) return;

      setCheckingPassword(true);
      const result = await userHasPassword(session.user.id);
      if (result.success && result.data !== undefined) {
        setHasPassword(result.data);
      }
      setCheckingPassword(false);
    }

    checkPassword();
  }, [session?.user.id]);

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

  return (
    <div className="p-6 lg:p-8">
      <div className="space-y-6">
        {/* Password Section */}
        <div className="rounded-lg border p-6">
          <div className="flex flex-col md:flex-row items-start justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-start max-sm:items-center">
              <div>
                <h4>Password</h4>
                <p className="mt-1">
                  {hasPassword
                    ? "Change your password to keep your account secure"
                    : "You signed up with a social account and don't have a password yet"}
                </p>

                {hasPassword ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Password is set</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>No password set (OAuth account)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="max-sm:mt-4 max-sm:w-full">
              {hasPassword ? (
                <Button
                  variant="outline"
                  className="gap-2 w-full"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <Pencil className="size-4" />
                  Change Password
                </Button>
              ) : (
                <Button variant="outline" asChild className="w-full">
                  <Link href="/auth/forgot-password">Set Password</Link>
                </Button>
              )}
            </div>
          </div>

          {!hasPassword && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> To set a password for your account, use
                the &quot;Forgot Password&quot; flow. We&lsquo;ll send you a
                link to create a password for your social account.
              </p>
            </div>
          )}
        </div>

        {/* Account Creation Method */}
        <div className="rounded-lg border p-6">
          <div className="flex flex-col md:flex-row items-start justify-between">
            <div className="flex-1">
              <h4>Account Creation</h4>
              <p className="mt-1">
                Your account was created{" "}
                {new Date(session.user.createdAt).toLocaleDateString()}
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">
                    Email Verified
                  </span>
                  {session.user.emailVerified ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      No
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">
                    Account Type
                  </span>
                  <span className="text-sm text-gray-600">
                    {hasPassword ? "Email & Password" : "Social Login Only"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Recommendations */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h4>Security Recommendations</h4>
          <ul className="mt-3 space-y-2 text-sm text-yellow-800">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-yellow-600">•</span>
              <span>
                Enable two-factor authentication for an extra layer of security
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-yellow-600">•</span>
              <span>
                Use a strong, unique password that you don&lsquo;t use anywhere
                else
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-yellow-600">•</span>
              <span>
                Review your active sessions regularly and revoke any
                unrecognized devices
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-yellow-600">•</span>
              <span>
                Link multiple accounts (like Google) so you can always access
                your account
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Change Password Modal */}
      {hasPassword && (
        <ChangePasswordModal
          open={showPasswordModal}
          onOpenChange={setShowPasswordModal}
        />
      )}
    </div>
  );
}
