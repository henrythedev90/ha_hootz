import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPresentationsCollection } from "@/lib/db";
import { createSession, setQuestion } from "@/lib/redis/triviaRedis";
import { convertQuestionToTrivia } from "@/lib/questionConverter";
import { TriviaSession } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { ObjectId } from "mongodb";
import { getSocketServer } from "@/lib/socket/server";
import redisPromise from "@/lib/redis/client";
import { gameStateKey } from "@/lib/redis/keys";

// POST - Start a game session from a presentation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { presentationId } = body;

    if (!presentationId) {
      return NextResponse.json(
        { error: "Presentation ID is required" },
        { status: 400 }
      );
    }

    // Get presentation from MongoDB
    const presentationsCollection = await getPresentationsCollection();
    const presentation = await presentationsCollection.findOne({
      _id: new ObjectId(presentationId),
      userId: session.user.id, // Ensure user owns this presentation
    });

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    if (!presentation.questions || presentation.questions.length === 0) {
      return NextResponse.json(
        { error: "Presentation has no questions" },
        { status: 400 }
      );
    }

    // Ensure Socket.io server is initialized
    const io = await getSocketServer();

    // Generate session ID
    const sessionId = generateId();

    // Create Redis session
    const triviaSession: TriviaSession = {
      status: "waiting",
      hostId: session.user.id,
      currentQuestion: 0,
      questionCount: presentation.questions.length,
      createdAt: Date.now(),
    };

    await createSession(sessionId, triviaSession);

    // Initialize game state for Socket.io
    const redis = await redisPromise;
    const initialGameState = {
      status: "WAITING",
      sessionId,
      questionIndex: 0,
      questionCount: presentation.questions.length,
      hostId: session.user.id,
    };
    await redis.set(gameStateKey(sessionId), JSON.stringify(initialGameState));

    // Convert and store questions in Redis
    for (let i = 0; i < presentation.questions.length; i++) {
      const question = presentation.questions[i];
      const triviaQuestion = convertQuestionToTrivia(
        question,
        Date.now(), // Will be updated when question starts
        question.timeLimit || 30 // Default 30 seconds
      );

      if (triviaQuestion) {
        await setQuestion(sessionId, i, {
          ...triviaQuestion,
          startTime: 0, // Will be set when question starts
        });
      }
    }

    // Emit session created event to any connected clients
    io.emit("SESSION_CREATED", {
      sessionId,
      hostId: session.user.id,
      questionCount: presentation.questions.length,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Game session created successfully",
      socketPath: "/api/socket",
    });
  } catch (error: any) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
