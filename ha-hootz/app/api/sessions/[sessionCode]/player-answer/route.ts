import { NextRequest, NextResponse } from "next/server";
import {
  getSessionIdFromCode,
} from "@/lib/redis/triviaRedis";
import redisPromise from "@/lib/redis/client";
import { answersKey } from "@/lib/redis/keys";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const { sessionCode } = await params;
    const searchParams = request.nextUrl.searchParams;
    const questionIndex = searchParams.get("questionIndex");
    const playerId = searchParams.get("playerId");

    if (!questionIndex || !playerId) {
      return NextResponse.json(
        { error: "questionIndex and playerId are required" },
        { status: 400 }
      );
    }

    const sessionId = await getSessionIdFromCode(sessionCode);
    if (!sessionId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const redis = await redisPromise;
    const answer = await redis.hGet(
      answersKey(sessionId, parseInt(questionIndex, 10)),
      playerId
    );

    return NextResponse.json({
      success: true,
      answer: answer || null,
    });
  } catch (error: unknown) {
    console.error("Error fetching player answer:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

