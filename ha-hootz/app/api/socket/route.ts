import { NextResponse } from "next/server";
import { getSocketServer } from "@/lib/socket/server";

export const runtime = "nodejs"; // Required for Socket.io in Next.js

export async function GET() {
  // Ensure Socket.io server is initialized
  const io = await getSocketServer();

  return NextResponse.json({
    ok: true,
    message: "Socket.io server is running",
    path: "/api/socket",
    connected: io.engine.clientsCount > 0,
  });
}
