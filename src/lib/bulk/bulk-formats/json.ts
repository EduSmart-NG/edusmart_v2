/**
 * JSON Format Handler
 *
 * FIXED: Template now generates proper data types for numeric and boolean fields
 *
 * Handles parsing and generating JSON files for bulk question operations.
 */

import type {
  FormatHandler,
  ParseResult,
  ParseOptions,
  ExportResult,
  ExportOptions,
  TemplateOptions,
} from "@/types/bulk-import";

class JsonFormatHandler implements FormatHandler {
  async parse(
    buffer: Buffer,
    options: ParseOptions = {}
  ): Promise<ParseResult> {
    const { skipEmptyRows = true, maxRows } = options;

    try {
      const jsonString = buffer.toString("utf-8");
      let parsed = JSON.parse(jsonString);

      // Handle both array and single object
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      // Filter out schema object if present
      const data = parsed.filter((item: unknown) => {
        if (typeof item === "object" && item !== null) {
          return !("_schema" in item);
        }
        return true;
      });

      // Apply row limit if specified
      const limitedData = maxRows ? data.slice(0, maxRows) : data;

      // Skip empty rows if enabled
      const filteredData = skipEmptyRows
        ? limitedData.filter((row: unknown) => {
            if (typeof row !== "object" || row === null) return false;
            return Object.values(row).some((v) => v !== null && v !== "");
          })
        : limitedData;

      // Extract headers from first data row
      const headers =
        filteredData.length > 0 ? Object.keys(filteredData[0]) : [];

      return {
        data: filteredData,
        headers,
        rowCount: filteredData.length,
        errors: [],
      };
    } catch (error) {
      return {
        data: [],
        headers: [],
        rowCount: 0,
        errors: [
          {
            row: 0,
            message: `Failed to parse JSON: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  async export(
    data: Record<string, unknown>[],
    headers: string[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const { prettyPrint = true } = options;

      // Filter data to only include specified headers
      const filteredData = data.map((row) => {
        const filteredRow: Record<string, unknown> = {};
        headers.forEach((h) => {
          if (h in row) {
            filteredRow[h] = row[h];
          }
        });
        return filteredRow;
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

    // ✅ FIXED: Add sample data with proper types
    if (includeSamples) {
      // Define realistic sample data instead of generic strings
      const sampleQuestions = [
        {
          exam_type: "UTME",
          year: 2025,
          subject: "Mathematics",
          question_type: "multiple_choice",
          difficulty_level: "medium",
          language: "en",
          question_text: "What is the value of x in the equation 2x + 5 = 15?",
          question_point: 2,
          answer_explanation:
            "Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5.",
          tags: "algebra, linear equations",
          time_limit: 60,
          option_1_text: "3",
          option_1_is_correct: false,
          option_2_text: "5",
          option_2_is_correct: true,
          option_3_text: "7",
          option_3_is_correct: false,
          option_4_text: "10",
          option_4_is_correct: false,
        },
        {
          exam_type: "WAEC",
          year: 2025,
          subject: "English Language",
          question_type: "true_false",
          difficulty_level: "easy",
          language: "en",
          question_text:
            "The sentence 'She runs daily' is in the present tense.",
          question_point: 1,
          answer_explanation: "The verb 'runs' indicates the present tense.",
          tags: "grammar, tenses",
          time_limit: 30,
          option_1_text: "True",
          option_1_is_correct: true,
          option_2_text: "False",
          option_2_is_correct: false,
        },
        {
          exam_type: "NECO",
          year: 2025,
          subject: "Physics",
          question_type: "multiple_choice",
          difficulty_level: "hard",
          language: "en",
          question_text: "What is the unit of electric field strength?",
          question_point: 3,
          answer_explanation:
            "Electric field strength is force per unit charge, measured in Newtons per Coulomb (N/C).",
          tags: "electricity, physics",
          time_limit: 90,
          option_1_text: "Ampere",
          option_1_is_correct: false,
          option_2_text: "Volt",
          option_2_is_correct: false,
          option_3_text: "Newton per Coulomb",
          option_3_is_correct: true,
          option_4_text: "Watt",
          option_4_is_correct: false,
        },
      ];

      for (let i = 0; i < Math.min(sampleCount, sampleQuestions.length); i++) {
        template.push(sampleQuestions[i]);
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
