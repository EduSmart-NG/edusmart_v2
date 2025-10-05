"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import type { ActionResult } from "@/types/user-management";

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload and update user avatar
 * Validates file, optimizes it, saves to public directory, and updates database
 *
 * @param formData - FormData containing the image file
 * @returns Action result with image URL
 */
export async function uploadAvatar(
  formData: FormData
): Promise<ActionResult<{ imageUrl: string }>> {
  try {
    // Get current session
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: "No active session found",
        code: "NO_SESSION",
      };
    }

    // Get file from FormData
    const file = formData.get("avatar") as File;

    if (!file) {
      return {
        success: false,
        message: "No file provided",
        code: "NO_FILE",
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        message: "File size must be less than 5MB",
        code: "FILE_TOO_LARGE",
      };
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        message: "Only JPEG, PNG, and WebP images are allowed",
        code: "INVALID_FILE_TYPE",
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.type.split("/")[1];
    const filename = `avatar-${session.user.id}-${timestamp}.${extension}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure avatars directory exists
    const publicDir = join(process.cwd(), "public", "avatars");
    await mkdir(publicDir, { recursive: true });

    const filepath = join(publicDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Generate public URL
    const imageUrl = `/avatars/${filename}`;

    // Delete old avatar if exists (to prevent storage bloat)
    if (session.user.image && session.user.image.startsWith("/avatars/")) {
      try {
        const oldFilepath = join(process.cwd(), "public", session.user.image);
        await unlink(oldFilepath);
      } catch (error) {
        // Ignore errors if old file doesn't exist
        console.warn("Could not delete old avatar:", error);
      }
    }

    // Update user in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: imageUrl,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Avatar uploaded successfully",
      data: { imageUrl },
    };
  } catch (error) {
    console.error("Avatar upload error:", error);

    return {
      success: false,
      message: "Failed to upload avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete user avatar
 * Removes avatar file and updates database
 *
 * @returns Action result
 */
export async function deleteAvatar(): Promise<ActionResult> {
  try {
    // Get current session
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: "No active session found",
        code: "NO_SESSION",
      };
    }

    // Check if user has an avatar
    if (!session.user.image) {
      return {
        success: false,
        message: "No avatar to delete",
        code: "NO_AVATAR",
      };
    }

    // Only delete if it's a local file (not external URL)
    if (session.user.image.startsWith("/avatars/")) {
      try {
        const filepath = join(process.cwd(), "public", session.user.image);
        await unlink(filepath);
      } catch (error) {
        console.warn("Could not delete avatar file:", error);
      }
    }

    // Update user in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: null,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Avatar deleted successfully",
    };
  } catch (error) {
    console.error("Avatar delete error:", error);

    return {
      success: false,
      message: "Failed to delete avatar",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
