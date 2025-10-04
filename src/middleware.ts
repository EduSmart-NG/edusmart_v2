import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Protect email-verified page
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

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https://api.resend.com;
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
    "/auth/email-verified", // Added protection for email-verified page
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
