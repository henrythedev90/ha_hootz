import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import { gameStateKey, playersKey } from "../../redis/keys";
import {
  //   getSessionCodeFromId,
  updateSessionStatus,
  getSessionIdFromCode,
  getQuestion,
  getSession,
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
      console.log(`👑 Host ${userId} joined session ${sessionCode}`);

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

      const state = {
        status: "IN_PROGRESS",
        questionIndex: 0,
      };

      await redis.set(gameStateKey(sessionId), JSON.stringify(state));

      // Broadcast to room using session code
      io.to(sessionCode).emit("game-started", state);
      console.log(`🎮 Game started for session ${sessionCode}`);
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

        const endAt = Date.now() + question.durationMs;

        const gameState = {
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
        console.log(
          `❓ Question ${gameState.questionIndex} started for session ${sessionCode}`
        );
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
      console.log(
        `📢 Broadcasting session-cancelled to room ${sessionCode} (${
          io.sockets.adapter.rooms.get(sessionCode)?.size || 0
        } sockets)`
      );

      // Notify host
      socket.emit("session-cancelled", {
        sessionCode,
      });

      console.log(`❌ Session ${sessionCode} cancelled by host`);
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

      // Update game state to show answer is revealed and question is ended
      const currentState = await redis.get(gameStateKey(sessionId));
      const gameState = currentState ? JSON.parse(currentState) : {};

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

      console.log(
        `✅ Answer revealed for question ${questionIndex} in session ${sessionCode}`
      );
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

      // Update game state
      const newState = {
        status: "IN_PROGRESS",
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
        answerRevealed: false,
      };

      await redis.set(gameStateKey(sessionId), JSON.stringify(newState));

      // Broadcast to all players
      io.to(sessionCode).emit("question-navigated", {
        questionIndex,
        question: newState.question,
      });

      // Notify host
      socket.emit("question-navigated", {
        questionIndex,
        question: newState.question,
      });

      console.log(
        `📄 Navigated to question ${questionIndex} in session ${sessionCode}`
      );
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

      // Update game state to mark question as ended
      const currentState = await redis.get(gameStateKey(sessionId));
      const gameState = currentState ? JSON.parse(currentState) : {};

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

      console.log(
        `⏹️ Question ${questionIndex} ended in session ${sessionCode}`
      );
    } catch (error) {
      console.error("Error ending question:", error);
      socket.emit("error", { message: "Failed to end question" });
    }
  });

  // Clean up host data on disconnect
  socket.on("disconnect", () => {
    hostData.delete(socket.id);
    console.log(`👑 Host disconnected: ${socket.id}`);
  });
}
