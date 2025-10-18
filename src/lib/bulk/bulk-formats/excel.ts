/**
 * Excel Format Handler (ExcelJS)
 *
 * Handles .xlsx file parsing and generation
 */

import ExcelJS from "exceljs";
import type {
  FormatHandler,
  ParseOptions,
  ParseResult,
  ExportOptions,
  ExportResult,
  TemplateOptions,
  ParseError,
} from "@/types/bulk-import";

export class ExcelFormatHandler<T = Record<string, unknown>>
  implements FormatHandler<T>
{
  async parse(
    buffer: Buffer,
    options: ParseOptions = {}
  ): Promise<ParseResult<T>> {
    const { hasHeaders = true, maxRows, skipEmptyRows = true } = options;

    const errors: ParseError[] = [];
    const data: T[] = [];
    let headers: string[] = [];

    try {
      const workbook = new ExcelJS.Workbook();
      // Convert Node.js Buffer to ArrayBuffer for ExcelJS
      const arrayBuffer = new Uint8Array(buffer).buffer;
      await workbook.xlsx.load(arrayBuffer);

      // Get first worksheet
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("No worksheet found in Excel file");
      }

      const headerRow = 1;
      let dataStartRow = 1;

      if (hasHeaders) {
        const firstRow = worksheet.getRow(1);
        headers = firstRow.values as string[];
        // Remove first empty element (Excel rows are 1-indexed)
        headers = headers.slice(1).map((h) => String(h || "").trim());
        dataStartRow = 2;
      } else {
        // Generate column headers (A, B, C...)
        const firstRow = worksheet.getRow(1);
        const colCount = firstRow.cellCount;
        headers = Array.from({ length: colCount }, (_, i) =>
          String.fromCharCode(65 + i)
        );
      }

      // Parse data rows
      let rowsParsed = 0;
      worksheet.eachRow((row, rowNumber) => {
        // Skip header row
        if (hasHeaders && rowNumber === headerRow) return;
        if (rowNumber < dataStartRow) return;

        // Check max rows limit
        if (maxRows && rowsParsed >= maxRows) return;

        // Get row values (skip first empty element)
        const values = (row.values as unknown[]).slice(1);

        // Skip empty rows if configured
        if (skipEmptyRows && values.every((v) => v == null || v === "")) {
          return;
        }

        // Map values to object using headers
        const rowData: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          const cellValue = values[index];

          // Handle dates
          if (cellValue instanceof Date) {
            rowData[header] = cellValue.toISOString();
          } else {
            rowData[header] = cellValue;
          }
        });

        data.push(rowData as T);
        rowsParsed++;
      });

      return {
        data,
        headers,
        rowCount: data.length,
        errors,
      };
    } catch (error) {
      errors.push({
        row: 0,
        message: `Failed to parse Excel file: ${
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
    const { includeHeaders = true, styled = true } = options;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Add headers
    if (includeHeaders) {
      const headerRow = worksheet.addRow(headers);

      if (styled) {
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
      }
    }

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = (row as Record<string, unknown>)[header];

        // Handle dates
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }

        return value ?? "";
      });
      worksheet.addRow(values);
    });

    // Apply styling
    if (styled) {
      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 10;
        if (column.eachCell) {
          column.eachCell({ includeEmpty: false }, (cell) => {
            const cellValue = cell.value?.toString() || "";
            maxLength = Math.max(maxLength, cellValue.length);
          });
        }
        column.width = Math.min(maxLength + 2, 50);
      });

      // Freeze header row
      if (includeHeaders) {
        worksheet.views = [{ state: "frozen", ySplit: 1 }];
      }

      // Add filters
      if (includeHeaders && data.length > 0) {
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: headers.length },
        };
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filename: `export_${Date.now()}.xlsx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: buffer.byteLength,
    };
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    // Add description row (if any descriptions provided)
    if (Object.keys(descriptions).length > 0) {
      const descRow = worksheet.addRow(
        headers.map((h) => descriptions[h] || "")
      );
      descRow.font = { italic: true, color: { argb: "FF808080" } };
      descRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
    }

    // Add header row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add sample data rows
    if (includeSamples) {
      for (let i = 0; i < sampleCount; i++) {
        const sampleRow = headers.map((h) => `Sample ${h} ${i + 1}`);
        worksheet.addRow(sampleRow);
      }
    }

    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      const header = headers[index];
      column.width = Math.max(header?.length || 10, 15) + 2;
    });

    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: descriptions ? 2 : 1 }];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filename: `template_${Date.now()}.xlsx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: buffer.byteLength,
    };
  }

  async validate(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
    try {
      const workbook = new ExcelJS.Workbook();
      // Convert Node.js Buffer to ArrayBuffer for ExcelJS
      const arrayBuffer = new Uint8Array(buffer).buffer;
      await workbook.xlsx.load(arrayBuffer);

      if (!workbook.worksheets[0]) {
        return { valid: false, error: "No worksheet found" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid Excel file",
      };
    }
  }
}

export const excelHandler = new ExcelFormatHandler();
