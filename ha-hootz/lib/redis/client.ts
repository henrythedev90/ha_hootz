import { createClient, RedisClientType } from "redis";

// Lazy validation - only check REDIS_URL when actually creating a client
// This allows the build to complete without REDIS_URL set
function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    // During Next.js build, env vars may not be available
    // Check if we're in a build context (Next.js sets NEXT_PHASE during build)
    const isBuildTime =
      process.env.NEXT_PHASE === "phase-production-build" ||
      (process.env.NODE_ENV === "production" && !process.env.NEXT_RUNTIME);

    if (isBuildTime) {
      // During build, throw an error that will be caught and handled
      // The Proxy wrapper will catch this and return a rejected promise
      throw new Error(
        "REDIS_URL is not set during build - this is expected. Set it at runtime."
      );
    }
    console.error("REDIS_URL is not set", process.env.REDIS_URL);
    throw new Error("Please add your Redis URL to .env.local");
  }
  return url;
}

// Log Redis URL in development mode (mask password for security)
// This will execute when the module is first imported
let redis: RedisClientType;
let redisPromise: Promise<RedisClientType>;

function createRedisClient(): RedisClientType {
  // Get Redis URL (validates at runtime, not build time)
  const url = getRedisUrl();

  // Create socket configuration
  // Note: When using rediss://, the Redis client automatically handles TLS
  // Don't manually set TLS config in socket as it conflicts with protocol detection
  // For Upstash, TLS is handled automatically via the rediss:// protocol
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
    keepAlive: true, // Enable TCP keep-alive to prevent idle timeout
  };

  // Log connection details in development (mask sensitive info)
  if (process.env.NODE_ENV === "development") {
    const urlObj = new URL(url);
    const maskedUrl = `${urlObj.protocol}//${urlObj.username}:****@${urlObj.hostname}:${urlObj.port}`;
    console.log(`🔌 Connecting to Redis: ${maskedUrl}`);
  }

  // Create client - TLS is automatically handled for rediss:// URLs
  // The redis client library detects TLS from the rediss:// protocol
  // Don't manually configure TLS as it conflicts with protocol detection
  const client = createClient({
    url,
    socket: socketConfig,
  }) as RedisClientType;

  client.on("error", (err) => {
    // Only log errors, don't spam console with reconnection attempts
    if (!err.message.includes("Socket closed")) {
      console.error("Redis Error:", err.message);
      
      // Provide helpful diagnostics for common errors
      if (err.message.includes("timeout") || err.message.includes("ETIMEDOUT")) {
        console.error("\n⚠️  Connection timeout troubleshooting:");
        console.error("1. Check if your Upstash database is active (not paused)");
        console.error("2. Verify your IP is whitelisted in Upstash dashboard");
        console.error("3. Check your network/firewall settings");
        console.error("4. Verify the REDIS_URL is correct");
      }
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

// Lazy initialization function - only creates client when actually needed
function initializeRedisClient(): Promise<RedisClientType> {
  try {
    if (process.env.NODE_ENV === "development") {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      const globalWithRedis = global as typeof globalThis & {
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
      return globalWithRedis._redisClientPromise.then((client) =>
        ensureConnected(client)
      );
    } else {
      // In production/serverless mode, use a global variable to reuse connections
      // This is important for serverless environments where connections can be reused
      const globalWithRedis = global as typeof globalThis & {
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
      return globalWithRedis._redisClientPromise.then((client) =>
        ensureConnected(client)
      );
    }
  } catch (error: any) {
    // During build, if REDIS_URL is not set, return a rejected promise
    // that will fail at runtime (when env vars are available)
    const isBuildTime =
      process.env.NEXT_PHASE === "phase-production-build" ||
      (process.env.NODE_ENV === "production" && !process.env.NEXT_RUNTIME);

    if (
      isBuildTime &&
      error.message.includes("REDIS_URL is not set during build")
    ) {
      // Return a promise that will be rejected at runtime
      // This allows the build to complete
      return Promise.reject(
        new Error(
          "REDIS_URL is not set. Please set it in your environment variables at runtime."
        )
      );
    }
    throw error;
  }
}

// Export a promise that only initializes when accessed
// Using a getter function that returns a promise
// This prevents build-time errors when REDIS_URL is not set
let _lazyRedisPromise: Promise<RedisClientType> | null = null;

function getRedisPromise(): Promise<RedisClientType> {
  if (!_lazyRedisPromise) {
    try {
      _lazyRedisPromise = initializeRedisClient();
    } catch (error: any) {
      // If initialization fails, return a rejected promise
      _lazyRedisPromise = Promise.reject(error);
    }
  }
  return _lazyRedisPromise;
}

// Export a promise-like object that initializes lazily
// This works better than Proxy for Promise compatibility
const lazyRedisExport = {
  then: (onFulfilled?: any, onRejected?: any) =>
    getRedisPromise().then(onFulfilled, onRejected),
  catch: (onRejected?: any) => getRedisPromise().catch(onRejected),
  finally: (onFinally?: any) => getRedisPromise().finally(onFinally),
  [Symbol.toStringTag]: "Promise",
} as Promise<RedisClientType>;

export default lazyRedisExport;
