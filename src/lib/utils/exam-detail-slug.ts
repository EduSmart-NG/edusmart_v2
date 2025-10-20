/**
 * Slug Generation Utilities
 *
 * Utility functions for generating URL-safe slugs from exam titles.
 * Handles duplicate titles by appending incremental numbers.
 *
 * @module lib/utils/slug
 */

import prisma from "@/lib/prisma";

/**
 * Generate a URL-safe slug from a title
 *
 * @param title - The title to convert to a slug
 * @returns URL-safe slug
 *
 * @example
 * generateSlugFromTitle("WAEC Mathematics 2024") // "waec-mathematics-2024"
 * generateSlugFromTitle("Test @ Exam #1") // "test-exam-1"
 */
export function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens and spaces
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Ensure a slug is unique by checking the database
 * If slug exists, append a number (e.g., "slug-2", "slug-3")
 *
 * @param baseSlug - The base slug to check
 * @param excludeExamId - Optional exam ID to exclude from uniqueness check (for updates)
 * @returns Unique slug
 *
 * @example
 * await ensureUniqueSlug("waec-mathematics-2024") // "waec-mathematics-2024"
 * await ensureUniqueSlug("waec-mathematics-2024") // "waec-mathematics-2024-2" (if first exists)
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  excludeExamId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    // Check if slug exists
    // Note: MySQL is case-insensitive by default, so no need for mode: 'insensitive'
    const existing = await prisma.exam.findFirst({
      where: {
        title: {
          equals: slug,
        },
        deletedAt: null,
        ...(excludeExamId && { id: { not: excludeExamId } }),
      },
      select: { id: true },
    });

    // If no existing exam with this slug, we're good
    if (!existing) {
      return slug;
    }

    // Increment counter and try again
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * Generate a unique slug for an exam title
 * Combines slug generation and uniqueness check
 *
 * @param title - Exam title
 * @param excludeExamId - Optional exam ID to exclude from check
 * @returns Unique URL-safe slug
 *
 * @example
 * await generateUniqueSlug("WAEC Mathematics 2024") // "waec-mathematics-2024"
 */
export async function generateUniqueSlug(
  title: string,
  excludeExamId?: string
): Promise<string> {
  const baseSlug = generateSlugFromTitle(title);
  return ensureUniqueSlug(baseSlug, excludeExamId);
}
