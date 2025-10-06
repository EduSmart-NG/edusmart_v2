"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { useUserManagement } from "@/hooks/use-user-management";
import { deleteUserAccount } from "@/lib/actions/user-management";
import { userHasPassword } from "@/lib/actions/user-management";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import SettingsLoading from "@/components/dashboard/settings/settings-loading";
import { useRouter } from "next/navigation";

export default function DeleteAccountClient() {
  const { session, isLoading: sessionLoading } = useUserManagement();
  const [_hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [checkingPassword, setCheckingPassword] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [useEmailVerification, setUseEmailVerification] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkPassword() {
      if (!session?.user.id) return;

      setCheckingPassword(true);
      try {
        const result = await userHasPassword(session.user.id);
        if (result.success && result.data !== undefined) {
          setHasPassword(result.data);
          // OAuth users without password must use email verification
          if (!result.data) {
            setUseEmailVerification(true);
          }
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

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Confirmation required", {
        description: "Please type DELETE to confirm",
      });
      return;
    }

    if (!useEmailVerification && !password) {
      toast.error("Password required", {
        description: "Please enter your password to delete your account",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteUserAccount({
        password: useEmailVerification ? undefined : password,
        callbackURL: "/goodbye",
      });

      if (result.success) {
        // Close modal
        setShowConfirmModal(false);
        setConfirmText("");
        setPassword("");

        // Use the useEmailVerification flag we already have
        if (useEmailVerification) {
          // OAuth user - redirect to verification pending page
          toast.success("Verification email sent!", {
            description: "Check your email to complete account deletion",
            duration: 3000,
          });

          setTimeout(() => {
            router.replace("/verify-deletion");
          }, 1000);
        } else {
          // Password user - immediate deletion, redirect to goodbye
          toast.success("Check your email to complete account deletion", {
            duration: 2000,
          });

          setTimeout(() => {
            router.replace("/verify-deletion");
          }, 2000);
        }
      } else {
        toast.error("Failed to delete account", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Delete account error:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  const handleClose = () => {
    setShowConfirmModal(false);
    setConfirmText("");
    setPassword("");
    setShowPassword(false);
  };

  if (sessionLoading || checkingPassword) {
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
      {/* Warning Section */}
      <div className="space-y-6">
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0"></div>
            <div className="flex-1">
              <h4 className="text-red-900">
                Warning: This action is irreversible
              </h4>
              <p className="mt-2 text-sm text-red-800">
                Deleting your account will permanently remove all your data from
                our servers. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* What Gets Deleted */}
        <div className="rounded-lg border bg-white p-6">
          <h4 className="text-gray-900">What will be deleted:</h4>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-red-500">✗</span>
              <span>
                <strong>Your profile:</strong> Name, email, username, and all
                personal information
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-red-500">✗</span>
              <span>
                <strong>Your content:</strong> All data associated with your
                account
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-red-500">✗</span>
              <span>
                <strong>Your sessions:</strong> All active sessions will be
                terminated
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-red-500">✗</span>
              <span>
                <strong>Linked accounts:</strong> All connected social accounts
                will be unlinked
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 text-red-500">✗</span>
              <span>
                <strong>Security settings:</strong> Two-factor authentication
                and backup codes
              </span>
            </li>
          </ul>
        </div>

        {/* Before You Go */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h4 className="text-blue-900">Before you delete your account:</h4>
          <ul className="mt-4 space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>Download any data you want to keep</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>Cancel any active subscriptions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>
                Consider if you might want to come back later (you won&lsquo;t
                be able to recover this account)
              </span>
            </li>
          </ul>
        </div>

        {/* Verification Method Info */}
        {useEmailVerification && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
            <h4 className="text-yellow-900">Email Verification Required</h4>
            <p className="mt-2 text-sm text-yellow-800">
              Since you signed up with a social account, we&lsquo;ll send a
              verification email to <strong>{session.user.email}</strong> to
              confirm the deletion. You&lsquo;ll need to click the link in that
              email to permanently delete your account.
            </p>
          </div>
        )}

        {/* Delete Button */}
        <div className="flex justify-end border-t pt-6">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowConfirmModal(true)}
            className="max-sm:w-full"
          >
            <Trash2 className="mr-2 h-5 w-5" />
            Delete My Account
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">
                ⚠️ This is your last chance to change your mind
              </p>
            </div>

            <div>
              <Label htmlFor="confirm-text">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="mt-1.5 uppercase"
                disabled={isDeleting}
              />
            </div>

            {!useEmailVerification && (
              <div>
                <Label htmlFor="delete-password">Confirm your password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="delete-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isDeleting}
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
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                confirmText !== "DELETE" ||
                isDeleting ||
                (!useEmailVerification && !password)
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {useEmailVerification ? "Sending..." : "Deleting..."}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {useEmailVerification
                    ? "Send Verification Email"
                    : "Delete Account"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
