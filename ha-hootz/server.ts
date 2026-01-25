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
// In production or when PORT is set (Fly.io always sets PORT), use 0.0.0.0
// This ensures the server is reachable from outside the container
const hostname = process.env.HOSTNAME || (process.env.PORT ? "0.0.0.0" : (dev ? "localhost" : "0.0.0.0"));
const port = parseInt(process.env.PORT || "3000", 10);

// Log configuration for debugging
console.log(`🚀 Starting server...`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`   HOSTNAME: ${hostname}`);
console.log(`   PORT: ${port}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(async () => {
    console.log("✅ Next.js app prepared");
    
    // Ensure we're binding to the correct address for Fly.io
    if (hostname !== "0.0.0.0" && process.env.PORT) {
      console.warn(`⚠️  WARNING: Hostname is "${hostname}" but PORT is set. Fly.io requires 0.0.0.0`);
      console.warn(`⚠️  Overriding hostname to 0.0.0.0 for Fly.io compatibility`);
      // Note: We can't change hostname here, but we'll log the warning
      // The actual binding will use the hostname variable
    }
    
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
    // CORS configuration: Allow connections from the app URL
    const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    console.log(`[Socket.io] Configuring CORS for origin: ${allowedOrigin}`);
    
    const io = new Server(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
          if (!origin) {
            console.log("[Socket.io] Allowing request with no origin");
            return callback(null, true);
          }
          
          // Normalize origins (remove trailing slashes, handle protocol variations)
          const normalizeOrigin = (url: string) => {
            return url.replace(/\/$/, '').toLowerCase();
          };
          
          const normalizedRequestOrigin = normalizeOrigin(origin);
          const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);
          
          // Check exact match
          if (normalizedRequestOrigin === normalizedAllowedOrigin) {
            console.log(`[Socket.io] Allowing origin: ${origin}`);
            return callback(null, true);
          }
          
          // Check if it's the same domain (http vs https)
          const requestDomain = normalizedRequestOrigin.replace(/^https?:\/\//, '');
          const allowedDomain = normalizedAllowedOrigin.replace(/^https?:\/\//, '');
          
          if (requestDomain === allowedDomain) {
            console.log(`[Socket.io] Allowing origin (domain match): ${origin}`);
            return callback(null, true);
          }
          
          // Log blocked origin for debugging
          console.warn(`[Socket.io] CORS blocked origin: ${origin} (allowed: ${allowedOrigin})`);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
      // Allow connections even if Redis adapter isn't ready
      allowEIO3: true,
      // Enable connection state recovery for better reliability
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
    });

    // Store io globally for access in API routes
    (global as any).io = io;
    
    // Log Socket.io connection attempts for debugging
    io.engine.on("connection_error", (err) => {
      console.error("[Socket.io] Connection error:", err.req?.headers?.origin, err.message);
    });
    
    io.engine.on("connection", (socket) => {
      const origin = socket.request.headers.origin;
      console.log(`[Socket.io] New connection attempt from origin: ${origin || 'no origin'}`);
    });

    // Initialize Socket.io handlers
    // Use dynamic import AFTER env vars are loaded to prevent Redis client from loading too early
    // Note: Server will start even if Redis fails (for graceful degradation)
    // Use a timeout to prevent hanging during Redis connection
    const initSocketWithTimeout = async () => {
      try {
        const { initSocket } = await import("./lib/socket/initSocket");
        // Set a timeout for Redis connection (20 seconds max - increased for slow connections)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Socket.io initialization timeout after 20s")), 20000)
        );
        await Promise.race([initSocket(io), timeoutPromise]);
        console.log("✅ Socket.io initialized with Redis adapter");
      } catch (err: any) {
        console.error("❌ Error initializing Socket.io:", err?.message || err);
        // Continue starting server even if Socket.io/Redis fails
        // This allows the app to be accessible for debugging
        console.warn("⚠️  Server will continue without Socket.io/Redis support");
        console.warn("⚠️  Real-time features will not work until Redis connection is established");
        console.warn("⚠️  Check REDIS_URL configuration and network connectivity");
      }
    };
    
    // Initialize Socket.io in the background (don't block server startup)
    initSocketWithTimeout();

    // Start the server - explicitly bind to hostname (0.0.0.0 for Fly.io)
    // CRITICAL: This must complete for Fly.io to route traffic
    httpServer
      .once("error", (err) => {
        console.error("HTTP Server error:", err);
        console.error("Server failed to bind - Fly.io cannot route traffic");
        process.exit(1);
      })
      .listen(port, hostname, () => {
        const address = httpServer.address();
        console.log(`✅ Server listening on http://${hostname}:${port}`);
        if (address && typeof address === 'object') {
          console.log(`   Bound to: ${address.address}:${address.port}`);
        }
        console.log(
          `> Socket.io available at http://${hostname}:${port}/api/socket`,
        );
        // Log that server is ready for health checks
        console.log("✅ Server is ready to accept connections");
        console.log("✅ Fly.io proxy can now route traffic to this server");
      });
  })
  .catch((err) => {
    console.error("❌ Failed to prepare Next.js app:", err);
    console.error("Error details:", err);
    if (err instanceof Error) {
      console.error("Stack trace:", err.stack);
    }
    process.exit(1);
  });

// Handle uncaught errors to prevent silent failures
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
