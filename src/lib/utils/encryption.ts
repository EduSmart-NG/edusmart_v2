/**
 * Encryption Utility Module
 *
 * Provides secure encryption/decryption utilities for sensitive data
 * using AES-256-GCM with PBKDF2 key derivation.
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 key derivation with configurable iterations
 * - Random IV and salt per encryption
 * - Version-prefixed format for future compatibility
 * - SHA-256 hashing for indexing
 * - TypeScript type safety
 *
 * @module lib/utils/encryption
 */

import crypto from "crypto";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Encryption algorithm configuration
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  authTagLength: number;
  saltLength: number;
  iterations: number;
  hashAlgorithm: string;
}

/**
 * Encryption result with metadata
 */
export interface EncryptionResult {
  encrypted: string;
  version: string;
  algorithm: string;
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  decrypted: string;
  version: string;
}

/**
 * Encryption options
 */
export interface EncryptionOptions {
  version?: string;
  iterations?: number;
}

/**
 * Bulk encryption result for objects
 */
export interface BulkEncryptionResult<T> {
  encrypted: T;
  metadata: {
    encryptedFields: string[];
    version: string;
    timestamp: Date;
  };
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * Default encryption configuration
 * Uses industry-standard secure parameters
 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: "aes-256-gcm",
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits (GCM standard)
  authTagLength: 16, // 128 bits
  saltLength: 16, // 128 bits
  iterations: 100000, // PBKDF2 iterations (OWASP recommended minimum)
  hashAlgorithm: "sha256",
};

/**
 * Current encryption version
 * Increment when changing encryption algorithm or parameters
 */
export const CURRENT_ENCRYPTION_VERSION = "v1";

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates encryption key strength
 */
export function validateEncryptionKey(key: string): {
  valid: boolean;
  error?: string;
} {
  if (!key) {
    return { valid: false, error: "Encryption key is required" };
  }

  if (key.length < 32) {
    return {
      valid: false,
      error: "Encryption key must be at least 32 characters long",
    };
  }

  // Check for sufficient entropy (basic check)
  const uniqueChars = new Set(key).size;
  if (uniqueChars < 10) {
    return {
      valid: false,
      error: "Encryption key has insufficient entropy (too repetitive)",
    };
  }

  return { valid: true };
}

/**
 * Validates encrypted data format
 */
export function isValidEncryptedFormat(data: string): boolean {
  if (!data || typeof data !== "string") {
    return false;
  }

  // Check for version prefix
  if (!data.includes(":")) {
    return false;
  }

  const [version, payload] = data.split(":");

  // Validate version format
  if (!version.match(/^v\d+$/)) {
    return false;
  }

  // Validate base64 payload
  try {
    const decoded = Buffer.from(payload, "base64");
    // Minimum length: salt + iv + authTag = 48 bytes
    return decoded.length >= 48;
  } catch {
    return false;
  }
}

// ============================================
// CORE ENCRYPTION FUNCTIONS
// ============================================

/**
 * Derives encryption key from master key and salt using PBKDF2
 *
 * @param masterKey - Master encryption key
 * @param salt - Random salt buffer
 * @param config - Encryption configuration
 * @returns Derived key buffer
 */
export function deriveKey(
  masterKey: string,
  salt: Buffer,
  config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG
): Buffer {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    config.iterations,
    config.keyLength,
    config.hashAlgorithm
  );
}

/**
 * Encrypts data using AES-256-GCM
 *
 * @param plaintext - Data to encrypt
 * @param masterKey - Master encryption key (min 32 chars)
 * @param options - Optional encryption parameters
 * @returns Encrypted data string with version prefix
 *
 * @example
 * ```typescript
 * const encrypted = encryptData("sensitive data", process.env.ENCRYPTION_KEY);
 * // Returns: "v1:base64EncodedData..."
 * ```
 */
export function encryptData(
  plaintext: string,
  masterKey: string,
  options: EncryptionOptions = {}
): string {
  // Validate key
  const keyValidation = validateEncryptionKey(masterKey);
  if (!keyValidation.valid) {
    throw new Error(`Invalid encryption key: ${keyValidation.error}`);
  }

  // Validate input
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Plaintext must be a non-empty string");
  }

  const config = {
    ...DEFAULT_ENCRYPTION_CONFIG,
    ...(options.iterations && { iterations: options.iterations }),
  };
  const version = options.version || CURRENT_ENCRYPTION_VERSION;

  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(config.saltLength);
    const iv = crypto.randomBytes(config.ivLength);

    // Derive encryption key
    const key = deriveKey(masterKey, salt, config);

    // Create cipher - TypeScript will infer CipherGCM for 'aes-256-gcm'
    const cipher = crypto.createCipheriv(
      config.algorithm,
      key,
      iv
    ) as crypto.CipherGCM;

    // Encrypt data
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get authentication tag for integrity verification
    // Now TypeScript knows cipher is CipherGCM which has getAuthTag()
    const authTag = cipher.getAuthTag();

    // Combine components: salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "base64"),
    ]);

    // Return versioned format
    return `${version}:${combined.toString("base64")}`;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Encryption failed: ${errorMessage}`);
  }
}

/**
 * Decrypts encrypted data
 *
 * @param encryptedData - Encrypted data string with version prefix
 * @param masterKey - Master encryption key used for encryption
 * @param config - Encryption configuration (must match encryption config)
 * @returns Decrypted plaintext string
 *
 * @example
 * ```typescript
 * const decrypted = decryptData(encrypted, process.env.ENCRYPTION_KEY);
 * ```
 */
export function decryptData(
  encryptedData: string,
  masterKey: string,
  config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG
): string {
  // Validate key
  const keyValidation = validateEncryptionKey(masterKey);
  if (!keyValidation.valid) {
    throw new Error(`Invalid encryption key: ${keyValidation.error}`);
  }

  // Validate encrypted data format
  if (!isValidEncryptedFormat(encryptedData)) {
    throw new Error("Invalid encrypted data format");
  }

  try {
    // Parse version and payload
    const [version, payload] = encryptedData.split(":");

    // Version-specific decryption (future-proof for key rotation)
    if (version !== "v1") {
      throw new Error(`Unsupported encryption version: ${version}`);
    }

    // Decode base64 payload
    const combined = Buffer.from(payload, "base64");

    // Extract components
    const salt = combined.subarray(0, config.saltLength);
    const iv = combined.subarray(
      config.saltLength,
      config.saltLength + config.ivLength
    );
    const authTag = combined.subarray(
      config.saltLength + config.ivLength,
      config.saltLength + config.ivLength + config.authTagLength
    );
    const encrypted = combined.subarray(
      config.saltLength + config.ivLength + config.authTagLength
    );

    // Derive decryption key
    const key = deriveKey(masterKey, salt, config);

    // Create decipher - TypeScript will infer DecipherGCM for 'aes-256-gcm'
    const decipher = crypto.createDecipheriv(
      config.algorithm,
      key,
      iv
    ) as crypto.DecipherGCM;

    // Set auth tag - now TypeScript knows decipher is DecipherGCM which has setAuthTag()
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(
      encrypted.toString("base64"),
      "base64",
      "utf8"
    );
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Provide specific error messages
    if (errorMessage.includes("Unsupported state or unable to authenticate")) {
      throw new Error(
        "Decryption failed: Invalid key or corrupted data (authentication failed)"
      );
    }

    throw new Error(`Decryption failed: ${errorMessage}`);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Creates a one-way hash of data for indexing/searching
 * Use this when you need to search encrypted data without decrypting
 *
 * @param data - Data to hash
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns Hex-encoded hash
 *
 * @example
 * ```typescript
 * const hash = hashForIndex("user@example.com");
 * // Store hash for duplicate detection without storing plaintext
 * ```
 */
export function hashForIndex(
  data: string,
  algorithm: string = "sha256"
): string {
  if (!data || typeof data !== "string") {
    throw new Error("Data must be a non-empty string");
  }

  return crypto.createHash(algorithm).update(data).digest("hex");
}

/**
 * Generates a cryptographically secure random key
 * Use this to generate encryption keys
 *
 * @param length - Key length in bytes (default: 32 for AES-256)
 * @returns Base64-encoded random key
 *
 * @example
 * ```typescript
 * const encryptionKey = generateSecureKey(32);
 * // Store in secure key management system
 * ```
 */
export function generateSecureKey(length: number = 32): string {
  if (length < 16) {
    throw new Error("Key length must be at least 16 bytes");
  }

  return crypto.randomBytes(length).toString("base64");
}

/**
 * Compares a plaintext value with a hash (constant-time)
 * Prevents timing attacks
 *
 * @param plaintext - Plaintext to compare
 * @param hash - Hash to compare against
 * @returns True if matches
 */
export function compareHash(plaintext: string, hash: string): boolean {
  const plaintextHash = hashForIndex(plaintext);
  return crypto.timingSafeEqual(Buffer.from(plaintextHash), Buffer.from(hash));
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Encrypts multiple fields in an object
 *
 * @param obj - Object containing fields to encrypt
 * @param fields - Array of field names to encrypt
 * @param masterKey - Master encryption key
 * @returns Object with encrypted fields
 *
 * @example
 * ```typescript
 * const user = { email: "user@example.com", ssn: "123-45-6789" };
 * const encrypted = encryptFields(user, ["email", "ssn"], key);
 * ```
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  masterKey: string
): BulkEncryptionResult<T> {
  const result = { ...obj };
  const encryptedFields: string[] = [];

  for (const field of fields) {
    const value = obj[field];

    if (value !== null && value !== undefined) {
      if (typeof value !== "string") {
        throw new Error(
          `Field "${String(field)}" must be a string for encryption`
        );
      }

      result[field] = encryptData(value, masterKey) as T[keyof T];
      encryptedFields.push(String(field));
    }
  }

  return {
    encrypted: result,
    metadata: {
      encryptedFields,
      version: CURRENT_ENCRYPTION_VERSION,
      timestamp: new Date(),
    },
  };
}

/**
 * Decrypts multiple fields in an object
 *
 * @param obj - Object containing encrypted fields
 * @param fields - Array of field names to decrypt
 * @param masterKey - Master encryption key
 * @returns Object with decrypted fields
 *
 * @example
 * ```typescript
 * const decrypted = decryptFields(encrypted, ["email", "ssn"], key);
 * ```
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  masterKey: string
): T {
  const result = { ...obj };

  for (const field of fields) {
    const value = obj[field];

    if (value !== null && value !== undefined) {
      if (typeof value !== "string") {
        throw new Error(
          `Field "${String(field)}" must be a string for decryption`
        );
      }

      result[field] = decryptData(value, masterKey) as T[keyof T];
    }
  }

  return result;
}

/**
 * Encrypts an array of objects
 *
 * @param items - Array of objects to encrypt
 * @param fields - Fields to encrypt in each object
 * @param masterKey - Master encryption key
 * @returns Array of encrypted objects
 */
export function encryptArray<T extends Record<string, unknown>>(
  items: T[],
  fields: (keyof T)[],
  masterKey: string
): T[] {
  return items.map((item) => encryptFields(item, fields, masterKey).encrypted);
}

/**
 * Decrypts an array of objects
 *
 * @param items - Array of encrypted objects
 * @param fields - Fields to decrypt in each object
 * @param masterKey - Master encryption key
 * @returns Array of decrypted objects
 */
export function decryptArray<T extends Record<string, unknown>>(
  items: T[],
  fields: (keyof T)[],
  masterKey: string
): T[] {
  return items.map((item) => decryptFields(item, fields, masterKey));
}

// ============================================
// KEY ROTATION UTILITIES
// ============================================

/**
 * Re-encrypts data with a new key (for key rotation)
 *
 * @param encryptedData - Data encrypted with old key
 * @param oldKey - Old encryption key
 * @param newKey - New encryption key
 * @returns Data encrypted with new key
 *
 * @example
 * ```typescript
 * const reEncrypted = rotateEncryptionKey(
 *   oldEncrypted,
 *   process.env.OLD_KEY,
 *   process.env.NEW_KEY
 * );
 * ```
 */
export function rotateEncryptionKey(
  encryptedData: string,
  oldKey: string,
  newKey: string
): string {
  // Decrypt with old key
  const plaintext = decryptData(encryptedData, oldKey);

  // Encrypt with new key
  return encryptData(plaintext, newKey);
}

/**
 * Batch key rotation for multiple records
 *
 * @param records - Array of encrypted records
 * @param fields - Fields to rotate
 * @param oldKey - Old encryption key
 * @param newKey - New encryption key
 * @returns Array of re-encrypted records
 */
export function batchRotateKeys<T extends Record<string, unknown>>(
  records: T[],
  fields: (keyof T)[],
  oldKey: string,
  newKey: string
): T[] {
  return records.map((record) => {
    const result = { ...record };

    for (const field of fields) {
      const value = record[field];

      if (
        value !== null &&
        value !== undefined &&
        typeof value === "string" &&
        isValidEncryptedFormat(value)
      ) {
        result[field] = rotateEncryptionKey(
          value,
          oldKey,
          newKey
        ) as T[keyof T];
      }
    }

    return result;
  });
}
