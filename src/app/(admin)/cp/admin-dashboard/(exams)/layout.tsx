import { ReCaptchaProvider } from "@/components/providers/recaptcha-provider";
import type { ReactNode } from "react";

interface ExamManagementLayoutProps {
  children: ReactNode;
}

export default function ExamManagementLayout({
  children,
}: ExamManagementLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <ReCaptchaProvider>{children}</ReCaptchaProvider>
    </div>
  );
}
