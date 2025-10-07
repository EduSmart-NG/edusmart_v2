import type { Metadata } from "next";
import NotFoundComponent from "@/components/ui/404";

export const metadata: Metadata = {
  title: "404 - Page Not Found | EduSmart",
  description: "The page you're looking for could not be found.",
};

export default function NotFound() {
  return <NotFoundComponent redirectLink="/admin-dashboard" />;
}
