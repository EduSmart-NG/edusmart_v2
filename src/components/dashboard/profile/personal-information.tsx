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
import { UpdateProfileForm } from "@/components/dashboard/profile/update-profile-form";
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

  //  UI state
  const [userDetail, updateUser] = useOptimistic(
    user,
    (currentUser, updates: Partial<UpdateUserProfileInput>) => ({
      ...currentUser,
      ...updates,
    })
  );

  // Split name into first and last name
  const nameParts = userDetail.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const handleSuccess = (updates: Partial<UpdateUserProfileInput>) => {
    // Update  state immediately
    updateUser(updates);
    setOpen(false);
    // Session will be automatically updated by Better Auth
  };

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h4>Personal Information</h4>
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
            {userDetail.email}
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium text-gray-600">Phone</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {formatPhoneNumber(userDetail.phoneNumber) || "Not provided"}
          </p>
        </div>

        {/* State */}
        <div>
          <label className="text-sm font-medium text-gray-600">State</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(userDetail.state)}
          </p>
        </div>

        {/* LGA */}
        <div>
          <label className="text-sm font-medium text-gray-600">LGA</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(userDetail.lga)}
          </p>
        </div>

        {/* Date of birth */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Date of Birth
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {formatDate(userDetail.dateOfBirth)}
          </p>
        </div>

        {/* Gender */}
        <div>
          <label className="text-sm font-medium text-gray-600">Gender</label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {userDetail.gender
              ? userDetail.gender.charAt(0) +
                userDetail.gender.slice(1).toLowerCase()
              : "Not provided"}
          </p>
        </div>
        {/* Street Address */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Street Address
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(userDetail.address)}
          </p>
        </div>

        {/* School Name*/}
        <div>
          <label className="text-sm font-medium text-gray-600">
            School Name
          </label>
          <p className="mt-1 text-base font-medium text-gray-900">
            {getDisplayValue(userDetail.schoolName, "No school provided")}
          </p>
        </div>
      </div>
    </div>
  );
}
