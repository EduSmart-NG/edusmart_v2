/**
 * CSV Format Handler (PapaParse)
 *
 * Handles .csv file parsing and generation
 */

import Papa from "papaparse";
import type {
  FormatHandler,
  ParseOptions,
  ParseResult,
  ExportOptions,
  ExportResult,
  TemplateOptions,
  ParseError,
} from "@/types/bulk-import";

export class CsvFormatHandler<T = Record<string, unknown>>
  implements FormatHandler<T>
{
  async parse(
    buffer: Buffer,
    options: ParseOptions = {}
  ): Promise<ParseResult<T>> {
    const { hasHeaders = true, maxRows, skipEmptyRows = true } = options;

    const errors: ParseError[] = [];

    try {
      const csvString = buffer.toString("utf-8");

      const parseResult = Papa.parse(csvString, {
        header: hasHeaders,
        skipEmptyLines: skipEmptyRows,
        dynamicTyping: true,
        transformHeader: (header: string) => header.trim(),
        delimitersToGuess: [",", "\t", "|", ";"],
        preview: maxRows,
      });

      // Collect parse errors
      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach((error) => {
          errors.push({
            row: error.row || 0,
            message: error.message,
          });
        });
      }

      const headers = hasHeaders
        ? parseResult.meta.fields || []
        : Array.from(
            {
              length: parseResult.data[0]
                ? Object.keys(parseResult.data[0]).length
                : 0,
            },
            (_, i) => String.fromCharCode(65 + i)
          );

      return {
        data: parseResult.data as T[],
        headers,
        rowCount: parseResult.data.length,
        errors,
      };
    } catch (error) {
      errors.push({
        row: 0,
        message: `Failed to parse CSV file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });

      return {
        data: [],
        headers: [],
        rowCount: 0,
        errors,
      };
    }
  }

  async export(
    data: T[],
    headers: string[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const { includeHeaders = true } = options;

    try {
      const csv = Papa.unparse(data, {
        columns: headers,
        header: includeHeaders,
        quotes: true, // Quote all fields for safety
      });

      // Add UTF-8 BOM for Excel compatibility
      const bom = "\uFEFF";
      const buffer = Buffer.from(bom + csv, "utf-8");

      return {
        buffer,
        filename: `export_${Date.now()}.csv`,
        mimeType: "text/csv",
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to export CSV: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async generateTemplate(
    headers: string[],
    options: TemplateOptions = {}
  ): Promise<ExportResult> {
    const {
      includeSamples = true,
      sampleCount = 3,
      descriptions = {},
    } = options;

    const rows: Record<string, string>[] = [];

    // Add description row if descriptions provided
    if (Object.keys(descriptions).length > 0) {
      const descRow: Record<string, string> = {};
      headers.forEach((h) => {
        descRow[h] = `# ${descriptions[h] || ""}`;
      });
      rows.push(descRow);
    }

    // Add sample data rows
    if (includeSamples) {
      for (let i = 0; i < sampleCount; i++) {
        const sampleRow: Record<string, string> = {};
        headers.forEach((h) => {
          sampleRow[h] = `Sample ${h} ${i + 1}`;
        });
        rows.push(sampleRow);
      }
    }

    const csv = Papa.unparse(rows, {
      columns: headers,
      header: true,
      quotes: true,
    });

    // Add UTF-8 BOM
    const bom = "\uFEFF";
    const buffer = Buffer.from(bom + csv, "utf-8");

    return {
      buffer,
      filename: `template_${Date.now()}.csv`,
      mimeType: "text/csv",
      size: buffer.length,
    };
  }

  async validate(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
    try {
      const csvString = buffer.toString("utf-8");

      const parseResult = Papa.parse(csvString, {
        preview: 1, // Just check first row
      });

      if (parseResult.errors.length > 0) {
        return {
          valid: false,
          error: parseResult.errors[0]?.message || "Invalid CSV format",
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid CSV file",
      };
    }
  }
}

export const csvHandler = new CsvFormatHandler();
