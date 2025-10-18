/**
 * Bulk Import/Export Format Types
 *
 * Shared types for all format handlers (Excel, CSV, JSON)
 */

export type BulkFormat = "excel" | "csv" | "json";

export interface ParseOptions {
  /**
   * Whether first row contains headers
   * @default true
   */
  hasHeaders?: boolean;

  /**
   * Maximum rows to parse (for validation preview)
   */
  maxRows?: number;

  /**
   * Skip empty rows
   * @default true
   */
  skipEmptyRows?: boolean;
}

export interface ParseResult<T = Record<string, unknown>> {
  data: T[];
  headers: string[];
  rowCount: number;
  errors: ParseError[];
}

export interface ParseError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface ExportOptions {
  /**
   * Include headers in output
   * @default true
   */
  includeHeaders?: boolean;

  /**
   * Format-specific styling (Excel only)
   */
  styled?: boolean;

  /**
   * Pretty print JSON
   * @default true
   */
  prettyPrint?: boolean;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface TemplateOptions {
  /**
   * Include sample data rows
   * @default true
   */
  includeSamples?: boolean;

  /**
   * Number of sample rows
   * @default 3
   */
  sampleCount?: number;

  /**
   * Column descriptions
   */
  descriptions?: Record<string, string>;
}

/**
 * Generic format handler interface
 */
export interface FormatHandler<T = Record<string, unknown>> {
  /**
   * Parse file buffer to data array
   */
  parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult<T>>;

  /**
   * Export data array to file buffer
   */
  export(
    data: T[],
    headers: string[],
    options?: ExportOptions
  ): Promise<ExportResult>;

  /**
   * Generate template file
   */
  generateTemplate(
    headers: string[],
    options?: TemplateOptions
  ): Promise<ExportResult>;

  /**
   * Validate file format
   */
  validate(buffer: Buffer): Promise<{ valid: boolean; error?: string }>;
}
