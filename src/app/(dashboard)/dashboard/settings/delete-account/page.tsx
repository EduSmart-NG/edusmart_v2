import DeleteAccountClient from "@/components/dashboard/settings/delete-account-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account | Settings",
  description:
    "Permanently delete your account and all associated data. This action cannot be undone.",
};

export default function DeleteAccountPage() {
  return <DeleteAccountClient />;
}
