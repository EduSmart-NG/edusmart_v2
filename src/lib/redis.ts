import type { RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let isInitializing = false;

async function getRedisClient(): Promise<RedisClientType> {
  // If client exists and is ready, return it
  if (redisClient?.isReady) {
    return redisClient;
  }

  // If already initializing, wait a bit and retry
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
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("Redis: Too many reconnection attempts");
            return new Error("Too many reconnection attempts");
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis Client Connected");
    });

    redisClient.on("ready", () => {
      console.log("Redis Client Ready");
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error("Failed to initialize Redis client:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

export const redis = {
  get: async (key: string): Promise<string | null> => {
    try {
      const client = await getRedisClient();
      return await client.get(key);
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  },

  set: async (key: string, value: string, ttl?: number): Promise<void> => {
    try {
      const client = await getRedisClient();
      if (ttl) {
        await client.set(key, value, { EX: ttl });
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      console.error("Redis SET error:", error);
      throw error;
    }
  },

  delete: async (key: string): Promise<void> => {
    try {
      const client = await getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error("Redis DELETE error:", error);
      throw error;
    }
  },
};

// Graceful shutdown
if (typeof process !== "undefined") {
  const cleanup = async () => {
    if (redisClient?.isReady) {
      console.log("Closing Redis connection...");
      await redisClient.quit();
      console.log("Redis connection closed");
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
}
