import ActiveSessionsClient from "@/components/dashboard/settings/sessions-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Active Sessions | Settings",
  description:
    "View and manage all devices and locations where you're currently signed in. Revoke access from unrecognized devices.",
};

export default function ActiveSessionsPage() {
  return <ActiveSessionsClient />;
}
