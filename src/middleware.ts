import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js Middleware for route protection
 *
 * Security Layers:
 * 1. Middleware (this file) - Fast, optimistic cookie-based checks
 * 2. Server Components - Full session validation with Better Auth API
 *
 * IMPORTANT: This middleware only checks for session cookie existence.
 * Full session validation happens in Server Components (layouts).
 *
 * @see https://www.better-auth.com/docs/integrations/next#middleware
 * @see https://nextjs.org/docs/app/guides/authentication
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * Check for Better Auth session cookie
   * Only check for existence - validity is checked in Server Components
   */
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "", // Empty because we're using custom cookie names
    cookieName: "session_token", // Matches auth.ts cookies.session_token.name
  });

  const isAuthenticated = !!sessionCookie;

  // =====================================================
  // PREVENT REDIRECT LOOPS
  // =====================================================
  // Check if we're in a potential redirect loop scenario
  const referer = request.headers.get("referer");
  const isFromDashboard = referer?.includes("/dashboard");
  const isFromAuth = referer?.includes("/auth/");

  // If coming from dashboard to auth page, don't redirect back to dashboard
  // This prevents loops when dashboard detects invalid session
  if (isFromDashboard && pathname.startsWith("/auth/")) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // =====================================================
  // PROTECT 2FA VERIFICATION PAGE
  // =====================================================
  if (pathname === "/auth/2fa") {
    // Check for pending 2FA verification cookie
    const pending2FA = request.cookies.get("pending_2fa_verification");
    const url = request.nextUrl;
    const hasCallbackUrl = url.searchParams.has("callbackUrl");

    if (!pending2FA?.value && !hasCallbackUrl) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Validate cookie format and expiry if cookie exists
    if (pending2FA?.value) {
      try {
        const cookieData = JSON.parse(pending2FA.value) as {
          userId: string;
          expires: string;
        };
        const expiryTime = new Date(cookieData.expires);

        if (expiryTime < new Date()) {
          const response = NextResponse.redirect(
            new URL("/auth/login", request.url)
          );
          response.cookies.delete("pending_2fa_verification");
          return response;
        }
      } catch {
        const response = NextResponse.redirect(
          new URL("/auth/login", request.url)
        );
        response.cookies.delete("pending_2fa_verification");
        return response;
      }
    }

    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // =====================================================
  // PROTECT DASHBOARD ROUTES
  // =====================================================
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // User has session cookie, allow through
    // Full validation will happen in dashboard layout (Server Component)
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // =====================================================
  // REDIRECT AUTHENTICATED USERS FROM AUTH PAGES (CAREFULLY)
  // =====================================================
  const authPages = ["/auth/login", "/auth/register", "/auth/forgot-password"];

  if (isAuthenticated && authPages.includes(pathname)) {
    // Additional safety checks to prevent redirect loops

    // Don't redirect if we just came from auth pages (potential loop)
    if (isFromAuth) {
      const response = NextResponse.next();
      addSecurityHeaders(response);
      return response;
    }

    // Don't redirect if there are error parameters (likely invalid session)
    const url = request.nextUrl;
    const hasError =
      url.searchParams.has("error") ||
      url.searchParams.has("invalid_session") ||
      url.searchParams.has("session_expired");

    if (hasError) {
      const response = NextResponse.next();
      addSecurityHeaders(response);
      return response;
    }

    // Only redirect if we're confident about the session
    // Add a query parameter to track redirects
    const dashboardUrl = new URL("/dashboard", request.url);
    // dashboardUrl.searchParams.set("from_middleware", "true");
    return NextResponse.redirect(dashboardUrl);
  }

  // =====================================================
  // PROTECT EMAIL VERIFICATION PAGE
  // =====================================================
  if (pathname === "/verify-email" || pathname === "/auth/verify-email") {
    const pendingVerification = request.cookies.get("pending_verification");

    if (!pendingVerification?.value) {
      const registerUrl = new URL("/auth/register", request.url);
      return NextResponse.redirect(registerUrl);
    }

    try {
      const cookieData = JSON.parse(pendingVerification.value) as {
        email: string;
        expires: string;
      };
      const expiryTime = new Date(cookieData.expires);

      if (expiryTime < new Date()) {
        const response = NextResponse.redirect(
          new URL("/auth/register", request.url)
        );
        response.cookies.delete("pending_verification");
        return response;
      }
    } catch {
      const response = NextResponse.redirect(
        new URL("/auth/register", request.url)
      );
      response.cookies.delete("pending_verification");
      return response;
    }

    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // =====================================================
  // PROTECT EMAIL VERIFIED PAGE
  // =====================================================
  if (pathname === "/auth/email-verified") {
    // Allow access to email-verified page
    // Better Auth redirects here after processing verification
    // The page component handles both success and error states
    const response = NextResponse.next();

    // Clean up verification cookie on successful verification
    response.cookies.delete("pending_verification");

    addSecurityHeaders(response);
    return response;
  }

  // =====================================================
  // PROTECT PASSWORD RESET PAGE
  // =====================================================
  if (pathname === "/auth/reset-password") {
    const url = request.nextUrl;
    const token = url.searchParams.get("token");

    if (!token) {
      const forgotPasswordUrl = new URL("/auth/forgot-password", request.url);
      return NextResponse.redirect(forgotPasswordUrl);
    }

    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // =====================================================
  // APPLY SECURITY HEADERS TO ALL OTHER ROUTES
  // =====================================================
  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https://api.resend.com https://www.google.com;
    frame-src https://www.google.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  response.headers.set("Content-Security-Policy", cspHeader);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/2fa",
    "/verify-email",
    "/auth/verify-email",
    "/auth/email-verified",
    "/auth/reset-password",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
