import { loadEnvConfig } from "@next/env";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

// Load environment variables FIRST, before any other imports that use process.env
// This is critical when using a custom server (tsx server.ts)
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const dev = process.env.NODE_ENV !== "production";
// Fly.io requires binding to 0.0.0.0, not localhost
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.io server
  const io = new Server(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Store io globally for access in API routes
  (global as any).io = io;

  // Initialize Socket.io handlers
  // Use dynamic import AFTER env vars are loaded to prevent Redis client from loading too early
  try {
    const { initSocket } = await import("./lib/socket/initSocket");
    await initSocket(io);
    console.log("✅ Socket.io initialized");
  } catch (err) {
    console.error("❌ Error initializing Socket.io:", err);
  }

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(
        `> Socket.io available at http://${hostname}:${port}/api/socket`
      );
    });
});
