"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { Icons } from "@/components/icons";

interface OAuthButtonsProps {
  mode?: "signup" | "signin";
}

export function OAuthButtons({ mode = "signup" }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthSignIn = async (
    provider: "google" | "facebook" | "tiktok"
  ) => {
    try {
      setLoadingProvider(provider);
      await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      console.log(mode);

      setLoadingProvider(null);
    }
  };

  const providers = [
    {
      id: "google" as const,
      name: "Google",
      icon: Icons.google,
    },
    {
      id: "facebook" as const,
      name: "Facebook",
      icon: Icons.facebook,
    },
    {
      id: "tiktok" as const,
      name: "TikTok",
      icon: Icons.tiktok,
    },
  ];

  return (
    <div className="space-y-3">
      {providers.map((provider) => {
        const Icon = provider.icon;
        const isLoading = loadingProvider === provider.id;

        return (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn(provider.id)}
            disabled={loadingProvider !== null}
          >
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icon className="mr-2 h-4 w-4" />
            )}
            Continue with {provider.name}
          </Button>
        );
      })}
    </div>
  );
}
