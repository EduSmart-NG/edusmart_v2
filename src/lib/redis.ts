import type { RedisClientType } from "redis";
import prisma from "@/lib/prisma";

// Configuration
const VERBOSE_LOGGING = process.env.REDIS_VERBOSE_LOGS === "true";
const ENABLE_REDIS = process.env.ENABLE_REDIS !== "false"; // Default true

let redisClient: RedisClientType | null = null;
let isInitializing = false;
let redisAvailable = ENABLE_REDIS;
let fallbackWarningShown = false;

/**
 * Cleanup expired keys from MySQL storage
 * Called periodically during operations
 */
async function cleanupExpiredKeys(): Promise<void> {
  try {
    const now = new Date();
    await prisma.keyValueStore.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });
  } catch (error) {
    if (VERBOSE_LOGGING) {
      console.error("Failed to cleanup expired keys:", error);
    }
  }
}

/**
 * Get Redis client instance
 * Returns null if Redis is unavailable
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  // If Redis is disabled via env, skip entirely
  if (!ENABLE_REDIS) {
    if (!fallbackWarningShown) {
      console.log("ℹ️  Redis disabled - using MySQL storage");
      fallbackWarningShown = true;
    }
    return null;
  }

  // If Redis is marked as unavailable, don't try
  if (!redisAvailable) {
    return null;
  }

  // If client exists and is ready, return it
  if (redisClient?.isReady) {
    return redisClient;
  }

  // If already initializing, wait and retry
  if (isInitializing) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getRedisClient();
  }

  try {
    isInitializing = true;

    // Dynamically import redis only when needed (server-side)
    const { createClient } = await import("redis");

    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      password: process.env.REDIS_PASSWORD,
      socket: {
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: (retries) => {
          // Stop retrying after 3 attempts
          if (retries > 3) {
            if (!fallbackWarningShown) {
              console.log("⚠️  Redis unavailable - using MySQL fallback");
              fallbackWarningShown = true;
            }
            redisAvailable = false;
            return false; // Stop retrying
          }
          // Quick retry for transient issues
          return Math.min(retries * 50, 150);
        },
      },
    });

    redisClient.on("error", (_err) => {
      // Only log the first error to avoid spam
      if (redisAvailable && !fallbackWarningShown) {
        console.log("⚠️  Redis connection failed - using MySQL fallback");
        fallbackWarningShown = true;
      }
      redisAvailable = false;
    });

    redisClient.on("connect", () => {
      if (VERBOSE_LOGGING) {
        console.log("✅ Redis connected");
      }
      redisAvailable = true;
      fallbackWarningShown = false;
    });

    redisClient.on("ready", () => {
      console.log("✅ Redis ready - using Redis for storage");
      redisAvailable = true;
      fallbackWarningShown = false;
    });

    redisClient.on("end", () => {
      if (VERBOSE_LOGGING) {
        console.log("Redis connection closed");
      }
      redisAvailable = false;
    });

    await redisClient.connect();

    return redisClient;
  } catch (_error) {
    // Silent fallback - only log once
    if (!fallbackWarningShown) {
      console.log("⚠️  Redis unavailable - using MySQL fallback");
      fallbackWarningShown = true;
    }
    redisAvailable = false;
    return null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Check if a key has expired
 */
function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

/**
 * Get value from MySQL storage
 */
async function getFromMySQL(key: string): Promise<string | null> {
  try {
    const record = await prisma.keyValueStore.findUnique({
      where: { key },
      select: { value: true, expiresAt: true },
    });

    if (!record) {
      return null;
    }

    // Check if expired
    if (isExpired(record.expiresAt)) {
      // Delete expired key
      await prisma.keyValueStore.delete({ where: { key } }).catch(() => {});
      return null;
    }

    return record.value;
  } catch (error) {
    if (VERBOSE_LOGGING) {
      console.error("MySQL GET error:", error);
    }
    return null;
  }
}

/**
 * Set value in MySQL storage
 */
async function setInMySQL(
  key: string,
  value: string,
  ttl?: number
): Promise<void> {
  try {
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;

    await prisma.keyValueStore.upsert({
      where: { key },
      update: {
        value,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
        expiresAt,
      },
    });

    // Occasionally cleanup expired keys (1% chance per operation)
    if (Math.random() < 0.01) {
      cleanupExpiredKeys().catch(() => {});
    }
  } catch (error) {
    if (VERBOSE_LOGGING) {
      console.error("MySQL SET error:", error);
    }
    throw error;
  }
}

/**
 * Delete value from MySQL storage
 * Uses deleteMany for idempotent behavior (won't error if key doesn't exist)
 */
async function deleteFromMySQL(key: string): Promise<void> {
  try {
    // Use deleteMany instead of delete - it's idempotent
    await prisma.keyValueStore.deleteMany({
      where: { key },
    });
  } catch (error) {
    if (VERBOSE_LOGGING) {
      console.error("MySQL DELETE error:", error);
    }
    // Don't throw - DELETE operations should be idempotent
  }
}

/**
 * Redis wrapper with automatic MySQL fallback
 */
export const redis = {
  /**
   * Get value by key
   * Tries Redis first, falls back to MySQL if unavailable
   */
  get: async (key: string): Promise<string | null> => {
    try {
      const client = await getRedisClient();

      if (client) {
        // Try Redis
        try {
          return await client.get(key);
        } catch (error) {
          // Silent fallback on error
          if (VERBOSE_LOGGING) {
            console.error("Redis GET error, using MySQL:", error);
          }
          redisAvailable = false;
        }
      }

      // Fallback to MySQL (silent)
      if (VERBOSE_LOGGING) {
        console.log(`[MySQL] GET: ${key}`);
      }
      return await getFromMySQL(key);
    } catch (error) {
      console.error("Storage GET error:", error);
      return null;
    }
  },

  /**
   * Set value with optional TTL
   * Tries Redis first, falls back to MySQL if unavailable
   */
  set: async (key: string, value: string, ttl?: number): Promise<void> => {
    try {
      const client = await getRedisClient();

      if (client) {
        // Try Redis
        try {
          if (ttl) {
            await client.set(key, value, { EX: ttl });
          } else {
            await client.set(key, value);
          }
          return;
        } catch (error) {
          // Silent fallback on error
          if (VERBOSE_LOGGING) {
            console.error("Redis SET error, using MySQL:", error);
          }
          redisAvailable = false;
        }
      }

      // Fallback to MySQL (silent)
      if (VERBOSE_LOGGING) {
        console.log(`[MySQL] SET: ${key}`);
      }
      await setInMySQL(key, value, ttl);
    } catch (error) {
      console.error("Storage SET error:", error);
      throw error;
    }
  },

  /**
   * Delete value by key
   * Tries Redis first, falls back to MySQL if unavailable
   */
  delete: async (key: string): Promise<void> => {
    try {
      const client = await getRedisClient();

      if (client) {
        // Try Redis
        try {
          await client.del(key);
          return;
        } catch (error) {
          // Silent fallback on error
          if (VERBOSE_LOGGING) {
            console.error("Redis DELETE error, using MySQL:", error);
          }
          redisAvailable = false;
        }
      }

      // Fallback to MySQL (silent)
      if (VERBOSE_LOGGING) {
        console.log(`[MySQL] DELETE: ${key}`);
      }
      await deleteFromMySQL(key);
    } catch (error) {
      console.error("Storage DELETE error:", error);
      throw error;
    }
  },

  /**
   * Check if Redis is currently available
   */
  isRedisAvailable: (): boolean => {
    return redisAvailable && redisClient?.isReady === true;
  },

  /**
   * Manually trigger cleanup of expired MySQL keys
   */
  cleanupExpired: async (): Promise<void> => {
    await cleanupExpiredKeys();
  },
};

// Graceful shutdown
if (typeof process !== "undefined") {
  const cleanup = async () => {
    if (redisClient?.isReady) {
      if (VERBOSE_LOGGING) {
        console.log("Closing Redis connection...");
      }
      await redisClient.quit();
      if (VERBOSE_LOGGING) {
        console.log("Redis connection closed");
      }
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
}
