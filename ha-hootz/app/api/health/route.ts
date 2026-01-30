import { NextResponse } from "next/server";

/**
 * Health check endpoint for Fly.io
 * This endpoint should be lightweight and not depend on external services
 * to ensure health checks pass even if Redis/MongoDB are temporarily unavailable
 */
export async function GET() {
  try {
    // Simple health check - just verify the server is responding
    // Don't check Redis/MongoDB here as they might be temporarily unavailable
    // and we want health checks to pass so the server can start
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
