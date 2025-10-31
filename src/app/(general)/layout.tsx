import Navbar from "@/components/general/navbar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function GeneralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <Navbar session={session} />
      {children}
    </>
  );
}
