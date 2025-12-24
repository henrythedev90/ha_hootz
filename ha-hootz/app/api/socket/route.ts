import { NextResponse } from "next/server";
import { Server } from "socket.io";
import { initSocket } from "@/lib/socket/initSocket";

export const runtime = "nodejs"; // Required for Socket.io in Next.js

// Store Socket.io server instance globally to reuse across requests
declare global {
  var io: Server | undefined;
}

export async function GET() {
  // Initialize Socket.io server only once
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

  return NextResponse.json({
    ok: true,
    message: "Socket.io server is running",
    path: "/api/socket",
  });
}
