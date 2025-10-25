import type { BetterAuthClientPlugin } from "better-auth/client";
import type { subjectPlugin } from "./server";

export const subjectPluginClient = () => {
  return {
    id: "subject",

    // Type inference from server plugin
    $InferServerPlugin: {} as ReturnType<typeof subjectPlugin>,

    // No client-side actions - all handled via Server Actions
    getActions: () => ({}),
  } satisfies BetterAuthClientPlugin;
};
