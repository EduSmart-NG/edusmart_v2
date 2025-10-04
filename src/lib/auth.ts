import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username, captcha } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { redis } from "@/lib/redis";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  basePath: "/api/v1/auth",

  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: (username) => {
        if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
          return false;
        }
        const reserved = ["admin", "root", "system", "support", "moderator"];
        if (reserved.includes(username.toLowerCase())) {
          return false;
        }
        return true;
      },
      usernameNormalization: (username) => username.toLowerCase().trim(),
      displayUsernameNormalization: false,
    }),
    // ✅ ADDED: Google reCAPTCHA v3 bot protection
    captcha({
      provider: "google-recaptcha",
      secretKey: process.env.RECAPTCHA_SECRET_KEY!,
      minScore: 0.5, // Minimum score threshold (0.0-1.0, where 1.0 is very likely human)
      endpoints: [
        "/sign-up/email", // Protect registration
        "/sign-in/email", // Protect login
        "/forget-password", // Protect password reset request
        // "/reset-password", // Optional: Uncomment to protect password reset
      ],
    }),
    nextCookies(), // MUST be last plugin in array
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail(user.email, url);
        console.log(`Password reset email sent to: ${user.email}`);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error("Failed to send password reset email");
      }
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password successfully reset for user: ${user.email}`);
    },
    resetPasswordTokenExpiresIn: 3600,
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendVerificationEmail(user.email, url);
      } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
      }
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "consent",
      mapProfileToUser: (profile) => {
        const baseUsername = profile.email
          .split("@")[0]
          .replace(/[^a-zA-Z0-9]/g, "_")
          .toLowerCase();

        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const generatedUsername = `${baseUsername}_${randomSuffix}`;

        return {
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          emailVerified: profile.email_verified || false,
          username: generatedUsername,
          displayUsername: profile.name || baseUsername,
        };
      },
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      scope: ["email", "public_profile"],
      fields: ["id", "name", "email", "picture"],
      mapProfileToUser: (profile) => {
        const baseUsername =
          profile.email
            ?.split("@")[0]
            .replace(/[^a-zA-Z0-9]/g, "_")
            .toLowerCase() || "fbuser";

        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const generatedUsername = `${baseUsername}_${randomSuffix}`;

        return {
          email: profile.email,
          name: profile.name,
          image: profile.picture?.data?.url,
          emailVerified: true,
          username: generatedUsername,
          displayUsername: profile.name || baseUsername,
        };
      },
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY as string,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET as string,
      mapProfileToUser: (profile) => {
        const baseUsername = profile.username || "tiktokuser";
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const generatedUsername = `${baseUsername
          .replace(/[^a-zA-Z0-9]/g, "_")
          .toLowerCase()}_${randomSuffix}`;

        return {
          email: profile.email,
          name: profile.display_name || profile.username,
          image: profile.avatar_url,
          emailVerified: true,
          username: generatedUsername,
          displayUsername: profile.display_name || profile.username,
        };
      },
    },
  },

  user: {
    additionalFields: {
      dateOfBirth: {
        type: "string",
        required: false,
        input: true,
      },
      gender: {
        type: "string",
        required: false,
        input: true,
      },
      phoneNumber: {
        type: "string",
        required: false,
        input: true,
      },
      address: {
        type: "string",
        required: false,
        input: true,
      },
      state: {
        type: "string",
        required: false,
        input: true,
      },
      lga: {
        type: "string",
        required: false,
        input: true,
      },
      schoolName: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "secondary-storage",
    customRules: {
      "/sign-up/email": {
        window: 60,
        max: 5,
      },
      "/sign-in/email": {
        window: 60,
        max: 10,
      },
      "/send-verification-email": {
        window: 300,
        max: 3,
      },
      "/forget-password": {
        window: 300,
        max: 3,
      },
      "/reset-password": {
        window: 60,
        max: 5,
      },
    },
  },

  secondaryStorage: {
    get: async (key: string) => {
      return await redis.get(key);
    },
    set: async (key: string, value: string, ttl?: number) => {
      await redis.set(key, value, ttl);
    },
    delete: async (key: string) => {
      await redis.delete(key);
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "edusmart",
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const isOAuthSignup = !user.password;

          if (!isOAuthSignup) {
            const dateOfBirth = user.dateOfBirth as string | undefined;
            const gender = user.gender as string | undefined;
            const state = user.state as string | undefined;
            const lga = user.lga as string | undefined;

            if (!dateOfBirth) {
              throw new Error("Date of birth is required");
            }

            if (!gender || !["MALE", "FEMALE"].includes(gender)) {
              throw new Error("Valid gender is required");
            }

            if (!state) {
              throw new Error("State is required");
            }

            if (!lga) {
              throw new Error("LGA is required");
            }
          }

          return { data: user };
        },
      },
    },
  },
});
