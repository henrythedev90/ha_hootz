import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import { gameStateKey, playersKey, answersKey } from "../../redis/keys";

async function getRedis() {
  return await redisPromise;
}

export function registerPlayerHandlers(io: Server, socket: Socket) {
  socket.on("JOIN_GAME", async ({ gameId, playerId, name }) => {
    try {
      const redis = await getRedis();
      const state = await redis.get(gameStateKey(gameId));

      if (!state) {
        socket.emit("JOIN_ERROR", { reason: "Game not found" });
        return;
      }

      await redis.hSet(playersKey(gameId), playerId, name);
      socket.join(gameId);

      socket.emit("GAME_STATE", JSON.parse(state));
      io.to(gameId).emit("PLAYER_JOINED", { playerId, name });
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

      const gameState = JSON.parse(state);
      if (gameState.status !== "QUESTION_ACTIVE") {
        socket.emit("ANSWER_RECEIVED", {
          accepted: false,
          reason: "Question not active",
        });
        return;
      }

      // Store answer using the existing answersKey function
      await redis.hSet(answersKey(gameId, questionIndex), socket.id, answer);

      socket.emit("ANSWER_RECEIVED", { accepted: true });
    } catch (error) {
      console.error("Error submitting answer:", error);
      socket.emit("ANSWER_RECEIVED", {
        accepted: false,
        reason: "Failed to submit answer",
      });
    }
  });
}
