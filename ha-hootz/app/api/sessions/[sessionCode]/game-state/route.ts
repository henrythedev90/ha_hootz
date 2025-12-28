import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSessionIdFromCode,
  getSession as getTriviaSession,
  getQuestion,
} from "@/lib/redis/triviaRedis";
import redisPromise from "@/lib/redis/client";
import { gameStateKey } from "@/lib/redis/keys";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionCode } = await params;
    const sessionId = await getSessionIdFromCode(sessionCode);

    if (!sessionId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify host owns this session
    const triviaSession = await getTriviaSession(sessionId);
    if (!triviaSession || triviaSession.hostId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const redis = await redisPromise;

    // Get current game state from Redis
    const stateStr = await redis.get(gameStateKey(sessionId));
    let gameState = stateStr ? JSON.parse(stateStr) : { status: "WAITING" };

    // If there's an active question or game in progress, fetch the question details
    if (
      (gameState.status === "QUESTION_ACTIVE" ||
        gameState.status === "IN_PROGRESS") &&
      gameState.questionIndex !== undefined
    ) {
      const question = await getQuestion(sessionId, gameState.questionIndex);
      if (question) {
        gameState.question = question;
      }
    }

    return NextResponse.json({
      success: true,
      gameState,
    });
  } catch (error: any) {
    console.error("Error fetching game state:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
