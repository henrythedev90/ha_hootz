import { Server, Socket } from "socket.io";
import redisPromise from "../../redis/client";
import {
  gameStateKey,
  playersKey,
  answersKey,
  playerSocketKey,
  resultsKey,
  leftPlayersKey,
} from "../../redis/keys";
import {
  getSessionIdFromCode,
  getSession,
  addPlayer as addPlayerToSession,
  getAnswerCount,
  getAnswerDistribution,
  storeAnswerTimestamp,
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
    console.log(`🔵 Join request: sessionCode=${sessionCode}, name=${name}`);
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

      // Check if this player has explicitly left the game (cannot rejoin)
      const leftPlayers = await redis.sMembers(leftPlayersKey(sessionId));
      const normalizedName = name.trim().toLowerCase();
      const hasLeft = leftPlayers.some(
        (leftName) => leftName.toLowerCase() === normalizedName
      );

      if (hasLeft) {
        socket.emit("join-error", {
          reason:
            "You have left this game and cannot rejoin with the same name.",
        });
        return;
      }

      // Check for duplicate names in session
      // If a player with the same name exists, check if their socket is still connected
      // If not connected, allow reconnection (player refreshing page)
      const players = await redis.hGetAll(playersKey(sessionId));

      // Find if there's an existing player with the same name
      let existingPlayerId: string | null = null;
      for (const [playerId, playerName] of Object.entries(players)) {
        if (playerName.toLowerCase() === normalizedName) {
          existingPlayerId = playerId;
          break;
        }
      }

      let playerId: string;
      let isReconnection = false;

      if (existingPlayerId) {
        // Player with this name exists - check if their socket is still connected
        const existingSocketId = await redis.get(
          playerSocketKey(sessionId, existingPlayerId)
        );

        if (existingSocketId) {
          const oldSocket = io.sockets.sockets.get(existingSocketId);
          if (oldSocket && oldSocket.connected) {
            // Socket is still active - this is a true duplicate
            socket.emit("join-error", {
              reason: "This name is already taken in this session",
            });
            return;
          }
        }

        // Socket is not active or doesn't exist - allow reconnection with same playerId
        // BUT check if session has ended - if so, reject reconnection
        if (session.status === "ended") {
          socket.emit("join-error", {
            reason:
              "This game session has ended. The host has closed the game.",
          });
          return;
        }
        playerId = existingPlayerId;
        isReconnection = true;
        console.log(
          `🔄 Player ${name} reconnecting with existing playerId ${playerId}`
        );
      } else {
        // New player - check if session is locked/live (prevent new joins)
        if (session.status === "live" || session.status === "ended") {
          socket.emit("join-error", {
            reason:
              session.status === "ended"
                ? "This game session has ended. The host has closed the game."
                : "Game has already started. New players cannot join.",
          });
          return;
        }
        // New player - generate unique playerId
        playerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

      // Get player count (only count players with active sockets)
      const allPlayers = await redis.hGetAll(playersKey(sessionId));
      let activePlayerCount = 0;
      for (const [pid] of Object.entries(allPlayers)) {
        const pidSocketId = await redis.get(playerSocketKey(sessionId, pid));
        if (pidSocketId) {
          const pidSocket = io.sockets.sockets.get(pidSocketId);
          if (pidSocket && pidSocket.connected) {
            activePlayerCount++;
          }
        }
      }
      // Add 1 for the current player who just joined
      const playerCount = activePlayerCount;

      // Emit success to the joining player
      socket.emit("joined-session", {
        sessionCode,
        sessionId,
        playerId,
        name: name.trim(),
        playerCount,
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
        playerCount,
      });

      // If player reconnected with answers for the current question, update host stats
      // Only update if question is active or in progress (not ended, since no new answers can be submitted)
      if (
        isReconnection &&
        gameState.questionIndex !== undefined &&
        (gameState.status === "QUESTION_ACTIVE" ||
          gameState.status === "IN_PROGRESS")
      ) {
        const currentQuestionIndex = gameState.questionIndex;
        const hasAnswerForCurrentQuestion =
          playerAnswers[currentQuestionIndex] !== undefined;

        if (hasAnswerForCurrentQuestion) {
          try {
            const answerCount = await getAnswerCount(
              sessionId,
              currentQuestionIndex
            );
            const answerDistribution = await getAnswerDistribution(
              sessionId,
              currentQuestionIndex
            );

            // Get list of players who have submitted answers
            const answers = await redis.hGetAll(
              answersKey(sessionId, currentQuestionIndex)
            );
            const playersWithAnswers = Object.keys(answers);

            // Broadcast updated stats to host
            io.to(sessionCode).emit("answer-stats-updated", {
              questionIndex: currentQuestionIndex,
              answerCount,
              answerDistribution,
              playersWithAnswers,
            });
            console.log(
              `📊 Broadcasted updated stats after player ${name.trim()} reconnected: ${answerCount} answers for question ${currentQuestionIndex}`
            );
          } catch (error) {
            console.error(
              "Error broadcasting stats after reconnection:",
              error
            );
            // Don't fail the join if stats broadcast fails
          }
        }
      }

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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join session";
      socket.emit("join-error", {
        reason: errorMessage || "Failed to join session",
      });
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

      // Check if question is in review mode (navigated to a previous question)
      // If answer is already revealed, this is review mode - don't allow new submissions
      if (gameState.answerRevealed && gameState.status === "QUESTION_ENDED") {
        socket.emit("ANSWER_RECEIVED", {
          accepted: false,
          reason: "This question is in review mode. Answers cannot be changed.",
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

      // Get previous answer if updating (to update distribution correctly)
      let previousAnswer: string | null = null;
      if (isUpdate) {
        previousAnswer = await redis.hGet(
          answersKey(gameId, questionIndex),
          playerId
        );
      }

      // Store the new answer
      await redis.hSet(answersKey(gameId, questionIndex), playerId, answer);

      // Store submission timestamp for time-based bonus calculation
      // Always update timestamp on each submission (even if answer changed)
      const submissionTime = Date.now();
      const submissionDate = new Date(submissionTime);

      // Calculate question start time and timing info
      // Note: endAt is already declared above at line 315
      const questionDuration = 30000; // Default 30 seconds (should match host's durationMs)
      const questionStartTime = endAt ? endAt - questionDuration : null;
      const timeSinceStart = questionStartTime
        ? submissionTime - questionStartTime
        : null;
      const secondsSinceStart = timeSinceStart
        ? Math.floor(timeSinceStart / 1000)
        : null;
      const timeRemaining = endAt ? Math.max(0, endAt - submissionTime) : null;
      const timeRemainingSeconds = timeRemaining
        ? Math.floor(timeRemaining / 1000)
        : null;

      console.log("📝 PLAYER ANSWER SUBMISSION:", {
        playerId,
        playerName: socketInfo.name,
        questionIndex,
        answer,
        isUpdate: isUpdate ? "Updated answer" : "First submission",
        previousAnswer: previousAnswer || "None",
        submissionTime,
        submissionTimeFormatted: submissionDate.toISOString(),
        submissionTimeReadable: submissionDate.toLocaleTimeString(),
        questionStartTime: questionStartTime
          ? new Date(questionStartTime).toISOString()
          : "Unknown",
        questionEndTime: endAt ? new Date(endAt).toISOString() : "Unknown",
        questionDuration: `${questionDuration / 1000} seconds`,
        timeSinceStart: timeSinceStart
          ? `${secondsSinceStart} seconds (${timeSinceStart}ms)`
          : "Unknown",
        timeRemaining: timeRemaining
          ? `${timeRemainingSeconds} seconds (${timeRemaining}ms)`
          : "Unknown",
        timeRatio:
          timeSinceStart && questionDuration
            ? (timeSinceStart / questionDuration).toFixed(3)
            : "Unknown",
      });

      await storeAnswerTimestamp(
        gameId,
        questionIndex,
        playerId,
        submissionTime
      );

      // Update results distribution for answer statistics
      // If player changed their answer, decrement old answer and increment new one
      if (isUpdate && previousAnswer && previousAnswer !== answer) {
        await redis.zIncrBy(
          resultsKey(gameId, questionIndex),
          -1,
          previousAnswer
        );
        await redis.zIncrBy(resultsKey(gameId, questionIndex), 1, answer);
      } else if (!isUpdate) {
        // First time submitting - just increment
        await redis.zIncrBy(resultsKey(gameId, questionIndex), 1, answer);
      }
      // If isUpdate but same answer, no need to change distribution

      socket.emit("ANSWER_RECEIVED", {
        accepted: true,
        updated: isUpdate, // true if they changed their answer, false if first submission
      });

      // Notify host about updated answer count (for real-time button updates)
      try {
        const answerCount = await getAnswerCount(gameId, questionIndex);
        const answerDistribution = await getAnswerDistribution(
          gameId,
          questionIndex
        );

        // Get list of players who have submitted answers
        const answers = await redis.hGetAll(answersKey(gameId, questionIndex));
        const playersWithAnswers = Object.keys(answers);

        // Get sessionCode from socket data
        const socketInfo = socketData.get(socket.id);
        if (socketInfo) {
          io.to(socketInfo.sessionCode).emit("answer-stats-updated", {
            questionIndex,
            answerCount,
            answerDistribution,
            playersWithAnswers,
          });
        }
      } catch (error) {
        console.error("Error broadcasting answer stats:", error);
        // Don't fail the answer submission if stats broadcast fails
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      socket.emit("ANSWER_RECEIVED", {
        accepted: false,
        reason: "Failed to submit answer",
      });
    }
  });

  socket.on("leave-game", async ({ sessionCode }) => {
    // Player explicitly left the game - permanently remove them and prevent rejoin
    const socketInfo = socketData.get(socket.id);
    if (socketInfo && socketInfo.sessionCode === sessionCode) {
      const { playerId, sessionId, name } = socketInfo;
      try {
        const redis = await getRedis();

        // Add player name to "left players" set to prevent rejoining
        await redis.sAdd(leftPlayersKey(sessionId), name.trim());
        // Set expiration on the left players set (match session expiration)
        await redis.expire(leftPlayersKey(sessionId), 60 * 60 * 2); // 2 hours

        // Remove player from session permanently
        await redis.hDel(playersKey(sessionId), playerId);

        // Remove socket mapping
        await redis.del(playerSocketKey(sessionId, playerId));

        console.log(
          `🚪 Player ${name} (${playerId}) left session ${sessionCode} permanently and cannot rejoin`
        );

        // Get updated player count
        const allPlayers = await redis.hGetAll(playersKey(sessionId));
        let activePlayerCount = 0;
        for (const [pid] of Object.entries(allPlayers)) {
          const pidSocketId = await redis.get(playerSocketKey(sessionId, pid));
          if (pidSocketId) {
            const pidSocket = io.sockets.sockets.get(pidSocketId);
            if (pidSocket && pidSocket.connected) {
              activePlayerCount++;
            }
          }
        }

        // Broadcast player left event
        io.to(sessionCode).emit("player-left", {
          playerId,
          name,
          sessionCode,
          playerCount: activePlayerCount,
        });

        // Clean up local data
        socketData.delete(socket.id);

        // Disconnect the socket immediately and forcefully
        socket.disconnect(true); // Force disconnect
      } catch (error) {
        console.error("Error handling leave-game:", error);
        // Still disconnect even if there's an error
        socket.disconnect(true);
      }
    }
  });

  socket.on("disconnect", async () => {
    // Clean up socket-to-player mapping
    // NOTE: We do NOT remove the player from the players hash on disconnect
    // This allows players to reconnect (e.g., on page refresh) with the same playerId
    // The player will only be removed if they explicitly leave or the session ends
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
          console.log(
            `🧹 Cleaned up socket mapping for player ${name} (${playerId}) in session ${sessionCode}`
          );

          // Count only players with active sockets (for accurate player count)
          const allPlayers = await redis.hGetAll(playersKey(sessionId));
          let activePlayerCount = 0;
          for (const [pid] of Object.entries(allPlayers)) {
            const pidSocketId = await redis.get(
              playerSocketKey(sessionId, pid)
            );
            if (pidSocketId) {
              const pidSocket = io.sockets.sockets.get(pidSocketId);
              if (pidSocket && pidSocket.connected) {
                activePlayerCount++;
              }
            }
          }

          // Broadcast player left event with accurate count
          io.to(sessionCode).emit("player-left", {
            playerId,
            name,
            sessionCode,
            playerCount: activePlayerCount,
          });
        }
      } catch (error) {
        console.error("Error cleaning up socket mapping:", error);
      }
      socketData.delete(socket.id);
    }
  });
}
