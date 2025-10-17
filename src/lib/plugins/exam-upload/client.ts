/**
 * Exam Upload Client Plugin
 *
 * Better Auth client plugin for exam upload.
 * All operations are handled via Server Actions for security.
 *
 * @module lib/plugins/exam-upload/client
 */

import type { BetterAuthClientPlugin } from "better-auth/client";
import type { examUploadPlugin } from "./server";

export const examUploadPluginClient = () => {
  return {
    id: "exam-upload",

    // Type inference from server plugin
    $InferServerPlugin: {} as ReturnType<typeof examUploadPlugin>,

    // No client-side actions - all handled via Server Actions
    getActions: () => ({}),
  } satisfies BetterAuthClientPlugin;
};
