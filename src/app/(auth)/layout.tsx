import { ReCaptchaProvider } from "@/components/providers/recaptcha-provider";
import ParticlesBackground from "@/components/ui/particles-background";
import type { ReactNode } from "react";

/**
 * Auth Layout - Server Component
 *
 * IMPORTANT: This layout does NOT perform session checks!
 *
 * Why?
 * - Middleware already handles redirecting authenticated users away from auth pages
 * - Adding session validation here causes redirect loops
 * - The middleware check is sufficient for this use case
 *
 * This layout only provides:
 * - Consistent styling for auth pages
 * - ReCaptchaProvider wrapper
 * - Animated particles background
 *
 * @see src/middleware.ts for the actual auth page protection
 */

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <ParticlesBackground />

      <div className="container relative z-10 flex min-h-screen flex-col items-center justify-center py-10">
        <ReCaptchaProvider>{children}</ReCaptchaProvider>
      </div>
    </div>
  );
}
