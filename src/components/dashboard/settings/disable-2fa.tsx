"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { disable2FA } from "@/lib/actions/two-factor";
import { useUserManagement } from "@/hooks/use-user-management";
import { toast } from "sonner";

interface Disable2FAModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Disable2FAModal({ open, onOpenChange }: Disable2FAModalProps) {
  const { refreshSession } = useUserManagement();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await disable2FA({ password });

      if (result.success) {
        await refreshSession();
        toast.success("Two-factor authentication disabled", {
          description: "Your account now uses only password authentication.",
        });
        handleClose();
      } else {
        toast.error(result.message || "Failed to disable 2FA", {
          description: "Please check your password and try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to disable 2FA", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Disable 2FA error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Enter your password to disable 2FA
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="text-sm text-red-900">
                <p className="font-medium">
                  This will reduce your account security
                </p>
                <p className="mt-1">
                  You&lsquo;ll only need your password to sign in, making your
                  account more vulnerable to unauthorized access.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="disable-password">Password *</Label>
            <div className="relative mt-1.5">
              <Input
                id="disable-password"
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

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!password || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default Disable2FAModal;
