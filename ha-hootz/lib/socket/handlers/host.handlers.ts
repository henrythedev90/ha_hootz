import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import { gameStateKey, playersKey, answersKey } from "../../redis/keys";
import {
  updateSessionStatus,
  getSessionIdFromCode,
  getQuestion,
  getSession,
  calculateQuestionScores,
  getDefaultScoringConfig,
  setQuestion,
} from "../../redis/triviaRedis";

async function getRedis() {
  return await redisPromise;
}

export function registerHostHandlers(io: Server, socket: Socket) {
  // Store verified host data for this socket
  const hostData = new Map<string, { userId: string; sessionCode: string }>();

  // Helper function to verify host ownership
  async function verifyHostOwnership(
    sessionCode: string,
    userId: string
  ): Promise<boolean> {
    try {
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) return false;

      const triviaSession = await getSession(sessionId);
      if (!triviaSession) return false;

      // Verify the user is the host of this session
      return triviaSession.hostId === userId;
    } catch (error) {
      console.error("Error verifying host ownership:", error);
      return false;
    }
  }

  // Helper function to check if socket is authorized for a session
  function isAuthorized(sessionCode: string): boolean {
    const hostInfo = hostData.get(socket.id);
    return hostInfo !== undefined && hostInfo.sessionCode === sessionCode;
  }

  // Host joins session room
  socket.on("host-join", async ({ sessionCode, userId }) => {
    try {
      if (!sessionCode || !userId) {
        socket.emit("error", {
          message: "Session code and user ID are required",
        });
        return;
      }

      // Verify host ownership
      const isAuthorized = await verifyHostOwnership(sessionCode, userId);
      if (!isAuthorized) {
        socket.emit("error", {
          message: "Unauthorized: You are not the host of this session",
        });
        socket.disconnect();
        return;
      }

      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("error", { message: "Session code not found" });
        return;
      }

      // Store verified host data
      hostData.set(socket.id, { userId, sessionCode });

      // Join the session room
      socket.join(sessionCode);

      // Get current players
      const redis = await getRedis();
      const players = await redis.hGetAll(playersKey(sessionId));
      const playersList = Object.entries(players).map(([playerId, name]) => ({
        playerId,
        name,
      }));

      // Get current game state from Redis
      const stateStr = await redis.get(gameStateKey(sessionId));
      let gameState = stateStr ? JSON.parse(stateStr) : { status: "WAITING" };

      // If status is WAITING, explicitly reset all game flags for a fresh session
      if (gameState.status === "WAITING") {
        gameState = {
          ...gameState,
          answerRevealed: false,
          correctAnswer: undefined,
          isReviewMode: false,
          question: undefined,
          endAt: undefined,
        };
      }

      // If there's an active question, fetch the question details
      if (
        gameState.status === "QUESTION_ACTIVE" &&
        gameState.questionIndex !== undefined
      ) {
        const question = await getQuestion(sessionId, gameState.questionIndex);
        if (question) {
          gameState.question = question;
        }
      } else if (
        gameState.status === "IN_PROGRESS" &&
        gameState.questionIndex !== undefined
      ) {
        // If game is in progress but no active question, fetch the current question
        const question = await getQuestion(sessionId, gameState.questionIndex);
        if (question) {
          gameState.question = question;
        }
      }

      socket.emit("host-joined", {
        sessionCode,
        players: playersList,
        gameState,
      });
    } catch (error) {
      console.error("Error in host-join:", error);
      socket.emit("error", { message: "Failed to join as host" });
    }
  });

  socket.on("START_GAME", async ({ sessionCode }) => {
    try {
      // Verify host is authorized
      if (!isAuthorized(sessionCode)) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const redis = await getRedis();

      // Get sessionId from sessionCode
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("error", { message: "Session code not found" });
        return;
      }

      // Update session status to "live" (locked)
      await updateSessionStatus(sessionId, "live");

      // Get current game state to preserve scoringConfig
      const currentState = await redis.get(gameStateKey(sessionId));
      const existingState = currentState ? JSON.parse(currentState) : {};

      const state = {
        ...existingState, // Preserve existing properties like scoringConfig
        status: "IN_PROGRESS",
        questionIndex: 0,
        // Explicitly reset game state flags when starting a new game
        answerRevealed: false,
        correctAnswer: undefined,
        isReviewMode: false,
        question: undefined,
        endAt: undefined,
      };

      await redis.set(gameStateKey(sessionId), JSON.stringify(state));

      // Broadcast to room using session code
      io.to(sessionCode).emit("game-started", state);
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error", { message: "Failed to start game" });
    }
  });

  socket.on(
    "START_QUESTION",
    async ({ sessionCode, question, questionIndex }) => {
      try {
        // Verify host is authorized
        if (!isAuthorized(sessionCode)) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        const redis = await getRedis();

        // Get sessionId from sessionCode
        const sessionId = await getSessionIdFromCode(sessionCode);
        if (!sessionId) {
          socket.emit("error", { message: "Session code not found" });
          return;
        }

        // Check if this question has already been answered (prevent restarting answered questions)
        const answers = await redis.hGetAll(
          answersKey(sessionId, questionIndex ?? 0)
        );
        const hasAnswers = Object.keys(answers).length > 0;
        if (hasAnswers) {
          socket.emit("error", {
            message:
              "Cannot start a question that has already been answered. Use navigation to review it.",
          });
          return;
        }

        const startTime = Date.now();
        const endAt = startTime + question.durationMs;

        // Update question in Redis with actual start time
        await setQuestion(sessionId, questionIndex ?? 0, {
          text: question.text,
          A: question.A,
          B: question.B,
          C: question.C,
          D: question.D,
          correct: question.correct,
          startTime: startTime,
          duration: question.durationMs,
        });

        // Get current game state to preserve scoringConfig
        const currentState = await redis.get(gameStateKey(sessionId));
        const existingState = currentState ? JSON.parse(currentState) : {};

        const gameState = {
          ...existingState, // Preserve existing properties like scoringConfig
          status: "QUESTION_ACTIVE",
          question,
          questionIndex: questionIndex ?? 0, // Default to 0 if not provided
          endAt,
        };

        await redis.set(gameStateKey(sessionId), JSON.stringify(gameState));

        // Broadcast to room using session code
        io.to(sessionCode).emit("question-started", {
          question,
          questionIndex: gameState.questionIndex,
          endAt,
        });
      } catch (error) {
        console.error("Error starting question:", error);
        socket.emit("error", { message: "Failed to start question" });
      }
    }
  );

  socket.on("CANCEL_SESSION", async ({ sessionCode }) => {
    try {
      // Verify host is authorized
      if (!isAuthorized(sessionCode)) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const redis = await getRedis();

      // Get sessionId from sessionCode
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("error", { message: "Session code not found" });
        return;
      }

      // Update session status to "ended"
      await updateSessionStatus(sessionId, "ended");

      // Update game state to ended
      const endedState = {
        status: "ENDED",
      };
      await redis.set(gameStateKey(sessionId), JSON.stringify(endedState));

      // Broadcast to all players in the session (using sessionCode as room name)
      const cancelMessage = {
        sessionCode,
        message: "The host has cancelled this session",
      };
      io.to(sessionCode).emit("session-cancelled", cancelMessage);

      // Notify host
      socket.emit("session-cancelled", {
        sessionCode,
      });
    } catch (error) {
      console.error("Error cancelling session:", error);
      socket.emit("error", { message: "Failed to cancel session" });
    }
  });

  socket.on("REVEAL_ANSWER", async ({ sessionCode, questionIndex }) => {
    try {
      // Verify host is authorized
      if (!isAuthorized(sessionCode)) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const redis = await getRedis();
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("error", { message: "Session code not found" });
        return;
      }

      // Get question to find correct answer
      const question = await getQuestion(sessionId, questionIndex);
      if (!question) {
        socket.emit("error", { message: "Question not found" });
        return;
      }

      // Mark unanswered questions as wrong (NO_ANSWER)
      const allPlayers = await redis.hGetAll(playersKey(sessionId));
      const playerIds = Object.keys(allPlayers);
      const submittedAnswers = await redis.hGetAll(
        answersKey(sessionId, questionIndex)
      );
      const playersWhoAnswered = Object.keys(submittedAnswers);

      // For players who didn't answer, mark as NO_ANSWER
      for (const playerId of playerIds) {
        if (!playersWhoAnswered.includes(playerId)) {
          await redis.hSet(
            answersKey(sessionId, questionIndex),
            playerId,
            "NO_ANSWER"
          );
        }
      }

      // Get game state to access scoring config
      const currentState = await redis.get(gameStateKey(sessionId));
      const gameState = currentState ? JSON.parse(currentState) : {};
      const scoringConfig =
        gameState.scoringConfig || getDefaultScoringConfig();

      // Calculate and store scores for all players
      const scores = await calculateQuestionScores(
        sessionId,
        questionIndex,
        question.correct,
        question.startTime,
        question.duration,
        scoringConfig
      );

      // Update game state to show answer is revealed and question is ended
      await redis.set(
        gameStateKey(sessionId),
        JSON.stringify({
          ...gameState,
          status: "QUESTION_ENDED",
          answerRevealed: true,
          correctAnswer: question.correct,
        })
      );

      // Broadcast to all players
      io.to(sessionCode).emit("answer-revealed", {
        questionIndex,
        correctAnswer: question.correct,
      });

      // Also emit question-ended event to ensure all clients update status
      io.to(sessionCode).emit("question-ended", {
        questionIndex,
      });
    } catch (error) {
      console.error("Error revealing answer:", error);
      socket.emit("error", { message: "Failed to reveal answer" });
    }
  });

  socket.on("NAVIGATE_QUESTION", async ({ sessionCode, questionIndex }) => {
    try {
      // Verify host is authorized
      if (!isAuthorized(sessionCode)) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const redis = await getRedis();
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("error", { message: "Session code not found" });
        return;
      }

      // Get session to validate question index
      const session = await getSession(sessionId);
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      if (questionIndex < 0 || questionIndex >= session.questionCount) {
        socket.emit("error", { message: "Invalid question index" });
        return;
      }

      // Get current game state
      const currentState = await redis.get(gameStateKey(sessionId));
      const gameState = currentState ? JSON.parse(currentState) : {};

      // Check if question is active (navigation disabled during active question)
      if (gameState.status === "QUESTION_ACTIVE") {
        socket.emit("error", {
          message: "Cannot navigate while question is active",
        });
        return;
      }

      // Get question data from Redis
      const question = await getQuestion(sessionId, questionIndex);
      if (!question) {
        socket.emit("error", {
          message: `Question ${
            questionIndex + 1
          } not found in Redis. This may happen if questions expired. Please refresh the page.`,
        });
        return;
      }

      // Check if answers exist for this question (indicates it was already answered)
      const answers = await redis.hGetAll(answersKey(sessionId, questionIndex));
      const hasAnswers = Object.keys(answers).length > 0;

      // If a question has answers, it means it's been answered and should be in review mode
      // This applies whether navigating forward or backward to an answered question
      const isReviewMode = hasAnswers;

      // Update game state (preserve scoringConfig and other properties)
      const newState = {
        ...gameState, // Preserve existing properties like scoringConfig
        status: isReviewMode ? "QUESTION_ENDED" : "IN_PROGRESS",
        questionIndex,
        questionCount: session.questionCount,
        question: {
          text: question.text,
          A: question.A,
          B: question.B,
          C: question.C,
          D: question.D,
          correct: question.correct,
        },
        answerRevealed: isReviewMode, // Show answer if it's a previous question
        correctAnswer: isReviewMode ? question.correct : undefined,
        isReviewMode: isReviewMode, // Store review mode flag in Redis
      };

      await redis.set(gameStateKey(sessionId), JSON.stringify(newState));

      // Broadcast to all players
      io.to(sessionCode).emit("question-navigated", {
        questionIndex,
        question: newState.question,
        answerRevealed: isReviewMode,
        correctAnswer: isReviewMode ? question.correct : undefined,
        isReviewMode: isReviewMode, // Flag to indicate this is review mode
      });

      // Notify host with the same data structure
      socket.emit("question-navigated", {
        questionIndex,
        question: newState.question,
        answerRevealed: isReviewMode,
        correctAnswer: isReviewMode ? question.correct : undefined,
        isReviewMode: isReviewMode, // Flag to indicate this is review mode
      });
    } catch (error) {
      console.error("Error navigating question:", error);
      socket.emit("error", { message: "Failed to navigate question" });
    }
  });

  socket.on("END_QUESTION", async ({ sessionCode, questionIndex }) => {
    try {
      // Verify host is authorized
      if (!isAuthorized(sessionCode)) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const redis = await getRedis();
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("error", { message: "Session code not found" });
        return;
      }

      // Mark unanswered questions as wrong (NO_ANSWER)
      const allPlayers = await redis.hGetAll(playersKey(sessionId));
      const playerIds = Object.keys(allPlayers);
      const submittedAnswers = await redis.hGetAll(
        answersKey(sessionId, questionIndex)
      );
      const playersWhoAnswered = Object.keys(submittedAnswers);

      // For players who didn't answer, mark as NO_ANSWER
      for (const playerId of playerIds) {
        if (!playersWhoAnswered.includes(playerId)) {
          await redis.hSet(
            answersKey(sessionId, questionIndex),
            playerId,
            "NO_ANSWER"
          );
        }
      }

      // Get game state to access scoring config and question
      const currentState = await redis.get(gameStateKey(sessionId));
      const gameState = currentState ? JSON.parse(currentState) : {};
      const scoringConfig =
        gameState.scoringConfig || getDefaultScoringConfig();

      // Get question to calculate scores
      const question = await getQuestion(sessionId, questionIndex);
      if (question) {
        // Calculate and store scores for all players
        const scores = await calculateQuestionScores(
          sessionId,
          questionIndex,
          question.correct,
          question.startTime,
          question.duration,
          scoringConfig
        );
      } else {
        console.warn(
          `⚠️ Question ${questionIndex} not found for scoring calculation`
        );
      }

      // Update game state to mark question as ended
      await redis.set(
        gameStateKey(sessionId),
        JSON.stringify({
          ...gameState,
          status: "QUESTION_ENDED",
        })
      );

      // Broadcast to all players
      io.to(sessionCode).emit("question-ended", {
        questionIndex,
      });
    } catch (error) {
      console.error("Error ending question:", error);
      socket.emit("error", { message: "Failed to end question" });
    }
  });

  socket.on("REVEAL_WINNER", async ({ sessionCode, leaderboard }) => {
    try {
      // Verify host is authorized
      if (!isAuthorized(sessionCode)) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      // Broadcast winner-revealed event to all players
      io.to(sessionCode).emit("winner-revealed", {
        leaderboard,
      });
    } catch (error) {
      console.error("Error revealing winner:", error);
      socket.emit("error", { message: "Failed to reveal winner" });
    }
  });

  // Clean up host data on disconnect
  socket.on("disconnect", () => {
    hostData.delete(socket.id);
  });
}
