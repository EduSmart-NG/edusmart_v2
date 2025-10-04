import VerifyEmailClient from "@/components/auth/verify-email";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server component wrapper to read httpOnly cookie
 * and pass email to client component
 */
export default async function VerifyEmailPage() {
  const cookieStore = await cookies();
  const pendingVerification = cookieStore.get("pending_verification");

  // If no cookie, redirect (backup to middleware)
  if (!pendingVerification?.value) {
    redirect("/auth/register");
  }

  let email = "";

  try {
    const cookieData = JSON.parse(pendingVerification.value);
    email = cookieData.email || "";

    // Check if expired
    const expiryTime = new Date(cookieData.expires);
    if (expiryTime < new Date()) {
      redirect("/auth/register");
    }
  } catch (error) {
    console.error("Error parsing verification cookie:", error);
    redirect("/auth/register");
  }

  // Pass email to client component
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-20">
      <div>
        <VerifyEmailClient initialEmail={email} />
      </div>
    </div>
  );
}
