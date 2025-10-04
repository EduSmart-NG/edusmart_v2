import { redis } from "@/lib/redis";
import type { AccountLockoutData } from "@/types/auth";

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
const ATTEMPT_WINDOW = 15 * 60; // 15 minutes in seconds
const PROGRESSIVE_DELAYS = [0, 1000, 2000, 4000, 8000]; // milliseconds

/**
 * Get the Redis key for account lockout tracking
 */
function getLockoutKey(identifier: string): string {
  const normalized = identifier.toLowerCase().trim();
  return `login_attempts:${normalized}`;
}

/**
 * Get current lockout data for an account
 */
export async function getLockoutData(
  identifier: string
): Promise<AccountLockoutData | null> {
  try {
    const key = getLockoutKey(identifier);
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as AccountLockoutData;
  } catch (error) {
    console.error("Error getting lockout data:", error);
    return null;
  }
}

/**
 * Check if an account is currently locked
 */
export async function isAccountLocked(identifier: string): Promise<boolean> {
  try {
    const data = await getLockoutData(identifier);

    if (!data || !data.isLocked) {
      return false;
    }

    // Check if lockout has expired
    if (data.lockedUntil) {
      const lockedUntil = new Date(data.lockedUntil);
      if (new Date() > lockedUntil) {
        // Lockout expired, clear it
        await clearLockout(identifier);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error checking account lockout:", error);
    return false;
  }
}

/**
 * Get remaining lockout time in seconds
 */
export async function getRemainingLockoutTime(
  identifier: string
): Promise<number> {
  try {
    const data = await getLockoutData(identifier);

    if (!data || !data.isLocked || !data.lockedUntil) {
      return 0;
    }

    const lockedUntil = new Date(data.lockedUntil);
    const now = new Date();
    const remainingMs = lockedUntil.getTime() - now.getTime();

    return Math.max(0, Math.ceil(remainingMs / 1000));
  } catch (error) {
    console.error("Error getting remaining lockout time:", error);
    return 0;
  }
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(
  identifier: string
): Promise<{ locked: boolean; delay: number }> {
  try {
    const key = getLockoutKey(identifier);
    const existing = await getLockoutData(identifier);

    const now = new Date().toISOString();
    const attempts = (existing?.attempts || 0) + 1;

    // Determine if account should be locked
    const shouldLock = attempts >= MAX_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_DURATION * 1000).toISOString()
      : undefined;

    const lockoutData: AccountLockoutData = {
      attempts,
      lastAttempt: now,
      lockedUntil,
      isLocked: shouldLock,
    };

    // Store in Redis with TTL
    await redis.set(key, JSON.stringify(lockoutData), ATTEMPT_WINDOW);

    // Calculate progressive delay
    const delayIndex = Math.min(attempts - 1, PROGRESSIVE_DELAYS.length - 1);
    const delay = PROGRESSIVE_DELAYS[delayIndex];

    return { locked: shouldLock, delay };
  } catch (error) {
    console.error("Error recording failed attempt:", error);
    return { locked: false, delay: 0 };
  }
}

/**
 * Clear failed attempts (on successful login)
 */
export async function clearLockout(identifier: string): Promise<void> {
  try {
    const key = getLockoutKey(identifier);
    await redis.delete(key);
  } catch (error) {
    console.error("Error clearing lockout:", error);
  }
}

/**
 * Get the number of failed attempts
 */
export async function getFailedAttempts(identifier: string): Promise<number> {
  try {
    const data = await getLockoutData(identifier);
    return data?.attempts || 0;
  } catch (error) {
    console.error("Error getting failed attempts:", error);
    return 0;
  }
}

/**
 * Apply progressive delay based on failed attempts
 */
export async function applyProgressiveDelay(identifier: string): Promise<void> {
  try {
    const attempts = await getFailedAttempts(identifier);
    const delayIndex = Math.min(attempts - 1, PROGRESSIVE_DELAYS.length - 1);
    const delay = PROGRESSIVE_DELAYS[delayIndex];

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  } catch (error) {
    console.error("Error applying progressive delay:", error);
  }
}
