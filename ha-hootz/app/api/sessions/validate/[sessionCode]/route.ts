import { NextRequest, NextResponse } from "next/server";
import {
  isSessionCodeValid,
  getSessionIdFromCode,
  getSession,
} from "@/lib/redis/triviaRedis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const { sessionCode } = await params;

    // Validate format
    if (!/^\d{6}$/.test(sessionCode)) {
      return NextResponse.json(
        { valid: false, error: "Invalid session code format" },
        { status: 400 }
      );
    }

    // Check if code exists and is active
    const isValid = await isSessionCodeValid(sessionCode);
    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: "Session code not found or expired" },
        { status: 404 }
      );
    }

    // Get session details
    const sessionId = await getSessionIdFromCode(sessionCode);
    if (!sessionId) {
      return NextResponse.json(
        { valid: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { valid: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if session is locked/live (prevent new joins)
    if (session.status === "live") {
      return NextResponse.json(
        { valid: false, error: "Game has already started. New players cannot join." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      sessionId,
      status: session.status,
    });
  } catch (error: any) {
    console.error("Error validating session code:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

