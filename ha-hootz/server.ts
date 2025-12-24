import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { initSocket } from "./lib/socket/initSocket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
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
  try {
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
