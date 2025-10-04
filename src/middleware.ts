import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session cookie to check if user is logged in
  const sessionCookie = request.cookies.get("edusmart-session");
  const isLoggedIn = !!sessionCookie?.value;

  // ✅ ADDED: Redirect logged-in users away from auth pages
  const authPages = ["/auth/login", "/auth/register", "/auth/forgot-password"];
  if (isLoggedIn && authPages.includes(pathname)) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Protect verify-email page
  if (pathname === "/verify-email" || pathname === "/auth/verify-email") {
    const pendingVerification = request.cookies.get("pending_verification");

    if (!pendingVerification?.value) {
      const loginUrl = new URL("/auth/register", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Validate cookie format and expiry
    try {
      const cookieData = JSON.parse(pendingVerification.value);
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

  // ✅ ADDED: Protect email-verified page
  if (pathname === "/auth/email-verified") {
    const url = request.nextUrl;
    const token = url.searchParams.get("token");
    const error = url.searchParams.get("error");

    // Allow access only if there's a token or error parameter (coming from email link)
    if (!token && !error) {
      const loginUrl = new URL("/auth/register", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Clear pending verification cookie on successful access
    const response = NextResponse.next();
    if (token) {
      response.cookies.delete("pending_verification");
    }
    addSecurityHeaders(response);
    return response;
  }

  // ✅ ADDED: Protect reset-password page
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

  // Apply security headers to all other routes
  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // ✅ UPDATED: Add reCAPTCHA domains to CSP
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
    "/verify-email",
    "/auth/verify-email",
    "/auth/email-verified",
    "/auth/reset-password", // ✅ ADDED
    "/auth/login", // ✅ ADDED
    "/auth/register", // ✅ ADDED
    "/auth/forgot-password", // ✅ ADDED
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
