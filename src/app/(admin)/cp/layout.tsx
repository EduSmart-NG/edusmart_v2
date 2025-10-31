import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { verifyAdminAccess } from "@/lib/rbac/utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current session
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  // Check if user is authenticated
  if (!session) {
    redirect("/auth/login?redirectTo=/cp/admin-dashboard/");
  }

  const accessCheck = await verifyAdminAccess();

  // Redirect to 404 if not admin or banned
  if (!accessCheck.success) {
    notFound();
  }

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
