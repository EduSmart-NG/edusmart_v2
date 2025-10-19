/**
 * Template Download Server Action
 *
 * Separate server action for downloading question bulk import templates.
 * Handles template generation for Excel, CSV, and JSON formats.
 *
 * Features:
 * - Session validation via Better Auth
 * - Rate limiting per user
 * - Multi-format support (Excel, CSV, JSON)
 * - Sample data included in templates
 * - Field descriptions for guidance
 *
 * @module lib/actions/download-template
 */

"use server";

import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { headers as getHeaders } from "next/headers";
import { validateTemplateRequest } from "@/lib/validations/bulk-questions";
import { excelHandler } from "@/lib/bulk/bulk-formats/excel";
import { csvHandler } from "@/lib/bulk/bulk-formats/csv";
import { jsonHandler } from "@/lib/bulk/bulk-formats/json";
import {
  getQuestionHeaders,
  getQuestionDescriptions,
} from "@/lib/bulk/bulk-questions";
import type { TemplateResponse } from "@/types/question-api";
import { ZodError } from "zod";

// ============================================
// CONSTANTS
// ============================================

const RATE_LIMIT = {
  MAX: 50, // 50 templates per hour
  WINDOW: 3600, // 1 hour in seconds
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check rate limit for template downloads
 */
async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `question_bulk_template:${userId}`;

  try {
    const data = await redis.get(key);
    const now = new Date();

    if (!data) {
      await redis.set(
        key,
        JSON.stringify({
          count: 1,
          windowExpires: new Date(now.getTime() + RATE_LIMIT.WINDOW * 1000),
        }),
        RATE_LIMIT.WINDOW
      );
      return { allowed: true };
    }

    const { count, windowExpires } = JSON.parse(data);
    const expiresAt = new Date(windowExpires);

    if (now > expiresAt) {
      await redis.set(
        key,
        JSON.stringify({
          count: 1,
          windowExpires: new Date(now.getTime() + RATE_LIMIT.WINDOW * 1000),
        }),
        RATE_LIMIT.WINDOW
      );
      return { allowed: true };
    }

    if (count >= RATE_LIMIT.MAX) {
      return {
        allowed: false,
        retryAfter: Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
      };
    }

    const newCount = count + 1;
    const remainingTTL = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / 1000
    );

    await redis.set(
      key,
      JSON.stringify({ count: newCount, windowExpires }),
      remainingTTL > 0 ? remainingTTL : RATE_LIMIT.WINDOW
    );

    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true };
  }
}

// ============================================
// DOWNLOAD TEMPLATE ACTION
// ============================================

/**
 * Download question bulk import template
 *
 * @param format - Template format (excel, csv, or json)
 * @returns Template response with buffer data
 *
 * @example
 * ```typescript
 * const response = await downloadTemplate("excel");
 * if (response.success && response.data) {
 *   const blob = new Blob([new Uint8Array(response.data.buffer)], {
 *     type: response.data.mimeType,
 *   });
 *   // Create download link
 * }
 * ```
 */
export async function downloadTemplate(
  format: "excel" | "csv" | "json"
): Promise<TemplateResponse> {
  try {
    // ============================================
    // STEP 1: AUTHENTICATE USER
    // ============================================
    const headersList = await getHeaders();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return {
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      };
    }

    // ============================================
    // STEP 2: CHECK RATE LIMIT
    // ============================================
    const rateLimit = await checkRateLimit(session.user.id);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // ============================================
    // STEP 3: VALIDATE REQUEST
    // ============================================
    let validatedRequest;
    try {
      validatedRequest = validateTemplateRequest({
        format,
        includeSamples: true,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          message: "Invalid format parameter",
          code: "VALIDATION_ERROR",
        };
      }
      throw error;
    }

    // ============================================
    // STEP 4: SELECT FORMAT HANDLER
    // ============================================
    const handler =
      validatedRequest.format === "excel"
        ? excelHandler
        : validatedRequest.format === "csv"
          ? csvHandler
          : jsonHandler;

    // ============================================
    // STEP 5: GENERATE TEMPLATE
    // ============================================
    const headers = getQuestionHeaders();
    const descriptions = getQuestionDescriptions();

    const templateResult = await handler.generateTemplate(headers, {
      includeSamples: true,
      sampleCount: 3,
      descriptions,
    });

    // ============================================
    // STEP 6: AUDIT LOG
    // ============================================
    console.log("[AUDIT] Template Download:", {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      userEmail: session.user.email,
      format: validatedRequest.format,
      size: templateResult.size,
    });

    // ============================================
    // STEP 7: RETURN TEMPLATE DATA
    // ============================================
    // Convert Buffer to base64 string for serialization
    // Server Actions cannot return Buffer or Uint8Array
    return {
      success: true,
      message: "Template generated successfully",
      data: {
        buffer: templateResult.buffer.toString("base64"), // Convert to base64
        filename: templateResult.filename,
        mimeType: templateResult.mimeType,
        size: templateResult.size,
      },
    };
  } catch (error) {
    console.error("[ERROR] Template download failed:", error);

    return {
      success: false,
      message: "Failed to generate template",
      code: "INTERNAL_ERROR",
    };
  }
}
