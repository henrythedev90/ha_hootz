import { NextRequest, NextResponse } from "next/server";
import { getSessionIdFromCode } from "@/lib/redis/triviaRedis";
import { getPlayers } from "@/lib/redis/triviaRedis";
import redisPromise from "@/lib/redis/client";
import { playersKey } from "@/lib/redis/keys";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const { sessionCode } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { duplicate: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Get sessionId from code
    const sessionId = await getSessionIdFromCode(sessionCode);
    if (!sessionId) {
      return NextResponse.json(
        { duplicate: false, error: "Session code not found" },
        { status: 404 }
      );
    }

    // Get all players in session
    const redis = await redisPromise;
    const players = await redis.hGetAll(playersKey(sessionId));

    // Check for duplicate names (case-insensitive)
    const normalizedName = name.trim().toLowerCase();
    const isDuplicate = Object.values(players).some(
      (playerName) => playerName.toLowerCase() === normalizedName
    );

    return NextResponse.json({
      duplicate: isDuplicate,
      error: isDuplicate
        ? "This name is already taken in this session"
        : undefined,
    });
  } catch (error: any) {
    console.error("Error checking name:", error);
    return NextResponse.json(
      { duplicate: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
