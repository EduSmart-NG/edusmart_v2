import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

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
    redirect("/auth/login?callbackUrl=/dashboard/admin/users");
  }

  // Check if user has admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, banned: true },
  });

  // Redirect if user is banned or not admin
  if (!user || user.banned || user.role !== "admin") {
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
