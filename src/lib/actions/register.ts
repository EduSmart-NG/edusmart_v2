"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  validateAndSanitizeRegistration,
  type RegisterInput,
} from "@/lib/validations/auth";
import { headers, cookies } from "next/headers";
import { ZodError, type ZodIssue } from "zod";

interface RegisterResult {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
}

export async function registerUser(
  data: RegisterInput
): Promise<RegisterResult> {
  try {
    const validatedData = validateAndSanitizeRegistration(data);
    const normalizedEmail = validatedData.email.toLowerCase().trim();
    const dateOfBirth = new Date(validatedData.dateOfBirth).toISOString();

    const result = await auth.api.signUpEmail({
      body: {
        name: validatedData.name,
        email: normalizedEmail,
        password: validatedData.password,
        username: validatedData.username,
        displayUsername: validatedData.username,
        dateOfBirth,
        gender: validatedData.gender,
        phoneNumber: validatedData.phoneNumber || undefined,
        address: validatedData.address || undefined,
        state: validatedData.state,
        lga: validatedData.lga,
        schoolName: validatedData.schoolName || undefined,
        callbackURL: "/auth/email-verified",
      },
      headers: await headers(),
    });

    if (!result) {
      return {
        success: false,
        message: "Registration failed. Please try again.",
      };
    }

    // Set secure cookie to allow access to verify-email page
    await setVerificationCookie(normalizedEmail);

    return {
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((err: ZodIssue) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });

      return {
        success: false,
        message: "Validation failed",
        errors: fieldErrors,
      };
    }

    if (error instanceof Error) {
      console.error("Registration error:", error.message);

      if (
        error.message.toLowerCase().includes("unique") ||
        error.message.toLowerCase().includes("duplicate") ||
        error.message.toLowerCase().includes("already exists")
      ) {
        if (error.message.toLowerCase().includes("email")) {
          return {
            success: false,
            message: "Registration failed",
            errors: {
              email: "This email is already registered",
            },
          };
        }

        if (error.message.toLowerCase().includes("username")) {
          return {
            success: false,
            message: "Registration failed",
            errors: {
              username: "This username is already taken",
            },
          };
        }

        return {
          success: false,
          message: "This username or email is already registered.",
        };
      }
    }

    console.error("Registration error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

// Enhanced secure cookie setting
async function setVerificationCookie(email: string) {
  const cookieStore = await cookies(); // Add await here
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 30); // 30 minutes expiry

  const cookieData = {
    email,
    timestamp: new Date().toISOString(),
    expires: expiryTime.toISOString(),
  };

  cookieStore.set("pending_verification", JSON.stringify(cookieData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 60, // 30 minutes
    path: "/",
  });
}

export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
  try {
    if (!username || username.length < 3 || username.length > 30) {
      return { available: false };
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      return { available: false };
    }

    const reserved = ["admin", "root", "system", "support", "moderator"];
    if (reserved.includes(username.toLowerCase())) {
      return { available: false };
    }

    const normalizedUsername = username.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    return { available: !existingUser };
  } catch (error) {
    console.error("Username availability check error:", error);
    return { available: false };
  }
}
