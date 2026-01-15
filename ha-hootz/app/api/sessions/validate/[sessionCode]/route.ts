import { NextRequest, NextResponse } from "next/server";
import {
  isSessionCodeValid,
  getSessionIdFromCode,
  getSession,
} from "@/lib/redis/triviaRedis";
import { getSession as getAuthSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const { sessionCode } = await params;
    const searchParams = request.nextUrl.searchParams;
    const isHostCheck = searchParams.get("hostCheck") === "true";

    // Validate format
    if (!/^\d{6}$/.test(sessionCode)) {
      return NextResponse.json(
        { isValid: false, error: "Invalid session code format" },
        { status: 400 }
      );
    }

    // Check if code exists and is active
    const isValid = await isSessionCodeValid(sessionCode);
    if (!isValid) {
      return NextResponse.json(
        { isValid: false, error: "Session code not found or expired" },
        { status: 200 }
      );
    }

    // Get session details
    const sessionId = await getSessionIdFromCode(sessionCode);
    if (!sessionId) {
      return NextResponse.json(
        { isValid: false, error: "Session not found" },
        { status: 200 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { isValid: false, error: "Session not found" },
        { status: 200 }
      );
    }

    // If this is a host check, verify the user is the host
    if (isHostCheck) {
      const authSession = await getAuthSession();
      if (!authSession?.user?.id) {
        return NextResponse.json(
          { isValid: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      if (session.hostId !== authSession.user.id) {
        return NextResponse.json(
          { isValid: false, error: "Forbidden - Not the host" },
          { status: 403 }
        );
      }

      // Host can always validate their own session, even if live or ended
      return NextResponse.json({
        isValid: true,
        sessionId,
        sessionStatus: session.status,
        hostId: session.hostId,
      });
    }

    // For player joins, only block if session has ended
    // Allow joining during "live" sessions (players can join anytime)
    if (session.status === "ended") {
      return NextResponse.json(
        {
          isValid: false,
          sessionStatus: session.status,
          error: "This game session has ended. The host has closed the game.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      isValid: true,
      sessionId,
      sessionStatus: session.status,
      hostId: session.hostId,
    });
  } catch (error: any) {
    console.error("Error validating session code:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
