import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { redis } from "@/lib/redis";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  basePath: "/api/v1/auth",

  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],

  // Email & Password Configuration
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // Email Verification Configuration
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

  // Social Providers Configuration
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "consent",
      mapProfileToUser: (profile) => {
        return {
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          emailVerified: profile.email_verified || false,
        };
      },
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      scope: ["email", "public_profile"],
      fields: ["id", "name", "email", "picture"],
      mapProfileToUser: (profile) => {
        return {
          email: profile.email,
          name: profile.name,
          image: profile.picture?.data?.url,
          emailVerified: true,
        };
      },
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY as string,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET as string,
    },
  },

  // User Additional Fields Configuration
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        input: true,
        unique: true,
      },
      dateOfBirth: {
        type: "string",
        required: true,
        input: true,
      },
      gender: {
        type: "string",
        required: true,
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
        required: true,
        input: true,
      },
      lga: {
        type: "string",
        required: true,
        input: true,
      },
      schoolName: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  // Rate Limiting Configuration
  rateLimit: {
    enabled: true,
    window: 60, // 60 seconds
    max: 100, // 100 requests per minute
    storage: "secondary-storage",
    customRules: {
      "/sign-up/email": {
        window: 60,
        max: 5, // 5 registration attempts per minute per IP
      },
      "/sign-in/email": {
        window: 60,
        max: 10, // 10 login attempts per minute per IP
      },
      "/send-verification-email": {
        window: 300, // 5 minutes
        max: 3, // 3 verification emails per 5 minutes
      },
    },
  },

  // Secondary Storage (Redis) Configuration
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

  // Session Configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },

  // Advanced Security Configuration
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "edusmart",
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  // Database Hooks for Additional Validation
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Additional server-side validation
          const username = user.username as string | undefined;
          const email = user.email as string | undefined;
          const dateOfBirth = user.dateOfBirth as string | undefined;
          const gender = user.gender as string | undefined;
          const state = user.state as string | undefined;
          const lga = user.lga as string | undefined;

          if (!username || username.length < 3) {
            throw new Error("Username must be at least 3 characters");
          }

          if (!email || !email.includes("@")) {
            throw new Error("Invalid email address");
          }

          if (!dateOfBirth) {
            throw new Error("Date of birth is required");
          }

          if (!gender || !["MALE", "FEMALE"].includes(gender)) {
            throw new Error("Valid gender is required");
          }

          if (!state || !lga) {
            throw new Error("State and LGA are required");
          }

          return { data: user };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
