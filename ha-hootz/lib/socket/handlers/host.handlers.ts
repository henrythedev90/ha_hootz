import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import { gameStateKey } from "../../redis/keys";

async function getRedis() {
  return await redisPromise;
}

export function registerHostHandlers(io: Server, socket: Socket) {
  socket.on("START_GAME", async ({ gameId }) => {
    try {
      const redis = await getRedis();
      const state = {
        status: "IN_PROGRESS",
        questionIndex: 0,
      };

      await redis.set(gameStateKey(gameId), JSON.stringify(state));

      io.to(gameId).emit("GAME_STARTED", state);
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("ERROR", { message: "Failed to start game" });
    }
  });

  socket.on("START_QUESTION", async ({ gameId, question }) => {
    try {
      const redis = await getRedis();
      const endAt = Date.now() + question.durationMs;

      await redis.set(
        gameStateKey(gameId),
        JSON.stringify({
          status: "QUESTION_ACTIVE",
          question,
          endAt,
        })
      );

      io.to(gameId).emit("QUESTION_STARTED", {
        question,
        endAt,
      });
    } catch (error) {
      console.error("Error starting question:", error);
      socket.emit("ERROR", { message: "Failed to start question" });
    }
  });
}
