/**
 * JSON Format Handler
 *
 * Handles .json file parsing and generation
 */

import type {
  FormatHandler,
  ParseOptions,
  ParseResult,
  ExportOptions,
  ExportResult,
  TemplateOptions,
  ParseError,
} from "@/types/bulk-import";

export class JsonFormatHandler<T = Record<string, unknown>>
  implements FormatHandler<T>
{
  async parse(
    buffer: Buffer,
    options: ParseOptions = {}
  ): Promise<ParseResult<T>> {
    const { maxRows, skipEmptyRows = true } = options;

    const errors: ParseError[] = [];

    try {
      const jsonString = buffer.toString("utf-8");
      let parsed = JSON.parse(jsonString);

      // Ensure we have an array
      if (!Array.isArray(parsed)) {
        if (typeof parsed === "object" && parsed !== null) {
          // Wrap single object in array
          parsed = [parsed];
        } else {
          throw new Error("JSON must be an array or object");
        }
      }

      // Skip empty objects if configured
      let data = skipEmptyRows
        ? parsed.filter((row: unknown) => {
            if (typeof row !== "object" || row === null) return true;
            return Object.keys(row).length > 0;
          })
        : parsed;

      // Apply max rows limit
      if (maxRows) {
        data = data.slice(0, maxRows);
      }

      // Extract headers from first object
      const headers =
        data.length > 0 && typeof data[0] === "object" && data[0] !== null
          ? Object.keys(data[0])
          : [];

      return {
        data: data as T[],
        headers,
        rowCount: data.length,
        errors,
      };
    } catch (error) {
      errors.push({
        row: 0,
        message: `Failed to parse JSON file: ${
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
    const { prettyPrint = true } = options;

    try {
      // Ensure data objects only have specified headers
      const filteredData = data.map((row) => {
        const filtered: Record<string, unknown> = {};
        headers.forEach((header) => {
          filtered[header] = (row as Record<string, unknown>)[header];
        });
        return filtered;
      });

      const json = prettyPrint
        ? JSON.stringify(filteredData, null, 2)
        : JSON.stringify(filteredData);

      const buffer = Buffer.from(json, "utf-8");

      return {
        buffer,
        filename: `export_${Date.now()}.json`,
        mimeType: "application/json",
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to export JSON: ${
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

    const template: unknown[] = [];

    // Add schema object with descriptions
    if (Object.keys(descriptions).length > 0) {
      const schema: Record<string, string> = {};
      headers.forEach((h) => {
        schema[h] = descriptions[h] || `Field: ${h}`;
      });
      template.push({ _schema: schema });
    }

    // Add sample data objects
    if (includeSamples) {
      for (let i = 0; i < sampleCount; i++) {
        const sample: Record<string, string> = {};
        headers.forEach((h) => {
          sample[h] = `Sample ${h} ${i + 1}`;
        });
        template.push(sample);
      }
    }

    const json = JSON.stringify(template, null, 2);
    const buffer = Buffer.from(json, "utf-8");

    return {
      buffer,
      filename: `template_${Date.now()}.json`,
      mimeType: "application/json",
      size: buffer.length,
    };
  }

  async validate(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
    try {
      const jsonString = buffer.toString("utf-8");
      const parsed = JSON.parse(jsonString);

      // Must be array or object
      if (typeof parsed !== "object" || parsed === null) {
        return { valid: false, error: "JSON must be an object or array" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid JSON file",
      };
    }
  }
}

export const jsonHandler = new JsonFormatHandler();
