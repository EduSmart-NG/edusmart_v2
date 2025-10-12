/**
 * Better Auth Client Configuration
 *
 * UPDATED WITH RBAC SUPPORT
 *
 * SECURITY: No API keys or secrets in client-side code.
 * All sensitive operations are handled server-side via Server Actions.
 *
 * @module lib/auth-client
 */

import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  twoFactorClient,
  adminClient,
} from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";
import type { auth } from "./auth";
import { ac, roles } from "@/lib/rbac/permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/v1/auth",
  plugins: [
    inferAdditionalFields<typeof auth>(),
    usernameClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        // Redirect to 2FA verification page when user with 2FA enabled logs in
        window.location.href = "/2fa";
      },
    }),
    adminClient({
      ac,
      roles,
    }),
  ],
});

export type AuthClient = typeof authClient;
