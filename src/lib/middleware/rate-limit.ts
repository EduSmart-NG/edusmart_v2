/**
 * Rate Limiting Middleware for Server Actions
 *
 * Provides rate limiting for custom server actions using Redis.
 * Better Auth's built-in rate limiting only works for its own endpoints,
 * so we need custom rate limiting for our server actions.
 *
 * Features:
 * - Per-user rate limiting (by user ID)
 * - Per-IP rate limiting (for unauthenticated requests)
 * - Sliding window algorithm
 * - Automatic cleanup of expired entries
 * - Configurable limits per action type
 *
 * @module lib/middleware/rate-limit
 */

import { redis } from "@/lib/redis";
import { headers } from "next/headers";

// ============================================
// TYPES
// ============================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  max: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Custom identifier (optional)
   * If not provided, uses userId or IP address
   */
  identifier?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Number of requests remaining in the window
   */
  remaining?: number;

  /**
   * Time in seconds until the window resets
   */
  retryAfter?: number;

  /**
   * Total number of requests in the current window
   */
  current?: number;
}

/**
 * Rate limit data structure stored in Redis
 */
interface RateLimitData {
  requests: string[]; // Array of ISO timestamps
  windowStart: string; // ISO timestamp
}

// ============================================
// RATE LIMIT CONFIGURATIONS
// ============================================

/**
 * Predefined rate limit configurations for different action types
 */
export const RATE_LIMITS = {
  // Admin operations - stricter limits
  ADMIN_CREATE_USER: {
    max: 5,
    windowSeconds: 300, // 5 minutes - 10 users per 5 minutes
  },
  ADMIN_BAN_USER: {
    max: 20,
    windowSeconds: 300, // 5 minutes
  },
  ADMIN_SET_ROLE: {
    max: 20,
    windowSeconds: 300, // 5 minutes
  },
  ADMIN_LIST_USERS: {
    max: 100,
    windowSeconds: 60, // 1 minute
  },

  // Question operations
  QUESTION_UPLOAD: {
    max: 50,
    windowSeconds: 3600, // 1 hour
  },

  // Authentication operations
  LOGIN_ATTEMPT: {
    max: 5,
    windowSeconds: 900, // 15 minutes
  },
  PASSWORD_RESET: {
    max: 3,
    windowSeconds: 3600, // 1 hour
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get IP address from request headers
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();

  // Check various headers for IP address
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    headersList.get("cf-connecting-ip") ||
    "unknown";

  return ip;
}

/**
 * Generate rate limit key for Redis
 */
function getRateLimitKey(action: string, identifier: string): string {
  return `rate_limit:${action}:${identifier}`;
}

// ============================================
// MAIN RATE LIMIT FUNCTION
// ============================================

/**
 * Check and enforce rate limit
 *
 * Uses sliding window algorithm to track requests over time.
 * Stores request timestamps in Redis and removes expired ones.
 *
 * @param action - Action identifier (e.g., 'admin:create-user')
 * @param config - Rate limit configuration
 * @param userId - User ID (optional, for authenticated requests)
 * @returns Rate limit result
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(
 *   "admin:create-user",
 *   RATE_LIMITS.ADMIN_CREATE_USER,
 *   session.user.id
 * );
 *
 * if (!result.allowed) {
 *   return {
 *     success: false,
 *     message: `Rate limit exceeded. Retry in ${result.retryAfter} seconds.`,
 *   };
 * }
 * ```
 */
export async function checkRateLimit(
  action: string,
  config: RateLimitConfig,
  userId?: string
): Promise<RateLimitResult> {
  try {
    // Get identifier (userId or IP address)
    const identifier = userId || config.identifier || (await getClientIP());
    const key = getRateLimitKey(action, identifier);
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

    // Get existing data from Redis
    const data = await redis.get(key);

    let rateLimitData: RateLimitData;

    if (!data) {
      // First request in the window
      rateLimitData = {
        requests: [now.toISOString()],
        windowStart: windowStart.toISOString(),
      };

      // Store with TTL slightly longer than window to allow cleanup
      await redis.set(
        key,
        JSON.stringify(rateLimitData),
        config.windowSeconds + 60
      );

      return {
        allowed: true,
        remaining: config.max - 1,
        current: 1,
      };
    }

    // Parse existing data
    rateLimitData = JSON.parse(data);

    // Remove expired requests (outside the sliding window)
    const validRequests = rateLimitData.requests.filter((timestamp) => {
      const requestTime = new Date(timestamp);
      return requestTime > windowStart;
    });

    // Check if limit exceeded
    if (validRequests.length >= config.max) {
      // Find oldest request to calculate retry time
      const oldestRequest = new Date(validRequests[0]);
      const retryAfter = Math.ceil(
        (oldestRequest.getTime() +
          config.windowSeconds * 1000 -
          now.getTime()) /
          1000
      );

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(retryAfter, 1),
        current: validRequests.length,
      };
    }

    // Add current request
    validRequests.push(now.toISOString());

    // Update Redis
    rateLimitData.requests = validRequests;
    await redis.set(
      key,
      JSON.stringify(rateLimitData),
      config.windowSeconds + 60
    );

    return {
      allowed: true,
      remaining: config.max - validRequests.length,
      current: validRequests.length,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: config.max,
    };
  }
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Rate limit wrapper for server actions
 *
 * Wraps a server action with rate limiting.
 * Returns early if rate limit is exceeded.
 *
 * @param action - Action identifier
 * @param config - Rate limit configuration
 * @param userId - User ID (optional)
 * @param handler - The actual server action handler
 * @returns Result from handler or rate limit error
 *
 * @example
 * ```typescript
 * export async function createUser(data: CreateUserInput) {
 *   return withRateLimit(
 *     "admin:create-user",
 *     RATE_LIMITS.ADMIN_CREATE_USER,
 *     session.user.id,
 *     async () => {
 *       // Actual create user logic
 *       return { success: true, data: user };
 *     }
 *   );
 * }
 * ```
 */
export async function withRateLimit<T>(
  action: string,
  config: RateLimitConfig,
  userId: string | undefined,
  handler: () => Promise<T>
): Promise<
  T | { success: false; message: string; code: string; retryAfter?: number }
> {
  const result = await checkRateLimit(action, config, userId);

  if (!result.allowed) {
    return {
      success: false,
      message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: result.retryAfter,
    };
  }

  return handler();
}

/**
 * Reset rate limit for a specific user/IP
 *
 * Useful for testing or when manually clearing rate limits.
 *
 * @param action - Action identifier
 * @param identifier - User ID or custom identifier
 */
export async function resetRateLimit(
  action: string,
  identifier: string
): Promise<void> {
  try {
    const key = getRateLimitKey(action, identifier);
    await redis.delete(key);
  } catch (error) {
    console.error("Failed to reset rate limit:", error);
  }
}

/**
 * Get current rate limit status
 *
 * Useful for displaying rate limit info to users.
 *
 * @param action - Action identifier
 * @param identifier - User ID or custom identifier
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  action: string,
  identifier: string,
  config: RateLimitConfig
): Promise<{
  current: number;
  max: number;
  remaining: number;
  resetsAt: Date | null;
}> {
  try {
    const key = getRateLimitKey(action, identifier);
    const data = await redis.get(key);

    if (!data) {
      return {
        current: 0,
        max: config.max,
        remaining: config.max,
        resetsAt: null,
      };
    }

    const rateLimitData: RateLimitData = JSON.parse(data);
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

    // Count valid requests
    const validRequests = rateLimitData.requests.filter((timestamp) => {
      return new Date(timestamp) > windowStart;
    });

    // Calculate reset time (oldest request + window)
    let resetsAt: Date | null = null;
    if (validRequests.length > 0) {
      const oldestRequest = new Date(validRequests[0]);
      resetsAt = new Date(
        oldestRequest.getTime() + config.windowSeconds * 1000
      );
    }

    return {
      current: validRequests.length,
      max: config.max,
      remaining: Math.max(0, config.max - validRequests.length),
      resetsAt,
    };
  } catch (error) {
    console.error("Failed to get rate limit status:", error);
    return {
      current: 0,
      max: config.max,
      remaining: config.max,
      resetsAt: null,
    };
  }
}
