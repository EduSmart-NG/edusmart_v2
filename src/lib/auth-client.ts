import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins"; // ✅ ADDED: Username client plugin
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/v1/auth",
  plugins: [
    inferAdditionalFields<typeof auth>(),
    usernameClient(), // ✅ ADDED: Username client plugin for username methods
  ],
});

export type AuthClient = typeof authClient;
