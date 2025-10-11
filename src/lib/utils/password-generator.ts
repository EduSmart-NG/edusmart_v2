import { randomBytes } from "crypto";

/**
 * Character sets for secure password generation
 * Organized by category to ensure complexity requirements
 */
const CHARSET = {
  UPPERCASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  LOWERCASE: "abcdefghijklmnopqrstuvwxyz",
  NUMBERS: "0123456789",
  SYMBOLS: "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

/**
 * Password generation configuration
 */
interface PasswordConfig {
  /**
   * Total length of generated password
   * @default 12
   */
  length?: number;

  /**
   * Whether to include uppercase letters
   * @default true
   */
  includeUppercase?: boolean;

  /**
   * Whether to include lowercase letters
   * @default true
   */
  includeLowercase?: boolean;

  /**
   * Whether to include numbers
   * @default true
   */
  includeNumbers?: boolean;

  /**
   * Whether to include special symbols
   * @default true
   */
  includeSymbols?: boolean;
}

/**
 * Result of password generation with metadata
 */
interface PasswordResult {
  /**
   * The generated secure password
   */
  password: string;

  /**
   * Password strength metadata
   */
  metadata: {
    length: number;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSymbols: boolean;
  };
}

/**
 * Generates a cryptographically secure random password
 *
 * Security features:
 * - Uses Node.js crypto.randomBytes() for cryptographic randomness
 * - Ensures at least one character from each enabled category
 * - Fisher-Yates shuffle algorithm to randomize character positions
 * - No predictable patterns or sequences
 *
 * Password complexity requirements:
 * - Minimum 12 characters (exceeds Better Auth's 8 character minimum)
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 *
 * @param config - Password generation configuration
 * @returns Generated password with metadata
 *
 * @example
 * ```typescript
 * // Generate with defaults (12 chars, all categories)
 * const result = generateSecurePassword();
 * console.log(result.password); // "Kp9@mN2xL!qR"
 *
 * // Generate longer password
 * const result = generateSecurePassword({ length: 16 });
 * console.log(result.password); // "Xk7#pQ9@mN2xL!qR"
 * ```
 *
 * @throws {Error} If length is less than 4 (minimum for one char from each category)
 */
export function generateSecurePassword(
  config: PasswordConfig = {}
): PasswordResult {
  const {
    length = 12,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = config;

  // Validate minimum length
  const enabledCategories = [
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
  ].filter(Boolean).length;

  if (length < enabledCategories) {
    throw new Error(
      `Password length must be at least ${enabledCategories} to include one character from each enabled category`
    );
  }

  if (length < 8) {
    throw new Error("Password length must be at least 8 characters");
  }

  // Build character pool based on configuration
  let allChars = "";
  const guaranteedChars: string[] = [];

  if (includeUppercase) {
    allChars += CHARSET.UPPERCASE;
    guaranteedChars.push(getRandomChar(CHARSET.UPPERCASE));
  }

  if (includeLowercase) {
    allChars += CHARSET.LOWERCASE;
    guaranteedChars.push(getRandomChar(CHARSET.LOWERCASE));
  }

  if (includeNumbers) {
    allChars += CHARSET.NUMBERS;
    guaranteedChars.push(getRandomChar(CHARSET.NUMBERS));
  }

  if (includeSymbols) {
    allChars += CHARSET.SYMBOLS;
    guaranteedChars.push(getRandomChar(CHARSET.SYMBOLS));
  }

  if (allChars.length === 0) {
    throw new Error("At least one character category must be enabled");
  }

  // Fill remaining length with random characters from all categories
  const remainingLength = length - guaranteedChars.length;
  const randomChars: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(getRandomChar(allChars));
  }

  // Combine guaranteed and random characters
  const allPasswordChars = [...guaranteedChars, ...randomChars];

  // Shuffle using Fisher-Yates algorithm for cryptographic randomness
  const shuffledChars = fisherYatesShuffle(allPasswordChars);

  // Join into final password string
  const password = shuffledChars.join("");

  return {
    password,
    metadata: {
      length: password.length,
      hasUppercase: includeUppercase,
      hasLowercase: includeLowercase,
      hasNumbers: includeNumbers,
      hasSymbols: includeSymbols,
    },
  };
}

/**
 * Gets a cryptographically random character from a character set
 *
 * Uses crypto.randomBytes() to generate secure random indices
 *
 * @param charset - String of characters to choose from
 * @returns Random character from the charset
 */
function getRandomChar(charset: string): string {
  const randomIndex = getSecureRandomInt(0, charset.length - 1);
  return charset[randomIndex];
}

/**
 * Generates a cryptographically secure random integer in range [min, max]
 *
 * Uses rejection sampling to ensure uniform distribution
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer in range
 */
function getSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValidValue = Math.floor(256 ** bytesNeeded / range) * range - 1;

  let randomValue: number;

  // Rejection sampling to ensure uniform distribution
  do {
    const randomBytes = randomBytesSync(bytesNeeded);
    randomValue = randomBytes.reduce((acc, byte) => acc * 256 + byte, 0);
  } while (randomValue > maxValidValue);

  return min + (randomValue % range);
}

/**
 * Synchronously generates cryptographically secure random bytes
 *
 * Wrapper around Node.js crypto.randomBytes for type safety
 *
 * @param size - Number of bytes to generate
 * @returns Buffer of random bytes
 */
function randomBytesSync(size: number): Buffer {
  return randomBytes(size);
}

/**
 * Fisher-Yates shuffle algorithm for array randomization
 *
 * Uses cryptographically secure random number generation
 * Provides uniform distribution of permutations
 *
 * @param array - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  // Create a copy to avoid mutating original
  const shuffled = [...array];
  const length = shuffled.length;

  // Iterate backwards through array
  for (let i = length - 1; i > 0; i--) {
    // Generate secure random index from 0 to i
    const randomIndex = getSecureRandomInt(0, i);

    // Swap elements at i and randomIndex
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

/**
 * Validates password strength (for testing/verification)
 *
 * Checks if a password meets minimum complexity requirements
 *
 * @param password - Password to validate
 * @returns Whether password meets requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats a password for console logging (audit trail)
 *
 * Creates a formatted string with security warnings
 *
 * @param password - Password to format
 * @param userEmail - Email of user who will receive password
 * @param adminEmail - Email of admin who created the user
 * @param role - Role assigned to the user
 * @returns Formatted string for console logging
 */
export function formatPasswordForLogging(
  password: string,
  userEmail: string,
  adminEmail: string,
  role: string
): string {
  return [
    "\n" + "=".repeat(70),
    "[ADMIN USER CREATION]",
    "=".repeat(70),
    `Admin: ${adminEmail}`,
    `Created User: ${userEmail}`,
    `Role: ${role}`,
    `Temporary Password: ${password}`,
    "",
    "⚠️  SECURITY NOTICE:",
    "   - User must change password on first login",
    "   - This password is logged for administrative purposes only",
    "   - Do not share via insecure channels",
    "   - Password is hashed in database",
    "",
    `Timestamp: ${new Date().toISOString()}`,
    "=".repeat(70) + "\n",
  ].join("\n");
}
