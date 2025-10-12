import type { BetterAuthClientPlugin } from "better-auth/client";
import type { questionUploadPlugin } from "./server";

export const questionUploadPluginClient = () => {
  return {
    id: "question-upload",

    // Type inference from server plugin
    $InferServerPlugin: {} as ReturnType<typeof questionUploadPlugin>,

    // No client-side actions - all handled via Server Actions
    getActions: () => ({}),
  } satisfies BetterAuthClientPlugin;
};
