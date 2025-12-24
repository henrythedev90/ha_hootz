import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSessionIdFromCode,
  getQuestion,
  getSession as getTriviaSession,
} from "@/lib/redis/triviaRedis";

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

    // Get all questions
    const questions = [];
    for (let i = 0; i < triviaSession.questionCount; i++) {
      const question = await getQuestion(sessionId, i);
      if (question) {
        questions.push({ ...question, index: i });
      }
    }

    return NextResponse.json({
      success: true,
      questions,
      questionCount: triviaSession.questionCount,
    });
  } catch (error: any) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
