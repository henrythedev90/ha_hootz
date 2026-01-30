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
// CRITICAL: Always use 0.0.0.0 (hardcoded for Fly.io compatibility)
// Don't pass hostname/port to next() - let our custom server handle it
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "0.0.0.0"; // Always 0.0.0.0 for Fly.io compatibility

// Log configuration for debugging
console.log(`🚀 Starting server...`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`   HOST: ${HOST}`);
console.log(`   PORT: ${PORT}`);

const app = next({ dev });
const handle = app.getRequestHandler();

// Add timeout to ensure server starts even if prepare takes too long
const prepareTimeout = setTimeout(() => {
  console.error("❌ Next.js prepare() timed out after 30 seconds");
  console.error("❌ This may indicate a build or initialization issue");
  process.exit(1);
}, 30000);

app
  .prepare()
  .then(async () => {
    clearTimeout(prepareTimeout);
    console.log("✅ Next.js app prepared");
    
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
    // CORS: NEXTAUTH_URL is primary; ADDITIONAL_ORIGINS (comma-separated) for custom domain + fly.dev
    const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const additionalOrigins = (process.env.ADDITIONAL_ORIGINS || "")
      .split(",")
      .map((o) => o.trim().toLowerCase().replace(/\/$/, ""))
      .filter(Boolean);
    const isDevelopment = process.env.NODE_ENV !== "production";

    console.log(`[Socket.io] Configuring CORS for origin: ${allowedOrigin}`);
    if (additionalOrigins.length) {
      console.log(`[Socket.io] Additional allowed origins: ${additionalOrigins.join(", ")}`);
    }
    console.log(`[Socket.io] Environment: ${isDevelopment ? "development" : "production"}`);

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

          // In development, be more lenient - allow localhost variations
          if (isDevelopment) {
            const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
            if (isLocalhost) {
              console.log(`[Socket.io] Allowing localhost origin in development: ${origin}`);
              return callback(null, true);
            }
          }

          // Normalize origins (remove trailing slashes, handle protocol variations)
          const normalizeOrigin = (url: string) => {
            return url.replace(/\/$/, "").toLowerCase();
          };

          const normalizedRequestOrigin = normalizeOrigin(origin);
          const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);

          // Check exact match (primary NEXTAUTH_URL)
          if (normalizedRequestOrigin === normalizedAllowedOrigin) {
            console.log(`[Socket.io] Allowing origin (exact match): ${origin}`);
            return callback(null, true);
          }

          // Check additional origins (e.g. custom domain, fly.dev during migration)
          if (additionalOrigins.some((o) => normalizeOrigin(o) === normalizedRequestOrigin)) {
            console.log(`[Socket.io] Allowing origin (additional): ${origin}`);
            return callback(null, true);
          }

          // Check if it's the same domain (http vs https)
          const requestDomain = normalizedRequestOrigin.replace(/^https?:\/\//, "");
          const allowedDomain = normalizedAllowedOrigin.replace(/^https?:\/\//, "");

          if (requestDomain === allowedDomain) {
            console.log(`[Socket.io] Allowing origin (domain match): ${origin}`);
            return callback(null, true);
          }

          // In development, allow any origin to help with debugging
          if (isDevelopment) {
            console.log(`[Socket.io] Allowing origin in development mode: ${origin}`);
            return callback(null, true);
          }

          // Log blocked origin for debugging
          console.error(`[Socket.io] ❌ CORS blocked origin: ${origin}`);
          console.error(`[Socket.io] ❌ Allowed origin: ${allowedOrigin}`);
          console.error(`[Socket.io] ❌ Request domain: ${requestDomain}`);
          console.error(`[Socket.io] ❌ Allowed domain: ${allowedDomain}`);
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
    (global as typeof globalThis & { io?: typeof io }).io = io;
    
    // Log Socket.io connection attempts for debugging
    io.engine.on("connection_error", (err) => {
      const origin = err.req?.headers?.origin || "no origin";
      const userAgent = err.req?.headers?.["user-agent"] || "unknown";
      console.error(`[Socket.io] Connection error from ${origin}:`, err.message);
      console.error(`[Socket.io] User-Agent: ${userAgent}`);
      if (err.context) {
        console.error(`[Socket.io] Error context:`, err.context);
      }
    });
    
    io.engine.on("connection", (socket) => {
      const origin = socket.request.headers.origin || "no origin";
      const userAgent = socket.request.headers["user-agent"] || "unknown";
      console.log(`[Socket.io] New connection attempt from origin: ${origin}`);
      console.log(`[Socket.io] User-Agent: ${userAgent.substring(0, 50)}...`);
    });
    
    // Log successful connections
    io.on("connection", (socket) => {
      console.log(`[Socket.io] ✅ Client connected: ${socket.id}`);
      socket.on("disconnect", (reason) => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}, reason: ${reason}`);
      });
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
      } catch (err: unknown) {
        console.error(
          "❌ Error initializing Socket.io:",
          err instanceof Error ? err.message : String(err)
        );
        // Continue starting server even if Socket.io/Redis fails
        // This allows the app to be accessible for debugging
        console.warn("⚠️  Server will continue without Socket.io/Redis support");
        console.warn("⚠️  Real-time features will not work until Redis connection is established");
        console.warn("⚠️  Check REDIS_URL configuration and network connectivity");
      }
    };
    
    // Start the server FIRST - this is critical for Fly.io health checks and TLS validation
    // CRITICAL: Must bind to 0.0.0.0 for Fly.io to route traffic
    // CRITICAL: Server must listen BEFORE Socket.io initialization for health checks
    console.log(`🔧 Binding server to ${HOST}:${PORT}...`);
    
    // Bind server immediately - don't wait for anything else
    httpServer.listen(PORT, HOST, () => {
      const address = httpServer.address();
      console.log(`✅ Server listening on http://${HOST}:${PORT}`);
      if (address && typeof address === 'object') {
        console.log(`   Bound to: ${address.address}:${address.port}`);
        // Verify the binding is correct
        if (address.address !== "0.0.0.0" && address.address !== "::") {
          console.error(`❌ WARNING: Server bound to ${address.address} but Fly.io requires 0.0.0.0`);
          process.exit(1);
        } else {
          console.log(`✅ Binding verified: ${address.address} is correct for Fly.io`);
        }
        // Log port explicitly for Fly.io validation
        console.log(`✅ Fly.io internal_port mapping: ${address.port} -> 80/443`);
      }
      console.log(`> Socket.io available at http://${HOST}:${PORT}/api/socket`);
      console.log(`> Health check available at http://${HOST}:${PORT}/api/health`);
      console.log("✅ Server is ready to accept connections");
      console.log("✅ Fly.io proxy can now route traffic to this server");
      console.log("✅ TLS certificate validation can proceed");
    });
    
    // Handle binding errors
    httpServer.once("error", (err: unknown) => {
      console.error("❌ HTTP Server error:", err);
      console.error("❌ Server failed to bind - Fly.io cannot route traffic");
      console.error(`❌ Attempted to bind to: ${HOST}:${PORT}`);
      if (err instanceof Error && "code" in err && err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    // Initialize Socket.io in the background AFTER server starts listening
    // This ensures the server is ready for health checks even if Socket.io fails
    initSocketWithTimeout();
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
