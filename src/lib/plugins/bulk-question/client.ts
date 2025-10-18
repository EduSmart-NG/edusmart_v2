/**
 * Question Bulk Operations Client Plugin
 *
 * Better Auth client plugin for bulk question operations.
 * All operations are handled via Server Actions for better security.
 *
 * @module lib/plugins/question-bulk/client
 */

import type { BetterAuthClientPlugin } from "better-auth/client";
import { questionBulkPlugin } from "./server";

export const questionBulkPluginClient = () => {
  return {
    id: "question-bulk",

    // Type inference from server plugin
    $InferServerPlugin: {} as ReturnType<typeof questionBulkPlugin>,

    // No client-side actions - all handled via Server Actions
    getActions: () => ({}),
  } satisfies BetterAuthClientPlugin;
};
