import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.APP_URL || "http://localhost:3000",
  basePath: "/api/v1/auth",
  plugins: [inferAdditionalFields<typeof auth>()],
});

export type AuthClient = typeof authClient;
