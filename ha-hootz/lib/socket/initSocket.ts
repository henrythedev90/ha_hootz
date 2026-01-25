import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, RedisClientType } from "redis";
import { registerHostHandlers } from "./handlers/host.handlers";
import { registerPlayerHandlers } from "./handlers/player.handlers";

export async function initSocket(io: Server) {
  // Create separate Redis clients for pub/sub (required for Socket.io adapter)
  // Using separate clients instead of duplicate() to avoid connection issues
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is not set");
  }
  
  // Log Redis URL (masked for security)
  const maskedUrl = redisUrl.replace(/:[^:@]+@/, ":****@");
  console.log(`🔗 Attempting to connect to Redis: ${maskedUrl}`);

  // Create socket configuration
  // Note: When using rediss://, the Redis client automatically handles TLS
  // Don't manually set TLS config as it conflicts with the protocol detection
  const createSocketConfig = (): any => {
    return {
      reconnectStrategy: (retries: number): number | Error => {
        if (retries > 20) {
          console.error("Redis Pub/Sub: Max reconnection attempts reached");
          return new Error("Max reconnection attempts reached");
        }
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc., max 5s
        const delay = Math.min(100 * Math.pow(2, retries), 5000);
        return delay;
      },
      connectTimeout: 10000,
      keepAlive: true, // Enable TCP keep-alive to prevent idle timeout
    };
  };

  // Create Redis clients
  // For rediss:// URLs, TLS is automatically handled by the client library
  // Don't manually configure TLS as it conflicts with protocol detection
  const pub = createClient({
    url: redisUrl,
    socket: createSocketConfig(),
  }) as RedisClientType;

  const sub = createClient({
    url: redisUrl,
    socket: createSocketConfig(),
  }) as RedisClientType;

  // Add error handlers
  pub.on("error", (err) => {
    // Only log non-reconnection errors to reduce noise
    if (!err.message.includes("Socket closed") && !err.message.includes("Connection timeout")) {
      console.error("Redis Pub Error:", err.message);
    }
  });

  sub.on("error", (err) => {
    // Only log non-reconnection errors to reduce noise
    if (!err.message.includes("Socket closed") && !err.message.includes("Connection timeout")) {
      console.error("Redis Sub Error:", err.message);
    }
  });
  
  // Log connection state changes for debugging
  pub.on("connect", () => {
    console.log("🔌 Redis Pub: Connecting...");
  });
  
  sub.on("connect", () => {
    console.log("🔌 Redis Sub: Connecting...");
  });
  
  pub.on("reconnecting", () => {
    console.log("🔄 Redis Pub: Reconnecting...");
  });
  
  sub.on("reconnecting", () => {
    console.log("🔄 Redis Sub: Reconnecting...");
  });

  pub.on("ready", () => {
    console.log("✅ Redis Pub: Ready");
  });

  sub.on("ready", () => {
    console.log("✅ Redis Sub: Ready");
  });

  // Connect both clients with retry logic and timeout
  const connectWithRetry = async (
    client: RedisClientType,
    name: string,
    maxRetries = 3
  ) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!client.isOpen) {
          // Add a timeout to prevent hanging (8 seconds per attempt)
          const connectPromise = client.connect();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Connection timeout after 8s`)), 8000)
          );
          await Promise.race([connectPromise, timeoutPromise]);
          return;
        }
      } catch (err: any) {
        if (i === maxRetries - 1) {
          console.error(
            `❌ Failed to connect Redis ${name} after ${maxRetries} attempts:`,
            err.message
          );
          throw err;
        }
        console.log(
          `Retrying Redis ${name} connection (attempt ${
            i + 1
          }/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  try {
    await Promise.all([
      connectWithRetry(pub, "Pub"),
      connectWithRetry(sub, "Sub"),
    ]);
    
    // Verify both clients are actually connected before proceeding
    if (!pub.isOpen || !sub.isOpen) {
      throw new Error("Redis clients created but not connected");
    }
    
    console.log("✅ Redis pub/sub clients connected and ready");
  } catch (err) {
    console.error("❌ Failed to connect Redis pub/sub clients:", err);
    // Close clients if they were partially created
    try {
      if (pub.isOpen) await pub.quit();
      if (sub.isOpen) await sub.quit();
    } catch (closeErr) {
      // Ignore close errors
    }
    throw err;
  }

  // Set up Redis adapter for Socket.io (enables multi-server support)
  // Only set adapter if clients are actually connected
  if (pub.isOpen && sub.isOpen) {
    io.adapter(createAdapter(pub, sub));
    console.log("✅ Socket.io Redis adapter configured");
  } else {
    throw new Error("Cannot set Redis adapter - clients not connected");
  }

  io.on("connection", (socket) => {
    console.log("🧩 Socket connected:", socket.id);

    // Register event handlers
    registerHostHandlers(io, socket);
    registerPlayerHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log("🧩 Socket disconnected:", socket.id);
    });
  });
}
