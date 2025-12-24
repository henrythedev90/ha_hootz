import { NextRequest, NextResponse } from "next/server";
import { getSessionIdFromCode } from "@/lib/redis/triviaRedis";
import redisPromise from "@/lib/redis/client";
import { playersKey } from "@/lib/redis/keys";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const { sessionCode } = await params;
    const body = await request.json();
    const { playerName } = body;

    if (!playerName || !playerName.trim()) {
      return NextResponse.json(
        { isAvailable: false, error: "Player name is required" },
        { status: 400 }
      );
    }

    // Get sessionId from code
    const sessionId = await getSessionIdFromCode(sessionCode);
    if (!sessionId) {
      return NextResponse.json(
        { isAvailable: false, error: "Invalid or expired session code" },
        { status: 404 }
      );
    }

    // Get all players in session
    const redis = await redisPromise;
    const players = await redis.hGetAll(playersKey(sessionId));

    // Check for duplicate names (case-insensitive)
    const normalizedName = playerName.trim().toLowerCase();
    const isDuplicate = Object.values(players).some(
      (name) => name.toLowerCase() === normalizedName
    );

    return NextResponse.json({
      isAvailable: !isDuplicate,
      error: isDuplicate
        ? "This name is already taken in this session"
        : undefined,
    });
  } catch (error: any) {
    console.error("Error checking name:", error);
    return NextResponse.json(
      { isAvailable: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
