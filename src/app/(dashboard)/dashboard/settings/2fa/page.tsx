import TwoFactorSettingsClient from "@/components/dashboard/settings/2fa-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-Factor Authentication | Settings",
  description:
    "Manage your two-factor authentication settings and secure your account with an extra layer of protection.",
};

export default function TwoFactorSettingsPage() {
  return <TwoFactorSettingsClient />;
}
