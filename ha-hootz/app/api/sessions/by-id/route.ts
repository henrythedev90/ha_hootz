import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSession as getRedisSession,
  updateSessionStatus,
} from "@/lib/redis/triviaRedis";

// GET - Get session status (accepts sessionId)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redisSession = await getRedisSession(sessionId);

    if (!redisSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only host can view session details
    if (redisSession.hostId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      session: redisSession,
    });
  } catch (error: any) {
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update session status (accepts sessionId)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["waiting", "live", "ended"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'waiting', 'live', or 'ended'" },
        { status: 400 }
      );
    }

    const redisSession = await getRedisSession(sessionId);

    if (!redisSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only host can update session
    if (redisSession.hostId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await updateSessionStatus(
      sessionId,
      status as "waiting" | "live" | "ended"
    );

    return NextResponse.json({
      success: true,
      message: "Session status updated",
      status,
    });
  } catch (error: any) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
