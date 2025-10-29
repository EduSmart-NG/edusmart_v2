import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { UserManagementProvider } from "@/components/providers/user-management-provider";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduSmart",
  description: "Your best school exam platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <UserManagementProvider
            autoRefresh={true}
            refreshInterval={300000} // 5 minutes
            disableCookieCache={false}
            freshAgeSeconds={86400} // 1 day
          >
            {children}
          </UserManagementProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
