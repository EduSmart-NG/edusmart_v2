/**
 * Encryption Utility for Question Data
 *
 * Provides AES-256-GCM encryption for sensitive question content.
 * Uses Node.js crypto module for cryptographic operations.
 *
 * Security features:
 * - AES-256-GCM (Galois/Counter Mode) for authenticated encryption
 * - Random 12-byte IV (Initialization Vector) for each encryption
 * - 16-byte authentication tag for data integrity verification
 * - PBKDF2 key derivation with salt for enhanced security
 * - Constant-time comparison for tag verification
 *
 * What gets encrypted:
 * - Question text
 * - Option text
 * - Answer explanation
 *
 * What stays unencrypted (for querying):
 * - Exam type, year, subject
 * - Question type, difficulty level
 * - Points, time limit
 * - Tags, language
 * - Image paths
 * - Metadata (created_by, timestamps)
 *
 * @module lib/utils/encryption
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from "crypto";

// ============================================
// CONSTANTS
// ============================================

/**
 * Encryption algorithm: AES-256-GCM
 * - AES: Advanced Encryption Standard
 * - 256: Key size in bits
 * - GCM: Galois/Counter Mode (provides authentication)
 */
const ALGORITHM = "aes-256-gcm" as const;

/**
 * IV length for AES-256-GCM
 * NIST recommends 96 bits (12 bytes) for GCM
 * https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf
 */
const IV_LENGTH = 12;

/**
 * Authentication tag length (16 bytes for GCM)
 * This ensures data integrity and authenticity
 */
const AUTH_TAG_LENGTH = 16;

/**
 * Salt length for PBKDF2 key derivation
 * 32 bytes (256 bits) provides strong randomness
 */
const SALT_LENGTH = 32;

/**
 * PBKDF2 parameters for key derivation
 * Higher iterations = more secure but slower
 * Balanced for server-side operations
 */
const PBKDF2_ITERATIONS = 100000; // OWASP recommendation for 2023+
const KEY_LENGTH = 32; // 256 bits for AES-256

// ============================================
// TYPES
// ============================================

/**
 * Encrypted data structure
 * Contains all components needed for decryption
 */
export interface EncryptedData {
  /**
   * Base64-encoded ciphertext
   */
  ciphertext: string;

  /**
   * Base64-encoded IV (Initialization Vector)
   * Must be unique for each encryption with the same key
   */
  iv: string;

  /**
   * Base64-encoded authentication tag
   * Used to verify data integrity during decryption
   */
  tag: string;

  /**
   * Base64-encoded salt used for key derivation
   * Allows key regeneration during decryption
   */
  salt: string;
}

/**
 * Encryption result for batch operations
 */
export interface EncryptionResult {
  success: boolean;
  encrypted?: EncryptedData;
  error?: string;
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  success: boolean;
  decrypted?: string;
  error?: string;
}

// ============================================
// KEY MANAGEMENT
// ============================================

/**
 * Get master encryption key from environment
 * This should be a 256-bit (32-byte) random key stored securely
 *
 * @returns Master encryption key
 * @throws Error if ENCRYPTION_KEY is not set
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Generate one using: openssl rand -base64 32"
    );
  }

  // Validate key length (should be base64-encoded 32-byte key = 44 chars)
  if (key.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY is too short. Must be at least 32 bytes (base64-encoded 44 chars). " +
        "Generate one using: openssl rand -base64 32"
    );
  }

  return key;
}

/**
 * Derive encryption key from master key using PBKDF2
 * This adds an extra layer of security and allows unique keys per encryption
 *
 * @param masterKey - Master key from environment
 * @param salt - Random salt for key derivation
 * @returns Derived 256-bit encryption key
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
}

// ============================================
// CORE ENCRYPTION FUNCTIONS
// ============================================

/**
 * Encrypt text using AES-256-GCM
 *
 * Process:
 * 1. Generate random salt for key derivation
 * 2. Derive unique encryption key from master key + salt
 * 3. Generate random IV (Initialization Vector)
 * 4. Create cipher with AES-256-GCM algorithm
 * 5. Encrypt plaintext
 * 6. Get authentication tag
 * 7. Return ciphertext, IV, tag, and salt (all base64-encoded)
 *
 * @param plaintext - Text to encrypt
 * @returns Encrypted data with IV, tag, and salt
 * @throws Error if encryption fails
 *
 * @example
 * ```typescript
 * const encrypted = encrypt("What is 2 + 2?");
 * // Store encrypted.ciphertext, encrypted.iv, encrypted.tag, encrypted.salt in database
 * ```
 */
export function encrypt(plaintext: string): EncryptedData {
  try {
    // Validate input
    if (!plaintext || typeof plaintext !== "string") {
      throw new Error("Plaintext must be a non-empty string");
    }

    // Get master key from environment
    const masterKey = getMasterKey();

    // Generate random salt for key derivation
    const salt = randomBytes(SALT_LENGTH);

    // Derive unique encryption key
    const key = deriveKey(masterKey, salt);

    // Generate random IV
    // CRITICAL: IV must be unique for each encryption with the same key
    // With 96 bits, we have 2^96 possible IVs
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    // Using Buffer for better performance and memory handling
    let ciphertext = cipher.update(plaintext, "utf8");
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);

    // Get authentication tag
    // This ensures data integrity - any tampering will be detected during decryption
    const tag = cipher.getAuthTag();

    // Return all components as base64-encoded strings
    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      salt: salt.toString("base64"),
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * Process:
 * 1. Decode base64-encoded components
 * 2. Derive encryption key from master key + salt
 * 3. Create decipher with AES-256-GCM algorithm
 * 4. Set authentication tag
 * 5. Decrypt ciphertext
 * 6. Verify authentication tag (automatic in GCM mode)
 * 7. Return decrypted plaintext
 *
 * @param encrypted - Encrypted data object
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or authentication tag is invalid
 *
 * @example
 * ```typescript
 * const decrypted = decrypt({
 *   ciphertext: "...",
 *   iv: "...",
 *   tag: "...",
 *   salt: "..."
 * });
 * console.log(decrypted); // "What is 2 + 2?"
 * ```
 */
export function decrypt(encrypted: EncryptedData): string {
  try {
    // Validate input
    if (!encrypted || typeof encrypted !== "object") {
      throw new Error("Encrypted data must be an object");
    }

    if (
      !encrypted.ciphertext ||
      !encrypted.iv ||
      !encrypted.tag ||
      !encrypted.salt
    ) {
      throw new Error(
        "Encrypted data is missing required fields (ciphertext, iv, tag, salt)"
      );
    }

    // Get master key from environment
    const masterKey = getMasterKey();

    // Decode base64-encoded components
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
    const iv = Buffer.from(encrypted.iv, "base64");
    const tag = Buffer.from(encrypted.tag, "base64");
    const salt = Buffer.from(encrypted.salt, "base64");

    // Validate component lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(
        `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`
      );
    }

    if (tag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Invalid tag length: expected ${AUTH_TAG_LENGTH}, got ${tag.length}`
      );
    }

    if (salt.length !== SALT_LENGTH) {
      throw new Error(
        `Invalid salt length: expected ${SALT_LENGTH}, got ${salt.length}`
      );
    }

    // Derive encryption key using the same salt
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);

    // Set authentication tag
    // CRITICAL: Must be called before decipher.update() or decipher.final()
    decipher.setAuthTag(tag);

    // Decrypt data
    // If the authentication tag is invalid, decipher.final() will throw an error
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Return decrypted plaintext as UTF-8 string
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption error:", error);

    // Provide more specific error messages for common issues
    if (error instanceof Error) {
      if (
        error.message.includes(
          "Unsupported state or unable to authenticate data"
        )
      ) {
        throw new Error(
          "Decryption failed: Invalid authentication tag. Data may be corrupted or tampered with."
        );
      }
    }

    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Encrypt multiple texts in batch
 * Useful for encrypting question options
 *
 * @param plaintexts - Array of texts to encrypt
 * @returns Array of encrypted data
 *
 * @example
 * ```typescript
 * const options = ["Option A", "Option B", "Option C", "Option D"];
 * const encryptedOptions = encryptBatch(options);
 * ```
 */
export function encryptBatch(plaintexts: string[]): EncryptedData[] {
  return plaintexts.map((text) => encrypt(text));
}

/**
 * Decrypt multiple ciphertexts in batch
 * Useful for decrypting question options
 *
 * @param encryptedDataArray - Array of encrypted data
 * @returns Array of decrypted texts
 *
 * @example
 * ```typescript
 * const decryptedOptions = decryptBatch(encryptedOptions);
 * ```
 */
export function decryptBatch(encryptedDataArray: EncryptedData[]): string[] {
  return encryptedDataArray.map((encrypted) => decrypt(encrypted));
}

// ============================================
// SAFE OPERATIONS (Error Handling)
// ============================================

/**
 * Safe encrypt with error handling
 * Returns result object instead of throwing errors
 *
 * @param plaintext - Text to encrypt
 * @returns Encryption result with success status
 *
 * @example
 * ```typescript
 * const result = safeEncrypt("What is 2 + 2?");
 * if (result.success) {
 *   console.log("Encrypted:", result.encrypted);
 * } else {
 *   console.error("Encryption failed:", result.error);
 * }
 * ```
 */
export function safeEncrypt(plaintext: string): EncryptionResult {
  try {
    const encrypted = encrypt(plaintext);
    return {
      success: true,
      encrypted,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown encryption error",
    };
  }
}

/**
 * Safe decrypt with error handling
 * Returns result object instead of throwing errors
 *
 * @param encrypted - Encrypted data object
 * @returns Decryption result with success status
 *
 * @example
 * ```typescript
 * const result = safeDecrypt(encryptedData);
 * if (result.success) {
 *   console.log("Decrypted:", result.decrypted);
 * } else {
 *   console.error("Decryption failed:", result.error);
 * }
 * ```
 */
export function safeDecrypt(encrypted: EncryptedData): DecryptionResult {
  try {
    const decrypted = decrypt(encrypted);
    return {
      success: true,
      decrypted,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown decryption error",
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a new encryption key (for initial setup)
 * This should only be run once and the key stored securely in environment variables
 *
 * @returns Base64-encoded 256-bit random key
 *
 * @example
 * ```typescript
 * const newKey = generateEncryptionKey();
 * console.log("Add this to your .env file:");
 * console.log(`ENCRYPTION_KEY=${newKey}`);
 * ```
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64");
}

/**
 * Check if encryption is properly configured
 * Validates that the ENCRYPTION_KEY environment variable is set and valid
 *
 * @returns True if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get encryption configuration status
 * Useful for health checks and diagnostics
 *
 * @returns Configuration status object
 */
export function getEncryptionStatus(): {
  configured: boolean;
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
} {
  return {
    configured: isEncryptionConfigured(),
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH * 8, // Convert bytes to bits
    ivLength: IV_LENGTH * 8,
    tagLength: AUTH_TAG_LENGTH * 8,
  };
}
