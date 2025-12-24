import { NextResponse } from "next/server";
import { getSocketServer } from "@/lib/socket/server";

export const runtime = "nodejs"; // Required for Socket.io in Next.js

export async function GET() {
  try {
    // Get Socket.io server instance (initialized in server.js)
    const io = getSocketServer();

    return NextResponse.json({
      ok: true,
      message: "Socket.io server is running",
      path: "/api/socket",
      connected: io.engine.clientsCount > 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Socket.io server not initialized",
        message: "Make sure you're using the custom server (npm run dev)",
      },
      { status: 503 }
    );
  }
}
