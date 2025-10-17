import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username, captcha, twoFactor, admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTwoFactorOTP,
} from "@/lib/emails/profile-settings";
import { redis } from "@/lib/redis";
import { questionUploadPlugin } from "@/lib/plugins/question-upload/server";
import { ac, roles } from "@/lib/rbac/permissions";
import { examUploadPlugin } from "./plugins/exam-upload/server";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  basePath: "/api/v1/auth",

  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],

  appName: "EduSmart",

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
    captcha({
      provider: "google-recaptcha",
      secretKey: process.env.RECAPTCHA_SECRET_KEY!,
      minScore: 0.5,
      endpoints: ["/sign-up/email", "/sign-in/email", "/forget-password"],
    }),
    twoFactor({
      issuer: "EduSmart",
      skipVerificationOnEnable: false,
      totpOptions: {
        period: 30,
        digits: 6,
      },
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          try {
            await sendTwoFactorOTP(user.email, otp, user.name);
            console.log(`2FA OTP sent to: ${user.email}`);
          } catch (error) {
            console.error("Failed to send 2FA OTP:", error);
            throw new Error("Failed to send 2FA OTP");
          }
        },
        period: 3,
        storeOTP: "encrypted",
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
        storeBackupCodes: "encrypted",
      },
    }),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      adminUserIds:
        process.env.ADMIN_USER_IDS?.split(",").filter(Boolean) || [],
      impersonationSessionDuration: 60 * 60, // 1 hour
      defaultBanReason: "Violation of terms of service",
      bannedUserMessage:
        "Your account has been suspended. Please contact support if you believe this is an error.",
      ac,
      roles,
    }),
    questionUploadPlugin({
      apiKey: process.env.QUESTION_UPLOAD_API_KEY!,
      enableRateLimit: true,
      rateLimit: {
        window: 3600, // 1 hour in seconds
        max: 50, // 50 uploads per hour
      },
    }),
    examUploadPlugin({
      apiKey: process.env.EXAM_API_KEY!,
      enableRateLimit: true,
      rateLimit: {
        window: 300, // 5 minutes
        max: 10, // 10 exam creations per 5 minutes
      },
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
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, url }) => {
        try {
          await sendVerificationEmail(user.email, url);
          console.log(`Email change verification sent to: ${user.email}`);
        } catch (error) {
          console.error("Failed to send email change verification:", error);
          throw new Error("Failed to send email change verification");
        }
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        try {
          await sendVerificationEmail(user.email, url);
          console.log(`Account deletion verification sent to: ${user.email}`);
        } catch (error) {
          console.error("Failed to send account deletion verification:", error);
          throw new Error("Failed to send account deletion verification");
        }
      },
      beforeDelete: async (user) => {
        // Prevent deletion of admin accounts via regular deletion flow
        const adminUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        if (adminUser?.role === "admin") {
          throw new Error("Admin accounts cannot be deleted via this method");
        }

        console.log(`Preparing to delete account: ${user.email}`);
      },
      afterDelete: async (user) => {
        console.log(`Account deleted successfully: ${user.email}`);
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
      updateUserInfoOnLink: true,
      allowUnlinkingAll: false,
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
      "/update-user": {
        window: 60,
        max: 10,
      },
      "/change-email": {
        window: 300,
        max: 3,
      },
      "/change-password": {
        window: 60,
        max: 5,
      },
      "/delete-user": {
        window: 300,
        max: 1,
      },
      "/revoke-session": {
        window: 60,
        max: 10,
      },
      "/revoke-sessions": {
        window: 60,
        max: 5,
      },
      "/two-factor/enable": {
        window: 300,
        max: 3,
      },
      "/two-factor/verify": {
        window: 60,
        max: 5,
      },
      "/two-factor/send-otp": {
        window: 300,
        max: 3,
      },
      // Admin endpoints rate limiting
      "/admin/create-user": {
        window: 60,
        max: 5,
      },
      "/admin/list-users": {
        window: 60,
        max: 30,
      },
      "/admin/set-role": {
        window: 60,
        max: 10,
      },
      "/admin/ban-user": {
        window: 60,
        max: 10,
      },
      "/admin/unban-user": {
        window: 60,
        max: 10,
      },
      "/admin/impersonate-user": {
        window: 300,
        max: 5,
      },
      "/admin/remove-user": {
        window: 300,
        max: 5,
      },
      "/admin/set-user-password": {
        window: 60,
        max: 10,
      },
      "/admin/list-user-sessions": {
        window: 60,
        max: 20,
      },
      "/admin/revoke-user-session": {
        window: 60,
        max: 20,
      },
      "/admin/update-user": {
        window: 60,
        max: 10,
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
    freshAge: 60 * 60 * 24,
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

    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
    },

    cookies: {
      session_token: {
        name: "session_token",
        attributes: {
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
        },
      },
      session_data: {
        name: "session_data",
        attributes: {
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
        },
      },
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
