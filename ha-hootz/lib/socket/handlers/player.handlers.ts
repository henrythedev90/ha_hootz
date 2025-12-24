import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import {
  gameStateKey,
  playersKey,
  answersKey,
  playerSocketKey,
} from "../../redis/keys";

async function getRedis() {
  return await redisPromise;
}

export function registerPlayerHandlers(io: Server, socket: Socket) {
  // Store playerId and gameId for this socket connection
  const socketData = new Map<string, { playerId: string; gameId: string }>();

  socket.on("JOIN_GAME", async ({ gameId, playerId, name }) => {
    try {
      const redis = await getRedis();
      const state = await redis.get(gameStateKey(gameId));

      if (!state) {
        socket.emit("JOIN_ERROR", { reason: "Game not found" });
        return;
      }

      // Check if this player already has a socket connected
      const existingSocketId = await redis.get(
        playerSocketKey(gameId, playerId)
      );

      if (existingSocketId && existingSocketId !== socket.id) {
        // Player already connected with a different socket
        // Disconnect the old socket
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) {
          oldSocket.emit("FORCE_DISCONNECT", {
            reason: "Another connection detected for this player",
          });
          oldSocket.disconnect(true);
          console.log(
            `🔌 Disconnected old socket ${existingSocketId} for player ${playerId}`
          );
        }
      }

      // Store player info and map socket to playerId
      await redis.hSet(playersKey(gameId), playerId, name);
      await redis.set(playerSocketKey(gameId, playerId), socket.id, {
        EX: 60 * 60 * 2, // 2 hours expiration
      });

      // Store socket data locally
      socketData.set(socket.id, { playerId, gameId });
      socket.join(gameId);

      // Get player's previous answers if they reconnected
      const gameState = JSON.parse(state);
      const playerAnswers: Record<number, string> = {};

      // Check all questions up to the current question index
      const currentQuestionIndex = gameState.questionIndex || 0;
      for (let i = 0; i <= currentQuestionIndex; i++) {
        const answer = await redis.hGet(answersKey(gameId, i), playerId);
        if (answer) {
          playerAnswers[i] = answer;
        }
      }

      socket.emit("GAME_STATE", {
        ...gameState,
        playerAnswers, // Include their previous answers
      });

      io.to(gameId).emit("PLAYER_JOINED", { playerId, name });
      console.log(
        `✅ Player ${playerId} joined game ${gameId} on socket ${socket.id}${
          Object.keys(playerAnswers).length > 0
            ? ` (reconnected with ${
                Object.keys(playerAnswers).length
              } previous answers)`
            : ""
        }`
      );
    } catch (error) {
      console.error("Error joining game:", error);
      socket.emit("JOIN_ERROR", { reason: "Failed to join game" });
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
      if (!socketInfo || socketInfo.gameId !== gameId) {
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
      const { playerId, gameId } = socketInfo;
      try {
        const redis = await getRedis();
        // Remove the player socket mapping
        const storedSocketId = await redis.get(
          playerSocketKey(gameId, playerId)
        );
        // Only delete if this is still the active socket
        if (storedSocketId === socket.id) {
          await redis.del(playerSocketKey(gameId, playerId));
          console.log(
            `🧹 Cleaned up socket mapping for player ${playerId} in game ${gameId}`
          );
        }
      } catch (error) {
        console.error("Error cleaning up socket mapping:", error);
      }
      socketData.delete(socket.id);
    }
  });
}
