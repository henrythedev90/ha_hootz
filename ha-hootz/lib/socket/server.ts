import { Server } from "socket.io";
import { initSocket } from "./initSocket";

// Store Socket.io server instance globally to reuse across requests
declare global {
  var io: Server | undefined;
}

/**
 * Ensures Socket.io server is initialized and returns the instance
 * This can be called from any API route to guarantee Socket.io is ready
 */
export async function getSocketServer(): Promise<Server> {
  if (!global.io) {
    console.log("🔌 Initializing Socket.io server");

    const io = new Server({
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Initialize socket handlers
    await initSocket(io);

    global.io = io;
    console.log("✅ Socket.io server initialized");
  }

  return global.io;
}
