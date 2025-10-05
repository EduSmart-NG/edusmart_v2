"use client";

import { ProfileHeader } from "@/components/profile/profile-header";
import { PersonalInformation } from "@/components/profile/personal-information";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import type { SessionData } from "@/types/user-management";
import type { ProfileData } from "@/types/profile";

function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 lg:p-8">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
          {/* Avatar skeleton */}
          <Skeleton className="size-20 rounded-full lg:size-24" />
          {/* User info skeleton */}
          <div className="flex flex-col items-center gap-2 lg:items-start">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        {/* Social links and edit button skeleton */}
        <div className="flex flex-col items-center gap-4 lg:items-end">
          <div className="flex gap-2">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

function PersonalInformationSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="md:col-span-2">
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  // Fetch session using Better Auth client hook
  const { data: session, isPending } = authClient.useSession() as {
    data: SessionData | null;
    isPending: boolean;
  };

  // Show loading state with skeleton
  if (isPending) {
    return (
      <>
        <div className="mb-8">
          <ProfileHeaderSkeleton />
        </div>
        <PersonalInformationSkeleton />
      </>
    );
  }

  // This should not happen due to dashboard layout protection
  if (!session?.user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-600">Unable to load profile data.</p>
      </div>
    );
  }

  // Map session user data to ProfileData type
  const profileData: ProfileData = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    image: session.user.image,
    username: session.user.username,
    displayUsername: session.user.displayUsername,
    dateOfBirth: session.user.dateOfBirth,
    gender: session.user.gender,
    phoneNumber: session.user.phoneNumber,
    address: session.user.address,
    state: session.user.state,
    lga: session.user.lga,
    schoolName: session.user.schoolName,
    createdAt: session.user.createdAt,
    updatedAt: session.user.updatedAt,
  };

  return (
    <>
      <ProfileHeader user={profileData} />
      <PersonalInformation user={profileData} />
    </>
  );
}
