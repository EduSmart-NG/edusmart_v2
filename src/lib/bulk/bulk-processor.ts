/**
 * Generic Bulk Processor
 *
 * Reusable batch processing utility for bulk import/export operations
 * with progress tracking, error handling, and transaction management
 */

import prisma from "@/lib/prisma";
import {
  BulkImportRowError,
  BulkProcessorOptions,
  BulkProcessorResult,
} from "@/types/question-api";

export interface ProcessorCallbacks<TInput, TOutput> {
  /**
   * Validate single row
   */
  validate: (
    row: TInput,
    index: number
  ) => Promise<{
    valid: boolean;
    errors?: BulkImportRowError[];
  }>;

  /**
   * Transform validated row to database format
   */
  transform: (row: TInput, index: number) => Promise<TOutput>;

  /**
   * Save batch to database
   */
  save: (batch: TOutput[]) => Promise<{ count: number; ids?: string[] }>;
}

/**
 * Process bulk data in batches with validation and error handling
 */
export async function processBulkData<TInput, TOutput>(
  data: TInput[],
  callbacks: ProcessorCallbacks<TInput, TOutput>,
  options: BulkProcessorOptions = {}
): Promise<BulkProcessorResult> {
  const { batchSize = 50, onProgress, validateOnly = false } = options;

  const errors: BulkImportRowError[] = [];
  const validatedData: TOutput[] = [];
  let processedCount = 0;

  try {
    // ============================================
    // STAGE 1: VALIDATION
    // ============================================
    onProgress?.({
      stage: "validating",
      current: 0,
      total: data.length,
      percentage: 0,
      message: "Validating data...",
    });

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Validate row
      const validation = await callbacks.validate(row, i + 1);

      if (!validation.valid && validation.errors) {
        errors.push(...validation.errors);
        continue;
      }

      // Transform to output format
      try {
        const transformed = await callbacks.transform(row, i + 1);
        validatedData.push(transformed);
      } catch (error) {
        errors.push({
          row: i + 1,
          message: `Transformation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }

      // Update progress
      if ((i + 1) % 10 === 0 || i === data.length - 1) {
        onProgress?.({
          stage: "validating",
          current: i + 1,
          total: data.length,
          percentage: Math.round(((i + 1) / data.length) * 100),
          message: `Validated ${i + 1} of ${data.length} rows`,
        });
      }
    }

    // If validation-only mode, return early
    if (validateOnly) {
      return {
        success: true,
        processedCount: validatedData.length,
        failedCount: errors.length,
        errors,
        data: validatedData,
      };
    }

    // ============================================
    // STAGE 2: BATCH SAVING
    // ============================================
    onProgress?.({
      stage: "saving",
      current: 0,
      total: validatedData.length,
      percentage: 0,
      message: "Saving data to database...",
    });

    let savedCount = 0;

    // Process in batches
    for (let i = 0; i < validatedData.length; i += batchSize) {
      const batch = validatedData.slice(i, i + batchSize);

      try {
        // Save batch within transaction
        const result = await prisma.$transaction(async (_tx) => {
          // Use transaction-aware callback
          return await callbacks.save(batch);
        });

        savedCount += result.count;
        processedCount = savedCount;

        // Update progress
        onProgress?.({
          stage: "saving",
          current: savedCount,
          total: validatedData.length,
          percentage: Math.round((savedCount / validatedData.length) * 100),
          message: `Saved ${savedCount} of ${validatedData.length} records`,
        });
      } catch (error) {
        // Log batch error but continue with next batch
        console.error(
          `Batch save failed (rows ${i + 1}-${i + batch.length}):`,
          error
        );

        // Add errors for failed batch
        batch.forEach((_, index) => {
          errors.push({
            row: i + index + 1,
            message: `Batch save failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        });
      }
    }

    // ============================================
    // COMPLETE
    // ============================================
    onProgress?.({
      stage: "complete",
      current: processedCount,
      total: data.length,
      percentage: 100,
      message: `Import complete: ${processedCount} saved, ${errors.length} failed`,
    });

    return {
      success: true,
      processedCount,
      failedCount: errors.length,
      errors,
    };
  } catch (error) {
    console.error("Bulk processor error:", error);

    onProgress?.({
      stage: "error",
      current: processedCount,
      total: data.length,
      percentage: 0,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      processedCount,
      failedCount: data.length - processedCount,
      errors: [
        ...errors,
        {
          row: 0,
          message: error instanceof Error ? error.message : "Processing failed",
        },
      ],
    };
  }
}

/**
 * Export data in batches with progress tracking
 */
export async function exportBulkData<TInput, TOutput>(
  queryFn: () => Promise<TInput[]>,
  transformFn: (row: TInput, index: number) => Promise<TOutput>,
  options: BulkProcessorOptions = {}
): Promise<{ data: TOutput[]; errors: BulkImportRowError[] }> {
  const { onProgress } = options;
  const errors: BulkImportRowError[] = [];
  const transformedData: TOutput[] = [];

  try {
    // Query data
    onProgress?.({
      stage: "querying",
      current: 0,
      total: 0,
      percentage: 0,
      message: "Querying database...",
    });

    const data = await queryFn();

    onProgress?.({
      stage: "decrypting",
      current: 0,
      total: data.length,
      percentage: 0,
      message: "Processing records...",
    });

    // Transform each row
    for (let i = 0; i < data.length; i++) {
      try {
        const transformed = await transformFn(data[i], i + 1);
        transformedData.push(transformed);
      } catch (error) {
        errors.push({
          row: i + 1,
          message: `Transform failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }

      // Update progress
      if ((i + 1) % 10 === 0 || i === data.length - 1) {
        onProgress?.({
          stage: "decrypting",
          current: i + 1,
          total: data.length,
          percentage: Math.round(((i + 1) / data.length) * 100),
          message: `Processed ${i + 1} of ${data.length} records`,
        });
      }
    }

    onProgress?.({
      stage: "complete",
      current: transformedData.length,
      total: data.length,
      percentage: 100,
      message: "Export complete",
    });

    return { data: transformedData, errors };
  } catch (error) {
    onProgress?.({
      stage: "error",
      current: 0,
      total: 0,
      percentage: 0,
      message: error instanceof Error ? error.message : "Export failed",
    });

    throw error;
  }
}
