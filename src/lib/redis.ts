import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis Client Connected");
    });

    await redisClient.connect();
  }

  return redisClient;
}

export const redis = {
  get: async (key: string): Promise<string | null> => {
    const client = await getRedisClient();
    return await client.get(key);
  },

  set: async (key: string, value: string, ttl?: number): Promise<void> => {
    const client = await getRedisClient();
    if (ttl) {
      await client.set(key, value, { EX: ttl });
    } else {
      await client.set(key, value);
    }
  },

  delete: async (key: string): Promise<void> => {
    const client = await getRedisClient();
    await client.del(key);
  },
};

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });

  process.on("SIGTERM", async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });
}
