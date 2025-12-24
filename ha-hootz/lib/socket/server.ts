import { Server } from "socket.io";

// Store Socket.io server instance globally (set by custom server.js)
declare global {
  var io: Server | undefined;
}

/**
 * Gets the Socket.io server instance
 * The server is initialized in server.js and stored globally
 */
export function getSocketServer(): Server {
  if (!global.io) {
    throw new Error(
      "Socket.io server not initialized. Make sure you're using the custom server (npm run dev)"
    );
  }
  return global.io;
}
