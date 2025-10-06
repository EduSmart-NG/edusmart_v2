import { ProfileContent } from "@/components/dashboard/profile/profile-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and manage your profile information and personal details",
};

export default function ProfilePage() {
  return <ProfileContent />;
}
