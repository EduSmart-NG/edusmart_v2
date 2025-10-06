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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useUserManagement } from "@/hooks/use-user-management";
import {
  passwordChangeSchema,
  calculatePasswordStrength,
} from "@/lib/validations/settings";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const { changePassword } = useUserManagement();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    revokeOtherSessions: true,
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = calculatePasswordStrength(formData.newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validated = passwordChangeSchema.parse(formData);

      const result = await changePassword({
        currentPassword: validated.currentPassword,
        newPassword: validated.newPassword,
        revokeOtherSessions: validated.revokeOtherSessions,
      });

      if (result.success) {
        toast.success("Password changed successfully", {
          description: validated.revokeOtherSessions
            ? "You've been signed out from all other devices."
            : "Your password has been updated.",
        });
        handleClose();
      } else {
        toast.error(result.message || "Failed to change password", {
          description: "Please check your current password and try again.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          fieldErrors[field] = issue.message;
        });
        setErrors(fieldErrors);
        toast.error("Validation failed", {
          description: "Please check the form for errors.",
        });
      } else {
        toast.error("An unexpected error occurred", {
          description: "Please try again later.",
        });
        console.error("Password change error:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        revokeOtherSessions: true,
      });
      setShowPasswords({ current: false, new: false, confirm: false });
      setErrors({});
      onOpenChange(false);
    }
  };

  const getStrengthColor = (label: string) => {
    switch (label) {
      case "weak":
        return "bg-red-500";
      case "fair":
        return "bg-orange-500";
      case "good":
        return "bg-yellow-500";
      case "strong":
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStrengthText = (label: string) => {
    switch (label) {
      case "weak":
        return "Weak password";
      case "fair":
        return "Fair password";
      case "good":
        return "Good password";
      case "strong":
        return "Strong password";
      default:
        return "";
    }
  };

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      met: formData.newPassword.length >= 8,
    },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(formData.newPassword),
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(formData.newPassword),
    },
    { label: "Contains number", met: /\d/.test(formData.newPassword) },
    {
      label: "Contains special character",
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new strong password
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <Label htmlFor="currentPassword">Current Password *</Label>
            <div className="relative mt-1.5">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder="Enter current password"
                disabled={isSubmitting}
                className={cn(errors.currentPassword && "border-red-500")}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    current: !prev.current,
                  }))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <Label htmlFor="newPassword">New Password *</Label>
            <div className="relative mt-1.5">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                placeholder="Enter new password"
                disabled={isSubmitting}
                className={cn(errors.newPassword && "border-red-500")}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          level <= passwordStrength.score
                            ? getStrengthColor(passwordStrength.label)
                            : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {getStrengthText(passwordStrength.label)}
                  </span>
                </div>

                {/* Password Requirements */}
                <div className="space-y-1 text-xs">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-gray-600"
                    >
                      {req.met ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className={req.met ? "text-green-600" : ""}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
            <div className="relative mt-1.5">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Confirm new password"
                disabled={isSubmitting}
                className={cn(errors.confirmPassword && "border-red-500")}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    confirm: !prev.confirm,
                  }))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Revoke Other Sessions */}
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
            <Checkbox
              id="revokeOtherSessions"
              checked={formData.revokeOtherSessions}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  revokeOtherSessions: checked as boolean,
                }))
              }
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <Label
                htmlFor="revokeOtherSessions"
                className="cursor-pointer text-sm font-medium"
              >
                Sign out from all other devices
              </Label>
              <p className="mt-0.5 text-xs text-gray-600">
                Recommended for security. You&lsquo;ll stay signed in on this
                device.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
