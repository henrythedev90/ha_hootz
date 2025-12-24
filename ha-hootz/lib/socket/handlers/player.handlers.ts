import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import {
  gameStateKey,
  playersKey,
  answersKey,
  playerSocketKey,
} from "../../redis/keys";
import {
  getSessionIdFromCode,
  getSession,
  addPlayer as addPlayerToSession,
} from "../../redis/triviaRedis";

async function getRedis() {
  return await redisPromise;
}

export function registerPlayerHandlers(io: Server, socket: Socket) {
  // Store playerId and sessionCode for this socket connection
  const socketData = new Map<
    string,
    { playerId: string; sessionCode: string; sessionId: string; name: string }
  >();

  // New join-session event using session code
  socket.on("join-session", async ({ sessionCode, name }) => {
    try {
      if (!sessionCode || !name || !name.trim()) {
        socket.emit("join-error", {
          reason: "Session code and name are required",
        });
        return;
      }

      const redis = await getRedis();

      // Validate session code format
      if (!/^\d{6}$/.test(sessionCode)) {
        socket.emit("join-error", { reason: "Invalid session code format" });
        return;
      }

      // Get sessionId from session code
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("join-error", {
          reason: "Session code not found or expired",
        });
        return;
      }

      // Get session details
      const session = await getSession(sessionId);
      if (!session) {
        socket.emit("join-error", { reason: "Session not found" });
        return;
      }

      // Check if session is locked/live (prevent new joins)
      if (session.status === "live") {
        socket.emit("join-error", {
          reason: "Game has already started. New players cannot join.",
        });
        return;
      }

      // Check for duplicate names in session
      const players = await redis.hGetAll(playersKey(sessionId));
      const normalizedName = name.trim().toLowerCase();
      const isDuplicate = Object.values(players).some(
        (playerName) => playerName.toLowerCase() === normalizedName
      );

      if (isDuplicate) {
        socket.emit("join-error", {
          reason: "This name is already taken in this session",
        });
        return;
      }

      // Generate unique playerId
      const playerId = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Check if this player already has a socket connected (by name)
      // We'll use name as the identifier for one-socket-per-player
      const existingSocketId = await redis.get(
        playerSocketKey(sessionId, playerId)
      );

      if (existingSocketId && existingSocketId !== socket.id) {
        // Player already connected with a different socket
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) {
          oldSocket.emit("force-disconnect", {
            reason: "Another connection detected for this player",
          });
          oldSocket.disconnect(true);
          console.log(
            `🔌 Disconnected old socket ${existingSocketId} for player ${name}`
          );
        }
      }

      // Store player info in Redis (using playerId as key, name as value)
      await redis.hSet(playersKey(sessionId), playerId, name.trim());
      await redis.set(playerSocketKey(sessionId, playerId), socket.id, {
        EX: 60 * 60 * 2, // 2 hours expiration
      });

      // Store socket data locally
      socketData.set(socket.id, {
        playerId,
        sessionCode,
        sessionId,
        name: name.trim(),
      });

      // Join Socket.io room using session code
      socket.join(sessionCode);

      // Get game state
      const state = await redis.get(gameStateKey(sessionId));
      const gameState = state ? JSON.parse(state) : { status: "WAITING" };

      // Get player's previous answers if they reconnected
      const playerAnswers: Record<number, string> = {};
      const currentQuestionIndex = gameState.questionIndex || 0;
      for (let i = 0; i <= currentQuestionIndex; i++) {
        const answer = await redis.hGet(answersKey(sessionId, i), playerId);
        if (answer) {
          playerAnswers[i] = answer;
        }
      }

      // Emit success to the joining player
      socket.emit("joined-session", {
        sessionCode,
        sessionId,
        playerId,
        name: name.trim(),
        gameState: {
          ...gameState,
          playerAnswers,
        },
      });

      // Broadcast to all players in the session (including host)
      io.to(sessionCode).emit("player-joined", {
        playerId,
        name: name.trim(),
        sessionCode,
      });

      console.log(
        `✅ Player ${name.trim()} (${playerId}) joined session ${sessionCode}${
          Object.keys(playerAnswers).length > 0
            ? ` (reconnected with ${
                Object.keys(playerAnswers).length
              } previous answers)`
            : ""
        }`
      );
    } catch (error) {
      console.error("Error joining session:", error);
      socket.emit("join-error", { reason: "Failed to join session" });
    }
  });

  socket.on("SUBMIT_ANSWER", async ({ gameId, questionIndex, answer }) => {
    try {
      const redis = await getRedis();
      const state = await redis.get(gameStateKey(gameId));

      if (!state) {
        socket.emit("ANSWER_RECEIVED", {
          accepted: false,
          reason: "Game not found",
        });
        return;
      }

      // Get playerId for this socket
      const socketInfo = socketData.get(socket.id);
      if (!socketInfo || socketInfo.sessionId !== gameId) {
        socket.emit("ANSWER_RECEIVED", {
          accepted: false,
          reason: "Not joined to game. Please join first.",
        });
        return;
      }
      const { playerId } = socketInfo;

      const gameState = JSON.parse(state);

      // Check if question is active
      if (gameState.status !== "QUESTION_ACTIVE") {
        socket.emit("ANSWER_RECEIVED", {
          accepted: false,
          reason: "Question not active",
        });
        return;
      }

      // Check if this is the current active question
      const currentQuestionIndex = gameState.questionIndex;
      if (questionIndex !== currentQuestionIndex) {
        socket.emit("ANSWER_RECEIVED", {
          accepted: false,
          reason: "This is not the current active question",
        });
        return;
      }

      // Check if question time has expired
      const now = Date.now();
      const endAt = gameState.endAt;

      if (endAt && now > endAt) {
        // Question time has expired - check if they already submitted
        const existingAnswer = await redis.hGet(
          answersKey(gameId, questionIndex),
          playerId
        );

        if (existingAnswer) {
          // They already submitted before expiration - cannot change
          socket.emit("ANSWER_RECEIVED", {
            accepted: false,
            reason: "Question time has expired. Answer cannot be changed.",
            previousAnswer: existingAnswer,
          });
          return;
        } else {
          // They didn't submit before expiration - cannot submit now
          socket.emit("ANSWER_RECEIVED", {
            accepted: false,
            reason: "Question time has expired. Answer cannot be submitted.",
          });
          return;
        }
      }

      // Question is still active - allow answer submission/update
      // Use hSet (not hSetNX) to allow changing answers while question is active
      const isUpdate = await redis.hExists(
        answersKey(gameId, questionIndex),
        playerId
      );

      await redis.hSet(answersKey(gameId, questionIndex), playerId, answer);

      socket.emit("ANSWER_RECEIVED", {
        accepted: true,
        updated: isUpdate, // true if they changed their answer, false if first submission
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      socket.emit("ANSWER_RECEIVED", {
        accepted: false,
        reason: "Failed to submit answer",
      });
    }
  });

  socket.on("disconnect", async () => {
    // Clean up socket-to-player mapping
    const socketInfo = socketData.get(socket.id);
    if (socketInfo) {
      const { playerId, sessionId, sessionCode, name } = socketInfo;
      try {
        const redis = await getRedis();
        // Remove the player socket mapping
        const storedSocketId = await redis.get(
          playerSocketKey(sessionId, playerId)
        );
        // Only delete if this is still the active socket
        if (storedSocketId === socket.id) {
          await redis.del(playerSocketKey(sessionId, playerId));
          // Remove player from session
          await redis.hDel(playersKey(sessionId), playerId);
          console.log(
            `🧹 Cleaned up socket mapping for player ${name} (${playerId}) in session ${sessionCode}`
          );

          // Broadcast player left event
          io.to(sessionCode).emit("player-left", {
            playerId,
            name,
            sessionCode,
          });
        }
      } catch (error) {
        console.error("Error cleaning up socket mapping:", error);
      }
      socketData.delete(socket.id);
    }
  });
}
