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
   *
   * IMPORTANT: Cookie configuration must match auth.ts exactly!
   *
   * From your auth.ts:
   * - cookiePrefix: "edusmart" (NOT applied to custom cookie names)
   * - cookies.session_token.name: "session_token"
   *
   * Actual cookie name in browser: "session_token" (NOT "edusmart-session_token")
   *
   * Why? Better Auth does NOT automatically prefix custom cookie names.
   * The cookiePrefix is only used for default cookies.
   *
   * @see https://www.better-auth.com/docs/concepts/cookies
   */
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "", // Empty because we're using custom cookie names
    cookieName: "session_token", // Matches auth.ts cookies.session_token.name
  });

  const isAuthenticated = !!sessionCookie;

  // =====================================================
  // PROTECT DASHBOARD ROUTES
  // =====================================================
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);

      // Preserve the intended destination for redirect after login
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
  // REDIRECT AUTHENTICATED USERS FROM AUTH PAGES
  // =====================================================
  const authPages = ["/auth/login", "/auth/register", "/auth/forgot-password"];
  if (isAuthenticated && authPages.includes(pathname)) {
    const dashboardUrl = new URL("/dashboard", request.url);
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

    // Validate cookie format and expiry
    try {
      const cookieData = JSON.parse(pendingVerification.value) as {
        email: string;
        expires: string;
      };
      const expiryTime = new Date(cookieData.expires);

      if (expiryTime < new Date()) {
        // Cookie expired, clear it and redirect
        const response = NextResponse.redirect(
          new URL("/auth/register", request.url)
        );
        response.cookies.delete("pending_verification");
        return response;
      }
    } catch {
      // Invalid cookie format, clear and redirect
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
    const url = request.nextUrl;
    const token = url.searchParams.get("token");
    const error = url.searchParams.get("error");

    // Allow access only if there's a token or error parameter (coming from email link)
    if (!token && !error) {
      const registerUrl = new URL("/auth/register", request.url);
      return NextResponse.redirect(registerUrl);
    }

    // Clear pending verification cookie on successful access
    const response = NextResponse.next();
    if (token) {
      response.cookies.delete("pending_verification");
    }
    addSecurityHeaders(response);
    return response;
  }

  // =====================================================
  // PROTECT PASSWORD RESET PAGE
  // =====================================================
  if (pathname === "/auth/reset-password") {
    const url = request.nextUrl;
    const token = url.searchParams.get("token");

    // Allow access only if there's a valid token parameter (coming from email link)
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
 * Implements defense-in-depth security headers
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

  // Content Security Policy with reCAPTCHA support
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

/**
 * Configure which routes middleware should run on
 *
 * Matcher patterns:
 * - /dashboard/:path* - All dashboard routes and subroutes
 * - /verify-email - Email verification page
 * - /auth/* - All auth pages
 * - Regex pattern - All other routes except static files and API routes
 */
export const config = {
  matcher: [
    "/dashboard/:path*", // Protect all dashboard routes
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
