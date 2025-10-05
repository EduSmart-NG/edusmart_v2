/**
 * Email Verified Page - Server Component
 *
 * This page is the callback URL after Better Auth processes email verification.
 *
 * Flow:
 * 1. User clicks verification link in email
 * 2. Link goes to: /api/v1/auth/verify-email?token=...&callbackURL=/auth/email-verified
 * 3. Better Auth verifies the token internally
 * 4. If valid: Better Auth redirects to /auth/email-verified (success)
 * 5. If invalid: Better Auth redirects to /auth/email-verified?error=invalid_token
 * 6. This server component checks the URL state and renders appropriate UI
 *
 * @param searchParams - URL search parameters from Next.js
 */

import EmailVerifiedClient from "@/components/auth/email-verified";

interface EmailVerifiedPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmailVerifiedPage({
  searchParams,
}: EmailVerifiedPageProps) {
  // Await searchParams (Next.js 15 async params)
  const params = await searchParams;
  const error = params.error as string | undefined;

  // Extract error type if present
  const errorType = error || null;

  // If user somehow navigates here directly (no verification flow),
  // we can't determine if it's a success or error, so redirect to register
  // This is optional - you could also show a neutral message
  // Commenting this out since Better Auth will always add a param or redirect properly

  // Render client component with verification status
  return <EmailVerifiedClient error={errorType} />;
}
