import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSessionIdFromCode,
  getSession as getTriviaSession,
  getAnswerCount,
  getAnswerDistribution,
  getLeaderboard,
} from "@/lib/redis/triviaRedis";
import redisPromise from "@/lib/redis/client";
import { playersKey, answersKey } from "@/lib/redis/keys";

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
    const searchParams = request.nextUrl.searchParams;
    const questionIndex = searchParams.get("questionIndex");

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

    // Get player count
    const players = await redis.hGetAll(playersKey(sessionId));
    const playerCount = Object.keys(players).length;

    // Get answer stats if questionIndex is provided
    let answerCount = 0;
    let answerDistribution = { A: 0, B: 0, C: 0, D: 0 };
    let playersWithAnswers: string[] = [];

    if (questionIndex !== null) {
      const index = parseInt(questionIndex, 10);
      if (!isNaN(index)) {
        answerCount = await getAnswerCount(sessionId, index);
        answerDistribution = await getAnswerDistribution(sessionId, index);

        // Get list of playerIds who have submitted answers
        const answers = await redis.hGetAll(answersKey(sessionId, index));
        playersWithAnswers = Object.keys(answers);
      }
    }

    // Get leaderboard scores
    const leaderboard = await getLeaderboard(sessionId, 100); // Get top 100 players
    const playerScores: Record<string, number> = {};
    leaderboard.forEach((entry) => {
      playerScores[entry.value] = entry.score;
    });

    return NextResponse.json({
      success: true,
      playerCount,
      answerCount,
      answerDistribution,
      playersWithAnswers,
      playerScores,
    });
  } catch (error: unknown) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
