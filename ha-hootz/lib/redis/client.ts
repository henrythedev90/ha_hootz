import { createClient, RedisClientType } from "redis";

if (!process.env.REDIS_URL) {
  throw new Error("Please add your Redis URL to .env.local");
}

const url: string = process.env.REDIS_URL;

// Log Redis URL in development mode (mask password for security)
// This will execute when the module is first imported
if (process.env.NODE_ENV === "development") {
  const maskedUrl = url.replace(/:([^:@]+)@/, ":****@"); // Mask password
  console.log("✅ Redis configured - URL:", maskedUrl);
}
let redis: RedisClientType;
let redisPromise: Promise<RedisClientType>;

function createRedisClient(): RedisClientType {
  const client = createClient({
    url,
  }) as RedisClientType;

  client.on("error", (err) => console.error("Redis Error", err));

  return client;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithRedis = global as typeof globalThis & {
    _redisClientPromise?: Promise<RedisClientType>;
  };

  if (!globalWithRedis._redisClientPromise) {
    redis = createRedisClient();
    globalWithRedis._redisClientPromise = redis.connect().then(() => redis);
  }
  redisPromise = globalWithRedis._redisClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  redis = createRedisClient();
  redisPromise = redis.connect().then(() => redis);
}

export default redisPromise;
