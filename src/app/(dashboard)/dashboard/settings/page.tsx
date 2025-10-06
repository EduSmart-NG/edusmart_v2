import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your account settings effortlessly. Update your profile information, and customize your preferences.",
};

export default function SettingsPage() {
  return (
    <main className="flex flex-col gap-4">
      <section className="security-section">
        <div className="rounded-lg border p-6 flex flex-col items-start md:flex-row md:justify-between">
          <div>
            <h4>Security Settings</h4>
            <p className="w-full md:w-2/3 md:text-balance mt-2 text-sm">
              View and update your security settings, change your password, and
              check your account creation date.
            </p>
          </div>
          <Button
            variant="outline"
            asChild
            className="max-sm:w-full max-sm:mt-4"
          >
            <Link href="/dashboard/settings/security">
              Go To Security Settings
            </Link>
          </Button>
        </div>
      </section>

      <section className="security-section">
        <div className="rounded-lg border p-6 flex flex-col items-start md:flex-row md:justify-between">
          <div>
            <h4>Session Management</h4>
            <p className="w-full md:w-2/3 md:text-balance mt-2 text-sm">
              View and manage your active sessions and connected devices for
              enhanced account security.
            </p>
          </div>
          <Button
            variant="outline"
            asChild
            className="max-sm:w-full max-sm:mt-4"
          >
            <Link href="/dashboard/settings/sessions">
              Go To Session Management
            </Link>
          </Button>
        </div>
      </section>

      <section className="security-section">
        <div className="rounded-lg border p-6 flex flex-col items-start md:flex-row md:justify-between">
          <div>
            <h4>2FA Settings</h4>
            <p className="w-full md:w-2/3 md:text-balance mt-2 text-sm">
              Enable, manage, and customize your two-factor authentication (2FA)
              settings to add an extra layer of security to your account.
            </p>
          </div>
          <Button
            variant="outline"
            asChild
            className="max-sm:w-full max-sm:mt-4"
          >
            <Link href="/dashboard/settings/2fa">Go To 2FA Settings</Link>
          </Button>
        </div>
      </section>

      <section className="security-section">
        <div className="rounded-lg p-6 flex flex-col items-start md:flex-row md:justify-between border-2 border-red-200 bg-red-50">
          <div>
            <h4 className="text-red-900">Account Deletion</h4>
            <p className="w-full md:w-2/3 md:text-balance mt-2 text-sm text-red-800">
              Permanently delete your account and remove all associated data
              securely.
            </p>
          </div>
          <Button
            variant="destructive"
            asChild
            className="max-sm:w-full max-sm:mt-4"
          >
            <Link href="/dashboard/settings/delete-account">
              Delete Account
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
