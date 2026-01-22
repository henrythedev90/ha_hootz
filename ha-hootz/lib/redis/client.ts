import { createClient, RedisClientType } from "redis";

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is not set", process.env.REDIS_URL);
  throw new Error("Please add your Redis URL to .env.local");
}

const url: string = process.env.REDIS_URL;

// Check if URL uses TLS (rediss://)
const isTLS = url.startsWith("rediss://");

// Log Redis URL in development mode (mask password for security)
// This will execute when the module is first imported
let redis: RedisClientType;
let redisPromise: Promise<RedisClientType>;

function createRedisClient(): RedisClientType {
  const socketConfig: any = {
    reconnectStrategy: (retries: number): number | Error => {
      if (retries > 20) {
        console.error("Redis: Max reconnection attempts reached");
        return new Error("Max reconnection attempts reached");
      }
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc., max 5s
      const delay = Math.min(100 * Math.pow(2, retries), 5000);
      if (retries % 5 === 0) {
        console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
      }
      return delay;
    },
    connectTimeout: 10000, // 10 seconds
    keepAlive: 30000, // 30 seconds - prevents idle timeout
  };

  // Add TLS configuration if using rediss://
  if (isTLS) {
    socketConfig.tls = {
      rejectUnauthorized: false, // Required for some cloud providers like Upstash
    };
  }

  const client = createClient({
    url,
    socket: socketConfig,
  }) as RedisClientType;

  client.on("error", (err) => {
    // Only log errors, don't spam console with reconnection attempts
    if (!err.message.includes("Socket closed")) {
      console.error("Redis Error:", err.message);
    }
  });

  client.on("connect", () => {
    console.log("Redis: Connected");
  });

  client.on("reconnecting", () => {
    // Suppress reconnecting logs to reduce noise
  });

  client.on("ready", () => {
    console.log("✅ Redis: Ready");
  });

  client.on("end", () => {
    console.log("Redis: Connection ended");
  });

  return client;
}

async function ensureConnected(
  client: RedisClientType
): Promise<RedisClientType> {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithRedis = global as typeof globalThis & {
    _redisClient?: RedisClientType;
    _redisClientPromise?: Promise<RedisClientType>;
  };

  if (!globalWithRedis._redisClientPromise) {
    redis = createRedisClient();
    globalWithRedis._redisClientPromise = redis
      .connect()
      .then(() => {
        globalWithRedis._redisClient = redis;
        return redis;
      })
      .catch((err) => {
        console.error("Redis: Initial connection failed", err);
        throw err;
      });
  }
  redisPromise = globalWithRedis._redisClientPromise.then((client) =>
    ensureConnected(client)
  );
} else {
  // In production/serverless mode, use a global variable to reuse connections
  // This is important for serverless environments where connections can be reused
  let globalWithRedis = global as typeof globalThis & {
    _redisClient?: RedisClientType;
    _redisClientPromise?: Promise<RedisClientType>;
  };

  if (!globalWithRedis._redisClientPromise) {
    redis = createRedisClient();
    globalWithRedis._redisClientPromise = redis
      .connect()
      .then(() => {
        globalWithRedis._redisClient = redis;
        return redis;
      })
      .catch((err) => {
        console.error("Redis: Initial connection failed", err);
        // Reset promise to allow retry
        globalWithRedis._redisClientPromise = undefined;
        throw err;
      });
  }
  redisPromise = globalWithRedis._redisClientPromise.then((client) =>
    ensureConnected(client)
  );
}

export default redisPromise;
