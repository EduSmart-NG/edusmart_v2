/**
 * Question Bulk Import/Export Validation
 */

import { z } from "zod";

// ============================================
// IMPORT VALIDATION
// ============================================

export const bulkImportRequestSchema = z.object({
  format: z.enum(["excel", "csv", "json"]),
  validateOnly: z.boolean().optional().default(false),
});

export type BulkImportRequestInput = z.infer<typeof bulkImportRequestSchema>;

export function validateBulkImportRequest(data: unknown) {
  return bulkImportRequestSchema.parse(data);
}

// ============================================
// EXPORT VALIDATION
// ============================================

export const bulkExportQuerySchema = z.object({
  format: z.enum(["excel", "csv", "json"]),
  examType: z.string().optional(),
  subject: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  difficultyLevel: z.enum(["easy", "medium", "hard"]).optional(),
  questionType: z.enum(["multiple_choice", "true_false"]).optional(),
  limit: z.number().int().min(1).max(10000).optional().default(1000),
  includeDeleted: z.boolean().optional().default(false),
});

export type BulkExportQueryInput = z.infer<typeof bulkExportQuerySchema>;

export function validateBulkExportQuery(data: unknown) {
  return bulkExportQuerySchema.parse(data);
}

// ============================================
// TEMPLATE VALIDATION
// ============================================

export const templateRequestSchema = z.object({
  format: z.enum(["excel", "csv", "json"]),
  includeSamples: z.boolean().optional().default(true),
});

export type TemplateRequestInput = z.infer<typeof templateRequestSchema>;

export function validateTemplateRequest(data: unknown) {
  return templateRequestSchema.parse(data);
}
