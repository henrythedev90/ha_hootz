import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import redisPromise from "@/lib/redis/client";
import { registerHostHandlers } from "./handlers/host.handlers";
import { registerPlayerHandlers } from "./handlers/player.handlers";

export async function initSocket(io: Server) {
  // Get Redis client and create pub/sub clients for adapter
  const redis = await redisPromise;
  const pub = redis.duplicate();
  const sub = redis.duplicate();

  // Connect the duplicate clients
  await Promise.all([pub.connect(), sub.connect()]);

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
