import SecuritySettingsClient from "@/components/dashboard/settings/security-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Settings | Settings",
  description:
    "Manage your account security settings, including password management, two-factor authentication, and active sessions.",
};

export default function SecuritySettingsPage() {
  return <SecuritySettingsClient />;
}
