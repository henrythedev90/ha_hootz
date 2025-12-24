import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import { gameStateKey, playersKey } from "../../redis/keys";
import {
  getSessionCodeFromId,
  updateSessionStatus,
  getSessionIdFromCode,
} from "../../redis/triviaRedis";

async function getRedis() {
  return await redisPromise;
}

export function registerHostHandlers(io: Server, socket: Socket) {
  // Host joins session room
  socket.on("host-join", async ({ sessionCode }) => {
    try {
      const sessionId = await getSessionIdFromCode(sessionCode);
      if (!sessionId) {
        socket.emit("error", { message: "Session code not found" });
        return;
      }

      // Join the session room
      socket.join(sessionCode);
      console.log(`👑 Host joined session ${sessionCode}`);

      // Get current players
      const redis = await getRedis();
      const players = await redis.hGetAll(playersKey(sessionId));
      const playersList = Object.entries(players).map(([playerId, name]) => ({
        playerId,
        name,
      }));

      socket.emit("host-joined", {
        sessionCode,
        players: playersList,
      });
    } catch (error) {
      console.error("Error in host-join:", error);
      socket.emit("error", { message: "Failed to join as host" });
    }
  });

  socket.on("START_GAME", async ({ sessionCode }) => {
    try {
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

      // Broadcast to all players in the session
      io.to(sessionCode).emit("session-cancelled", {
        sessionCode,
        message: "The host has cancelled this session",
      });

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
}
