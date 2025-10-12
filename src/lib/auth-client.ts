/**
 * Updated src/lib/auth-client.ts
 *
 * Add the question upload client plugin
 */

import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  twoFactorClient,
} from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";
import { questionUploadPluginClient } from "@/lib/plugins/question-upload/client"; // ADD THIS
import type { auth } from "./auth";

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
    // ADD QUESTION UPLOAD CLIENT PLUGIN HERE
    questionUploadPluginClient({
      apiKey: process.env.NEXT_PUBLIC_QUESTION_UPLOAD_API_KEY!,
    }),
  ],
});

export type AuthClient = typeof authClient;
