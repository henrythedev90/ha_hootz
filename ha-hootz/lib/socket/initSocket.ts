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

  // Create socket configuration
  // Note: When using rediss://, the Redis client automatically handles TLS
  // Don't manually set TLS config as it conflicts with protocol detection
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

  const pub = createClient({
    url: redisUrl,
    socket: createSocketConfig(),
  }) as RedisClientType;

  const sub = createClient({
    url: redisUrl,
    socket: createSocketConfig(),
  }) as RedisClientType;

  // Add error handlers (suppress socket closed errors during reconnection)
  pub.on("error", (err) => {
    if (!err.message.includes("Socket closed")) {
      console.error("Redis Pub Error:", err.message);
    }
  });

  sub.on("error", (err) => {
    if (!err.message.includes("Socket closed")) {
      console.error("Redis Sub Error:", err.message);
    }
  });

  pub.on("ready", () => {
    console.log("✅ Redis Pub: Ready");
  });

  sub.on("ready", () => {
    console.log("✅ Redis Sub: Ready");
  });

  // Connect both clients with retry logic
  const connectWithRetry = async (
    client: RedisClientType,
    name: string,
    maxRetries = 3
  ) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!client.isOpen) {
          await client.connect();
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
    console.log("✅ Redis pub/sub clients connected");
  } catch (err) {
    console.error("❌ Failed to connect Redis pub/sub clients:", err);
    throw err;
  }

  // Set up Redis adapter for Socket.io (enables multi-server support)
  io.adapter(createAdapter(pub, sub));

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
