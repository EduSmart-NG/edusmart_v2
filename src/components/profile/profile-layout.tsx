import type { ReactNode } from "react";

interface ProfileLayoutProps {
  children: ReactNode;
}

export function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
