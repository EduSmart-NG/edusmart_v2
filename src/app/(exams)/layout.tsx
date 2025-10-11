import { ReCaptchaProvider } from "@/components/providers/recaptcha-provider";
import RecaptchaFooter from "@/components/ui/recaptcha-footer";
import type { ReactNode } from "react";

interface ExamsLayoutProps {
  children: ReactNode;
}

export default function ExamsLayout({ children }: ExamsLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <ReCaptchaProvider>{children}</ReCaptchaProvider>
      <RecaptchaFooter />
    </div>
  );
}
