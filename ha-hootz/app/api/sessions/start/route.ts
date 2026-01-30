import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPresentationsCollection } from "@/lib/db";
import {
  createSession,
  setQuestion,
  createSessionCode,
} from "@/lib/redis/triviaRedis";
import { convertQuestionToTrivia } from "@/lib/questionConverter";
import { TriviaSession } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { ObjectId } from "mongodb";
import { getSocketServer } from "@/lib/socket/server";
import redisPromise from "@/lib/redis/client";
import { gameStateKey } from "@/lib/redis/keys";
import { getDefaultScoringConfig } from "@/lib/redis/triviaRedis";
import { Presentation } from "@/types";

// POST - Start a game session from a presentation
export async function POST(request: NextRequest) {
  try {
    console.log("[sessions/start] Request received");
    const session = await getSession();

    if (!session?.user?.id) {
      console.log("[sessions/start] Unauthorized - no session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[sessions/start] User authenticated: ${session.user.id}`);
    const body = await request.json();
    const { presentationId } = body;

    if (!presentationId) {
      console.log("[sessions/start] Missing presentationId");
      return NextResponse.json(
        { error: "Presentation ID is required" },
        { status: 400 }
      );
    }

    console.log(`[sessions/start] Looking up presentation: ${presentationId}`);
    // Get presentation from MongoDB
    const presentationsCollection = await getPresentationsCollection();
    const presentation = await presentationsCollection.findOne({
      _id: new ObjectId(presentationId),
      userId: session.user.id, // Ensure user owns this presentation
    });

    if (!presentation) {
      console.log(`[sessions/start] Presentation not found: ${presentationId}`);
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    if (!presentation.questions || presentation.questions.length === 0) {
      console.log(`[sessions/start] Presentation has no questions: ${presentationId}`);
      return NextResponse.json(
        { error: "Presentation has no questions" },
        { status: 400 }
      );
    }

    console.log(`[sessions/start] Getting Socket.io server instance`);
    // Get Socket.io server instance (initialized in server.js)
    let io;
    try {
      io = getSocketServer();
    } catch (err: unknown) {
      console.error("[sessions/start] Socket.io server not available:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Real-time server not available. Please try again." },
        { status: 503 }
      );
    }

    // Generate session ID
    const sessionId = generateId();
    console.log(`[sessions/start] Generated session ID: ${sessionId}`);

    // Create Redis session
    const triviaSession: TriviaSession = {
      status: "waiting",
      hostId: session.user.id,
      currentQuestion: 0,
      questionCount: presentation.questions.length,
      createdAt: Date.now(),
    };

    console.log(`[sessions/start] Creating Redis session`);
    try {
      await createSession(sessionId, triviaSession);
    } catch (err: unknown) {
      console.error("[sessions/start] Failed to create Redis session:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to create game session. Redis may be unavailable." },
        { status: 503 }
      );
    }

    // Generate 6-digit session code and store mapping (1 hour TTL)
    console.log(`[sessions/start] Generating session code`);
    let sessionCode;
    try {
      sessionCode = await createSessionCode(sessionId, 60 * 60);
    } catch (err: unknown) {
      console.error("[sessions/start] Failed to create session code:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to generate session code. Redis may be unavailable." },
        { status: 503 }
      );
    }

    // Get scoring config from presentation or use defaults
    const scoringConfig =
      (presentation as unknown as Presentation).scoringConfig ||
      getDefaultScoringConfig();

    // Initialize game state for Socket.io
    console.log(`[sessions/start] Initializing game state in Redis`);
    let redis;
    try {
      redis = await redisPromise;
    } catch (err: unknown) {
      console.error("[sessions/start] Failed to get Redis client:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Redis connection unavailable. Please try again." },
        { status: 503 }
      );
    }

    const initialGameState = {
      status: "WAITING",
      sessionId,
      questionIndex: 0,
      questionCount: presentation.questions.length,
      hostId: session.user.id,
      presentationId: presentationId,
      scoringConfig: scoringConfig,
      // Explicitly reset all game state flags for a fresh session
      answerRevealed: false,
      correctAnswer: undefined,
      isReviewMode: false,
      question: undefined,
      endAt: undefined,
    };
    
    try {
      await redis.set(gameStateKey(sessionId), JSON.stringify(initialGameState));
    } catch (err: unknown) {
      console.error("[sessions/start] Failed to set game state:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to initialize game state. Redis may be unavailable." },
        { status: 503 }
      );
    }

    // Convert and store questions in Redis
    console.log(`[sessions/start] Storing ${presentation.questions.length} questions in Redis`);
    try {
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
    } catch (err: unknown) {
      console.error("[sessions/start] Failed to store questions:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to store questions. Redis may be unavailable." },
        { status: 503 }
      );
    }

    // Emit session created event to any connected clients
    try {
      io.emit("SESSION_CREATED", {
        sessionId,
        hostId: session.user.id,
        questionCount: presentation.questions.length,
      });
    } catch (err: unknown) {
      console.error("[sessions/start] Failed to emit event (non-critical):", err instanceof Error ? err.message : err);
      // Don't fail the request if emit fails - session is still created
    }

    console.log(`[sessions/start] Session created successfully: ${sessionCode}`);
    return NextResponse.json({
      success: true,
      sessionId,
      sessionCode,
      message: "Game session created successfully",
      joinUrl: `/join/${sessionCode}`,
    });
  } catch (error: unknown) {
    console.error("[sessions/start] Unexpected error:", error);
    console.error("[sessions/start] Error stack:", error instanceof Error ? error.stack : "");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
