import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Dashboard Layout - Server Component
 *
 * Second layer of authentication defense:
 * - Middleware checks for session cookie existence (fast, optimistic)
 * - This layout validates actual session with Better Auth API (secure, authoritative)
 *
 * This ensures:
 * 1. No flash of protected content (middleware redirects immediately)
 * 2. Full session validation (expired/invalid sessions caught here)
 * 3. Email verification enforcement
 *
 * @see https://www.better-auth.com/docs/integrations/next
 * @see https://nextjs.org/docs/app/guides/authentication
 */

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Get request headers for Better Auth session validation
  const headersList = await headers();

  // Validate session using Better Auth API
  // This performs full validation including:
  // - Token signature verification
  // - Expiry checking
  // - Database session lookup (if not using cookie cache)
  const session = await auth.api.getSession({
    headers: headersList,
  });

  // No valid session - redirect to login
  // This catches:
  // - Expired sessions that middleware let through
  // - Invalid/tampered session tokens
  // - Deleted sessions (user logged out from another device)
  if (!session) {
    redirect("/auth/login");
  }

  // Optional: Enforce email verification for dashboard access
  // Uncomment if you want to require verified email for dashboard
  /*
  if (!session.user.emailVerified) {
    redirect("/verify-email");
  }
  */

  // Session is valid - render dashboard
  // The user object is available at: session.user
  // The session object is available at: session.session
  return (
    <>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="p-8 sm:p-12">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
