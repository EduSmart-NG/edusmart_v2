/**
 * File Upload Utilities
 *
 * Handles secure file upload, validation, and storage for question images.
 *
 * Security features:
 * - File size validation (5MB limit)
 * - MIME type validation (JPEG, PNG, WebP only)
 * - Filename sanitization (prevent path traversal)
 * - Unique filename generation (prevent overwrites)
 * - Magic byte validation (verify actual file type)
 *
 * @module lib/utils/file-upload
 */

import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

// ============================================
// CONFIGURATION
// ============================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const UPLOAD_BASE_DIR = join(process.cwd(), "public", "uploads", "questions");

// Magic bytes for file type validation
const FILE_SIGNATURES = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46], // RIFF
  ],
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileSaveResult {
  success: boolean;
  filePath?: string; // Relative path for database storage
  publicUrl?: string; // Public URL for frontend
  error?: string;
}

// ============================================
// FILE VALIDATION
// ============================================

/**
 * Validate uploaded image file
 *
 * Checks:
 * - File size (max 5MB)
 * - MIME type (JPEG, PNG, WebP)
 * - Magic bytes (actual file type)
 *
 * @param file - Uploaded file to validate
 * @returns Validation result
 */
export async function validateImageFile(
  file: File
): Promise<FileValidationResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Only JPEG, PNG, and WebP are allowed.`,
    };
  }

  // Validate magic bytes (verify actual file type)
  try {
    const bytes = await file.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);
    const isValidType = await verifyFileSignature(uint8Array, file.type);

    if (!isValidType) {
      return {
        valid: false,
        error:
          "File type mismatch. The file extension doesn't match its content.",
      };
    }
  } catch (_error) {
    return {
      valid: false,
      error: "Failed to validate file content",
    };
  }

  return { valid: true };
}

/**
 * Verify file signature (magic bytes)
 *
 * Prevents file type spoofing by checking actual file content
 *
 * @param bytes - File bytes
 * @param mimeType - Declared MIME type
 * @returns Whether signature matches MIME type
 */
async function verifyFileSignature(
  bytes: Uint8Array,
  mimeType: string
): Promise<boolean> {
  const signatures = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES];

  if (!signatures) {
    return false;
  }

  // Check if file starts with any of the valid signatures
  return signatures.some((signature) => {
    if (bytes.length < signature.length) {
      return false;
    }

    return signature.every((byte, index) => bytes[index] === byte);
  });
}

// ============================================
// FILENAME HANDLING
// ============================================

/**
 * Sanitize filename to prevent path traversal attacks
 *
 * Removes:
 * - Path separators (/, \)
 * - Special characters
 * - Leading/trailing dots
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/^\.+/, "") // Remove leading dots
    .replace(/\.+$/, "") // Remove trailing dots
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace special chars with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .toLowerCase()
    .slice(0, 100); // Limit length
}

/**
 * Generate unique filename with CUID prefix
 *
 * Format: {cuid}_{sanitized-original}.{ext}
 *
 * @param originalName - Original filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = sanitized.split(".").pop() || "jpg";
  const nameWithoutExt = sanitized.replace(`.${ext}`, "");

  // Generate CUID-like ID (shorter than full CUID)
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(4).toString("hex");
  const uniqueId = `${timestamp}${randomStr}`;

  return `${uniqueId}_${nameWithoutExt}.${ext}`;
}

// ============================================
// FILE OPERATIONS
// ============================================

/**
 * Ensure directory exists, create if not
 *
 * @param dirPath - Directory path to create
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (_error) {
    throw new Error(`Failed to create directory: ${dirPath}`);
  }
}

/**
 * Save uploaded file to disk
 *
 * Process:
 * 1. Validate file
 * 2. Generate unique filename
 * 3. Create directory structure (year/subject)
 * 4. Write file to disk
 * 5. Return paths
 *
 * @param file - File to save
 * @param examType - Exam type (WAEC, JAMB, etc.)
 * @param year - Exam year
 * @param subject - Subject name
 * @returns Save result with paths
 */
export async function saveUploadedFile(
  file: File,
  examType: string,
  year: number,
  subject: string
): Promise<FileSaveResult> {
  try {
    // Validate file
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name);

    // Create directory structure: /uploads/questions/{year}/{subject}/
    const subjectSanitized = sanitizeFilename(subject);
    const uploadDir = join(UPLOAD_BASE_DIR, year.toString(), subjectSanitized);

    await ensureDirectoryExists(uploadDir);

    // Full file path on disk
    const filePath = join(uploadDir, uniqueFilename);

    // Convert File to Buffer and write
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate paths for return
    const relativePath = join(
      "uploads",
      "questions",
      year.toString(),
      subjectSanitized,
      uniqueFilename
    );

    const publicUrl = `/${relativePath.replace(/\\/g, "/")}`;

    return {
      success: true,
      filePath: relativePath.replace(/\\/g, "/"), // Store with forward slashes
      publicUrl,
    };
  } catch (error) {
    console.error("File save error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save file",
    };
  }
}

/**
 * Delete file from disk
 *
 * Used for cleanup on error or when replacing files
 *
 * @param relativePath - Relative path to file (as stored in database)
 */
export async function deleteFile(relativePath: string): Promise<void> {
  try {
    const fullPath = join(process.cwd(), "public", relativePath);
    await unlink(fullPath);
  } catch (error) {
    // Silently fail - file might not exist
    console.warn("Failed to delete file:", relativePath, error);
  }
}

/**
 * Delete multiple files (for cleanup)
 *
 * @param relativePaths - Array of relative paths to delete
 */
export async function deleteFiles(relativePaths: string[]): Promise<void> {
  await Promise.all(relativePaths.map((path) => deleteFile(path)));
}

// ============================================
// EXPORTS
// ============================================

export { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, UPLOAD_BASE_DIR };
