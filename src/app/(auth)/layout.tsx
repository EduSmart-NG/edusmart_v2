import { ReCaptchaProvider } from "@/components/providers/recaptcha-provider";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container relative flex min-h-screen flex-col items-center justify-center py-10">
        <ReCaptchaProvider>{children}</ReCaptchaProvider>
      </div>
    </div>
  );
}
