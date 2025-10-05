"use client";

import { useState, useOptimistic } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import {
  formatPhoneNumber,
  getDisplayValue,
  formatDate,
} from "@/lib/utils/profile";
import { UpdateProfileForm } from "@/components/profile/update-profile-form";
import { authClient } from "@/lib/auth-client";
import type { SessionData } from "@/types/user-management";
import type { PersonalInformationProps } from "@/types/profile";
import type { UpdateUserProfileInput } from "@/types/user-management";

export function PersonalInformation({ user }: PersonalInformationProps) {
  const [open, setOpen] = useState(false);

  // Get current session for the form
  const { data: session } = authClient.useSession() as {
    data: SessionData | null;
    isPending: boolean;
  };

  // Optimistic UI state
  const [optimisticUser, updateOptimisticUser] = useOptimistic(
    user,
    (currentUser, updates: Partial<UpdateUserProfileInput>) => ({
      ...currentUser,
      ...updates,
    })
  );

  // Split name into first and last name
  const nameParts = optimisticUser.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const handleSuccess = (updates: Partial<UpdateUserProfileInput>) => {
    // Update optimistic state immediately
    updateOptimisticUser(updates);
    setOpen(false);
    // Session will be automatically updated by Better Auth
  };

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3>Personal Information</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Pencil className="size-4" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Personal Information</DialogTitle>
            </DialogHeader>
            {session && (
              <UpdateProfileForm session={session} onSuccess={handleSuccess} />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* First Name */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            First Name
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {firstName}
          </p>
        </div>

        {/* Last Name */}
        <div>
          <label className="text-sm font-medium text-gray-600">Last Name</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {lastName || "N/A"}
          </p>
        </div>

        {/* Email address */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Email address
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {optimisticUser.email}
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium text-gray-600">Phone</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {formatPhoneNumber(optimisticUser.phoneNumber) || "Not provided"}
          </p>
        </div>

        {/* State */}
        <div>
          <label className="text-sm font-medium text-gray-600">State</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(optimisticUser.state)}
          </p>
        </div>

        {/* LGA */}
        <div>
          <label className="text-sm font-medium text-gray-600">LGA</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(optimisticUser.lga)}
          </p>
        </div>

        {/* Date of birth */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Date of Birth
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {formatDate(optimisticUser.dateOfBirth)}
          </p>
        </div>

        {/* Gender */}
        <div>
          <label className="text-sm font-medium text-gray-600">Gender</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {optimisticUser.gender
              ? optimisticUser.gender.charAt(0) +
                optimisticUser.gender.slice(1).toLowerCase()
              : "Not provided"}
          </p>
        </div>
        {/* Street Address */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Street Address
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(optimisticUser.address)}
          </p>
        </div>

        {/* School Name*/}
        <div>
          <label className="text-sm font-medium text-gray-600">
            School Name
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(optimisticUser.schoolName, "No school provided")}
          </p>
        </div>
      </div>
    </div>
  );
}
