"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import Loading from "@/components/Loading";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import CenteredLayout from "@/components/CenteredLayout";
import GameWelcomeModal from "@/components/GameWelcomeModal";
import WinnerDisplay from "@/components/WinnerDisplay";
import ThankYouModal from "@/components/ThankYouModal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setSessionCode,
  setGameState,
  updateGameState,
} from "@/store/slices/gameSlice";
import {
  setPlayerId,
  setPlayerName,
  setHostName,
  setPlayerCount,
  setSelectedAnswer,
  setTimeRemaining,
  setIsTimerExpired,
  setPreviousAnswer,
  setLeaderboard,
} from "@/store/slices/playerSlice";
import {
  setSocket,
  setConnected,
  setSocketSessionCode,
} from "@/store/slices/socketSlice";
import {
  setShowWelcomeModal,
  setShowWinnerDisplay,
  setShowThankYouModal,
  setIsExitModalOpen,
  setSessionEnded,
  setError,
} from "@/store/slices/uiSlice";

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionCode = params.sessionCode as string;
  const playerName = searchParams.get("name");

  // Redux state
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.game?.gameState ?? null);
  const playerId = useAppSelector((state) => state.player.playerId);
  const hostName = useAppSelector((state) => state.player.hostName);
  const playerCount = useAppSelector((state) => state.player.playerCount);
  const selectedAnswer = useAppSelector((state) => state.player.selectedAnswer);
  const timeRemaining = useAppSelector((state) => state.player.timeRemaining);
  const isTimerExpired = useAppSelector((state) => state.player.isTimerExpired);
  const leaderboard = useAppSelector((state) => state.player.leaderboard);
  const socket = useAppSelector((state) => state.socket.socket);
  const connected = useAppSelector((state) => state.socket.connected);
  const showWelcomeModal = useAppSelector((state) => state.ui.showWelcomeModal);
  const showWinnerDisplay = useAppSelector(
    (state) => state.ui.showWinnerDisplay
  );
  const showThankYouModal = useAppSelector(
    (state) => state.ui.showThankYouModal
  );
  const isExitModalOpen = useAppSelector((state) => state.ui.isExitModalOpen);
  const sessionEnded = useAppSelector((state) => state.ui.sessionEnded);
  const error = useAppSelector((state) => state.ui.error);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const gameStateRef = useRef(gameState);

  // Keep gameStateRef in sync with Redux gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Set session code and player name in Redux
  useEffect(() => {
    if (sessionCode) {
      dispatch(setSessionCode(sessionCode));
      dispatch(setSocketSessionCode(sessionCode));
    }
    if (playerName) {
      dispatch(setPlayerName(playerName));
    }
  }, [sessionCode, playerName, dispatch]);

  // Check session status and fetch host name when component mounts
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const validateResponse = await fetch(
          `/api/sessions/validate/${sessionCode}`
        );
        const validateData = await validateResponse.json();

        if (validateData.sessionStatus === "ended") {
          dispatch(setSessionEnded(true));
          return;
        }

        const hostResponse = await fetch(`/api/sessions/${sessionCode}/host`);
        const hostData = await hostResponse.json();
        if (hostData.success && hostData.hostName) {
          dispatch(setHostName(hostData.hostName));
        }
      } catch (error) {
        console.error("Error checking session status:", error);
      }
    };

    if (sessionCode) {
      checkSessionStatus();
    }
  }, [sessionCode, dispatch]);

  // Timer countdown effect
  useEffect(() => {
    if (gameState?.answerRevealed) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      dispatch(setTimeRemaining(0));
      dispatch(setIsTimerExpired(true));
      return;
    }

    if (gameState?.status === "QUESTION_ACTIVE" && gameState.endAt) {
      const updateTimer = () => {
        const remaining = Math.max(
          0,
          Math.floor((gameState.endAt! - Date.now()) / 1000)
        );
        dispatch(setTimeRemaining(remaining));
        dispatch(setIsTimerExpired(remaining === 0));

        if (remaining === 0 && selectedAnswer && socket) {
          socket.emit("SUBMIT_ANSWER", {
            gameId: gameState.sessionId,
            questionIndex: gameState.questionIndex,
            answer: selectedAnswer,
          });
        }
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 100);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    } else {
      dispatch(setTimeRemaining(0));
      dispatch(setIsTimerExpired(gameState?.status === "QUESTION_ENDED"));
    }
  }, [
    gameState?.status,
    gameState?.endAt,
    gameState?.answerRevealed,
    selectedAnswer,
    socket,
    gameState?.sessionId,
    gameState?.questionIndex,
    dispatch,
  ]);

  // Socket.io connection and event handlers
  useEffect(() => {
    if (!playerName || !sessionCode) {
      dispatch(setError("Missing player name or session code"));
      return;
    }

    if (sessionEnded) {
      return;
    }

    const newSocket = io("/", {
      path: "/api/socket",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    dispatch(setSocket(newSocket));

    newSocket.on("connect", () => {
      dispatch(setConnected(true));
      newSocket.emit("join-session", {
        sessionCode,
        name: playerName,
      });
    });

    newSocket.on(
      "joined-session",
      (data: {
        gameState: any;
        sessionId?: string;
        playerId?: string;
        playerCount?: number;
      }) => {
        if (data.playerId) {
          dispatch(setPlayerId(data.playerId));
        }
        dispatch(
          setGameState({
            ...data.gameState,
            sessionId: data.sessionId || data.gameState.sessionId,
          })
        );
        if (data.playerCount !== undefined) {
          dispatch(setPlayerCount(data.playerCount));
        }
        if (
          data.gameState.playerAnswers &&
          data.gameState.questionIndex !== undefined
        ) {
          const prevAnswer =
            data.gameState.playerAnswers[data.gameState.questionIndex];
          if (prevAnswer) {
            dispatch(setSelectedAnswer(prevAnswer as "A" | "B" | "C" | "D"));
          }
        }
        if (data.gameState.status === "QUESTION_ACTIVE") {
          dispatch(setIsTimerExpired(false));
        }
      }
    );

    newSocket.on("join-error", (data: { reason?: string } | string) => {
      console.error("❌ Join error:", data);
      const errorMessage =
        typeof data === "string"
          ? data
          : data?.reason || "Failed to join session";

      if (
        errorMessage.includes("ended") ||
        errorMessage.includes("cancelled")
      ) {
        dispatch(setSessionEnded(true));
        newSocket.disconnect();
        dispatch(setConnected(false));
      } else {
        dispatch(setError(errorMessage));
      }
    });

    newSocket.on("player-joined", (data: { playerCount?: number }) => {
      if (data.playerCount !== undefined) {
        dispatch(setPlayerCount(data.playerCount));
      }
    });

    newSocket.on("player-left", (data: { playerCount?: number }) => {
      if (data.playerCount !== undefined) {
        dispatch(setPlayerCount(data.playerCount));
      }
    });

    newSocket.on(
      "game-started",
      (data: { status: string; questionIndex: number }) => {
        dispatch(
          updateGameState({
            ...data,
            status: "IN_PROGRESS",
          })
        );
        dispatch(setSelectedAnswer(null));
        dispatch(setIsTimerExpired(false));
        dispatch(setShowWelcomeModal(true));
      }
    );

    newSocket.on(
      "question-started",
      (data: {
        question: {
          text: string;
          A: string;
          B: string;
          C: string;
          D: string;
          correct: "A" | "B" | "C" | "D";
        };
        questionIndex: number;
        endAt: number;
      }) => {
        dispatch(
          updateGameState({
            status: "QUESTION_ACTIVE",
            question: data.question,
            questionIndex: data.questionIndex,
            endAt: data.endAt,
          })
        );
        dispatch(setSelectedAnswer(null));
        dispatch(setIsTimerExpired(false));
        dispatch(setShowWelcomeModal(false));
      }
    );

    newSocket.on("question-ended", (data: any) => {
      dispatch(updateGameState({ status: "QUESTION_ENDED" }));
      dispatch(setIsTimerExpired(true));
    });

    newSocket.on(
      "question-navigated",
      async (data: {
        questionIndex: number;
        question: {
          text: string;
          A: string;
          B: string;
          C: string;
          D: string;
          correct: "A" | "B" | "C" | "D";
        };
        answerRevealed?: boolean;
        correctAnswer?: "A" | "B" | "C" | "D";
        isReviewMode?: boolean;
      }) => {
        const isReviewMode = data.isReviewMode || false;

        if (isReviewMode && playerId) {
          try {
            const response = await fetch(
              `/api/sessions/${sessionCode}/player-answer?questionIndex=${data.questionIndex}&playerId=${playerId}`
            );
            const answerData = await response.json();
            if (
              answerData.success &&
              answerData.answer &&
              answerData.answer !== "NO_ANSWER"
            ) {
              dispatch(
                setSelectedAnswer(answerData.answer as "A" | "B" | "C" | "D")
              );
              dispatch(
                setPreviousAnswer(answerData.answer as "A" | "B" | "C" | "D")
              );
            } else {
              dispatch(setSelectedAnswer(null));
            }
          } catch (error) {
            console.error("Error fetching previous answer:", error);
            dispatch(setSelectedAnswer(null));
          }
        } else {
          dispatch(setSelectedAnswer(null));
        }

        dispatch(
          updateGameState({
            status: isReviewMode ? "QUESTION_ENDED" : "IN_PROGRESS",
            questionIndex: data.questionIndex,
            question: data.question,
            endAt: undefined,
            answerRevealed: data.answerRevealed || false,
            correctAnswer: data.correctAnswer,
          })
        );
        dispatch(setIsTimerExpired(isReviewMode));
        dispatch(setTimeRemaining(0));
      }
    );

    newSocket.on(
      "answer-revealed",
      (data: {
        questionIndex: number;
        correctAnswer: "A" | "B" | "C" | "D";
      }) => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        dispatch(setTimeRemaining(0));
        dispatch(setIsTimerExpired(true));
        dispatch(
          updateGameState({
            answerRevealed: true,
            correctAnswer: data.correctAnswer,
          })
        );
      }
    );

    newSocket.on(
      "ANSWER_RECEIVED",
      (data: { accepted: boolean; updated?: boolean; reason?: string }) => {
        if (data.accepted) {
          // Answer accepted
        } else {
          console.error("❌ Answer rejected:", data.reason);
          if (data.reason) {
            alert(`Answer not accepted: ${data.reason}`);
          }
        }
      }
    );

    newSocket.on("session-cancelled", (data: { message?: string }) => {
      dispatch(setShowThankYouModal(true));
      dispatch(updateGameState({ status: "QUESTION_ENDED" }));
      newSocket.disconnect();
      dispatch(setConnected(false));
    });

    newSocket.on("force-disconnect", (data: { reason: string }) => {
      dispatch(setError(data.reason || "Another connection detected"));
      newSocket.disconnect();
    });

    newSocket.on("disconnect", () => {
      dispatch(setConnected(false));
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      dispatch(setError("Failed to connect to server"));
    });

    newSocket.on(
      "winner-revealed",
      (data: {
        leaderboard: Array<{ playerId: string; name: string; score: number }>;
      }) => {
        dispatch(setLeaderboard(data.leaderboard));
        dispatch(setShowWinnerDisplay(true));
      }
    );

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      newSocket.disconnect();
    };
  }, [sessionCode, playerName, sessionEnded, playerId, dispatch]);

  const handleAnswerSelect = (answer: "A" | "B" | "C" | "D") => {
    if (!socket || !gameState) return;
    if (gameState.status !== "QUESTION_ACTIVE" || gameState.answerRevealed)
      return;

    dispatch(setSelectedAnswer(answer));

    socket.emit("SUBMIT_ANSWER", {
      gameId: gameState.sessionId,
      questionIndex: gameState.questionIndex,
      answer,
    });
  };

  const handleExitGame = () => {
    dispatch(setIsExitModalOpen(true));
  };

  const handleConfirmExit = () => {
    if (socket) {
      socket.emit("leave-game", { sessionCode });
      socket.disconnect();
    }
    dispatch(setConnected(false));
    dispatch(
      setError(
        "GOODBYE: You have left the game. You cannot rejoin with the same name."
      )
    );
    dispatch(setIsExitModalOpen(false));
  };

  // Show error screen if there's an error
  if (error) {
    const isCancelled = error.includes("cancelled");
    const isGoodbye = error.includes("GOODBYE:");
    const displayMessage = isGoodbye ? error.replace("GOODBYE: ", "") : error;
    return (
      <>
        <div className="min-h-screen bg-deep-navy text-text-light flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card-bg rounded-xl border border-indigo/20 shadow-lg p-8 max-w-md w-full text-center"
          >
            <h1 className="text-2xl font-bold mb-4">
              {isGoodbye ? (
                <span className="text-indigo">Goodbye!</span>
              ) : isCancelled ? (
                <span className="text-error">Session Cancelled</span>
              ) : (
                <span className="text-error">Error</span>
              )}
            </h1>
            <p className="text-text-light/70 mb-6">{displayMessage}</p>
            {isGoodbye ? (
              <div className="space-y-4">
                <p className="text-sm text-text-light/50">
                  Thanks for playing! You can close this page.
                </p>
                {playerName && (
                  <div className="pt-4 border-t border-indigo/30">
                    <p className="text-sm text-text-light/70 mb-3">
                      Hey {playerName}! Did you enjoy playing?
                    </p>
                    <button
                      onClick={() => (window.location.href = "/auth/signup")}
                      className="w-full px-6 py-3 bg-indigo text-white rounded-lg hover:bg-indigo/90 transition-colors font-medium shadow-md"
                    >
                      Create Your Own Ha-Hootz Account
                    </button>
                    <p className="text-xs text-text-light/50 mt-2">
                      Host your own trivia games and create engaging
                      presentations!
                    </p>
                  </div>
                )}
              </div>
            ) : isCancelled ? (
              <div className="space-y-4">
                <p className="text-sm text-text-light/50">
                  The host has ended this session. You can close this page.
                </p>
                {playerName && (
                  <div className="pt-4 border-t border-indigo/30">
                    <p className="text-sm text-text-light/70 mb-3">
                      Hey {playerName}! Did you enjoy playing?
                    </p>
                    <button
                      onClick={() => (window.location.href = "/auth/signup")}
                      className="w-full px-6 py-3 bg-indigo text-white rounded-lg hover:bg-indigo/90 transition-colors font-medium shadow-md"
                    >
                      Create Your Own Ha-Hootz Account
                    </button>
                    <p className="text-xs text-text-light/50 mt-2">
                      Host your own trivia games and create engaging
                      presentations!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-light/50">
                Please check your connection and try again.
              </p>
            )}
          </motion.div>
        </div>

        <DeleteConfirmationModal
          isOpen={isExitModalOpen}
          playerMode={true}
          onClose={() => dispatch(setIsExitModalOpen(false))}
          onConfirm={handleConfirmExit}
          title="Exit Game"
          itemName="game"
          description="You won't be able to rejoin with the same name if you leave now."
        />

        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}

        <ThankYouModal
          isOpen={showThankYouModal}
          hostName={hostName}
          playerName={playerName}
          onClose={() => dispatch(setShowThankYouModal(false))}
        />
      </>
    );
  }

  if (sessionEnded) {
    return (
      <>
        <CenteredLayout>
          <div className="bg-card-bg rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              Game Session Ended
            </h1>
            <p className="text-text-light/70 mb-6">
              This game session has ended. You can close this page.
            </p>
            {hostName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Thanks for playing {hostName}'s game!
              </p>
            )}
            <div className="space-y-4">
              <a
                href="/"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-md"
              >
                Go to Dashboard
              </a>
              <button
                onClick={() => (window.location.href = "/auth/signup")}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-md"
              >
                Create Your Own Ha-Hootz Account
              </button>
            </div>
          </div>
        </CenteredLayout>

        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}

        <ThankYouModal
          isOpen={showThankYouModal}
          hostName={hostName}
          playerName={playerName}
          onClose={() => dispatch(setShowThankYouModal(false))}
        />
      </>
    );
  }

  if (!connected || !gameState) {
    return (
      <>
        <Loading message="Connecting to game..." />
        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}

        <ThankYouModal
          isOpen={showThankYouModal}
          hostName={hostName}
          playerName={playerName}
          onClose={() => dispatch(setShowThankYouModal(false))}
        />
      </>
    );
  }

  // Lobby / Waiting Room
  if (gameState.status === "WAITING") {
    return (
      <>
        <div className="min-h-screen bg-deep-navy text-text-light flex items-center justify-center p-4">
          <button
            onClick={handleExitGame}
            className="absolute top-4 right-4 w-10 h-10 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
            title="Exit Game"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <div className="bg-card-bg rounded-xl border border-indigo/20 shadow-lg p-8 text-center">
              <motion.h1
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-4xl font-bold mb-4 bg-linear-to-r from-indigo to-cyan bg-clip-text text-transparent"
              >
                Welcome to Ha-Hootz!
              </motion.h1>
              <p className="text-text-light/70 mb-6 text-lg">
                You're all set! We're waiting for{" "}
                {hostName ? (
                  <span className="font-semibold text-cyan">{hostName}</span>
                ) : (
                  "the host"
                )}{" "}
                to start the presentation.
              </p>
              {playerCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pt-4 border-t border-indigo/30"
                >
                  <p className="text-text-light/50 text-sm mb-1">
                    Players in lobby
                  </p>
                  <p className="text-3xl font-semibold text-cyan">
                    {playerCount} {playerCount === 1 ? "player" : "players"}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <DeleteConfirmationModal
          playerMode={true}
          isOpen={isExitModalOpen}
          onClose={() => dispatch(setIsExitModalOpen(false))}
          onConfirm={handleConfirmExit}
          title="Exit Game"
          itemName="game"
          description="You won't be able to rejoin with the same name if you leave now."
        />

        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}

        <ThankYouModal
          isOpen={showThankYouModal}
          hostName={hostName}
          playerName={playerName}
          onClose={() => dispatch(setShowThankYouModal(false))}
        />
      </>
    );
  }

  // Active Question View
  if (
    gameState.question &&
    (gameState.status === "QUESTION_ACTIVE" ||
      gameState.status === "IN_PROGRESS" ||
      gameState.status === "QUESTION_ENDED")
  ) {
    const isQuestionActive = gameState.status === "QUESTION_ACTIVE";
    const showAnswerButtons =
      isQuestionActive || gameState.status === "QUESTION_ENDED";
    const isLocked = isTimerExpired || gameState.status === "QUESTION_ENDED";
    const questionIndex = gameState.questionIndex ?? 0;
    const questionCount = gameState.questionCount ?? 0;

    // Calculate timer percentage using actual question duration
    const questionDuration =
      (gameState.scoringConfig as any)?.questionDuration
        ? ((gameState.scoringConfig as any).questionDuration * 1000)
        : 30000; // Default to 30 seconds
    const timerPercentage = gameState.endAt
      ? Math.max(0, ((gameState.endAt - Date.now()) / questionDuration) * 100)
      : 0;

    return (
      <>
        <div className="min-h-screen bg-deep-navy text-text-light flex flex-col p-4 md:p-8">
          {/* Exit Button */}
          <button
            onClick={handleExitGame}
            className="absolute top-4 right-4 w-10 h-10 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
            title="Exit Game"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Timer */}
          {isQuestionActive && (
            <div className="mb-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-text-light/60">
                    Question {questionIndex + 1} of {questionCount}
                  </span>
                  <span
                    className={`text-2xl font-bold ${
                      timeRemaining <= 5
                        ? "text-error"
                        : timeRemaining <= 10
                        ? "text-cyan"
                        : "text-indigo"
                    } transition-colors`}
                  >
                    {timeRemaining}s
                  </span>
                </div>
                <div className="relative h-3 bg-card-bg rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{
                      width: `${timerPercentage}%`,
                      backgroundColor:
                        timeRemaining <= 5
                          ? "#EF4444"
                          : timeRemaining <= 10
                          ? "#22D3EE"
                          : "#6366F1",
                    }}
                    className="h-full rounded-full"
                  />
                  {timeRemaining <= 10 && (
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="absolute inset-0 bg-error/20"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Question */}
          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
            {playerName && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
              >
                <h1 className="text-2xl md:text-3xl font-bold text-text-light">
                  {playerName}
                </h1>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold text-center mb-12 text-text-light"
            >
              {gameState.question.text}
            </motion.h1>

            {/* Answer Buttons */}
            {showAnswerButtons ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["A", "B", "C", "D"] as const).map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrectAnswer =
                    gameState.answerRevealed &&
                    gameState.correctAnswer === option;
                  const showCorrect =
                    gameState.answerRevealed && isCorrectAnswer;
                  const showWrong =
                    gameState.answerRevealed && isSelected && !isCorrectAnswer;

                  return (
                    <motion.button
                      key={option}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={!isLocked ? { scale: 1.03 } : {}}
                      whileTap={!isLocked ? { scale: 0.97 } : {}}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={isLocked}
                      className={`relative p-6 md:p-8 rounded-2xl border-3 transition-all text-left ${
                        showCorrect
                          ? "bg-success/20 border-success shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                          : showWrong
                          ? "bg-error/20 border-error shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                          : isSelected
                          ? "bg-indigo/20 border-indigo shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                          : "bg-card-bg border-indigo/30 hover:border-indigo/60 hover:bg-card-bg/80"
                      } ${
                        isLocked && !isSelected && !showCorrect
                          ? "opacity-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                            showCorrect
                              ? "bg-success text-white"
                              : showWrong
                              ? "bg-error text-white"
                              : isSelected
                              ? "bg-indigo text-white"
                              : "bg-deep-navy text-text-light/60"
                          }`}
                        >
                          {showCorrect ? (
                            <Check className="w-6 h-6" />
                          ) : showWrong ? (
                            <X className="w-6 h-6" />
                          ) : (
                            option
                          )}
                        </div>
                        <div className="flex-1 pt-2">
                          <p
                            className={`text-lg md:text-2xl text-text-light ${
                              showCorrect || showWrong ? "font-semibold" : ""
                            }`}
                          >
                            {gameState.question?.[option] || ""}
                          </p>
                        </div>
                      </div>

                      {/* Lock Indicator */}
                      {isSelected && isLocked && !gameState.answerRevealed && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-4 right-4 bg-cyan text-deep-navy px-3 py-1 rounded-full text-sm font-medium"
                        >
                          Locked ✓
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 mb-4">
                <div className="bg-card-bg border border-indigo/30 rounded-lg p-6">
                  <p className="text-lg text-text-light mb-2">
                    Waiting for host to start the question...
                  </p>
                  <p className="text-sm text-text-light/50">
                    Answer buttons will appear when the question begins
                  </p>
                </div>
              </div>
            )}

            {/* Result Messages */}
            <AnimatePresence>
              {isTimerExpired && !gameState.answerRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8 text-center"
                >
                  <div className="bg-card-bg border border-indigo/30 rounded-2xl p-6">
                    <p className="text-text-light/70">
                      Time's up! Your answer has been submitted.
                    </p>
                  </div>
                </motion.div>
              )}

              {gameState.answerRevealed && selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mt-8 p-6 rounded-2xl text-center ${
                    selectedAnswer === gameState.correctAnswer
                      ? "bg-success/20 border-2 border-success"
                      : "bg-error/20 border-2 border-error"
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                  >
                    {selectedAnswer === gameState.correctAnswer ? (
                      <div>
                        <div className="text-6xl mb-3">🎉</div>
                        <h2 className="text-3xl font-bold text-success mb-2">
                          Correct!
                        </h2>
                        <p className="text-text-light/70">Great job!</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-6xl mb-3">😔</div>
                        <h2 className="text-3xl font-bold text-error mb-2">
                          Wrong Answer
                        </h2>
                        <p className="text-text-light/70">
                          Correct answer: {gameState.correctAnswer}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}

              {gameState.answerRevealed && !selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8 text-center"
                >
                  <div className="bg-card-bg border border-indigo/30 rounded-2xl p-6">
                    <p className="text-text-light/70">
                      The correct answer has been revealed!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Waiting State */}
            {isLocked && !gameState.answerRevealed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "linear",
                  }}
                  className="w-12 h-12 border-4 border-indigo border-t-transparent rounded-full mx-auto mb-4"
                />
                <p className="text-text-light/70">Waiting for results...</p>
              </motion.div>
            )}
          </div>
        </div>

        <DeleteConfirmationModal
          playerMode={true}
          isOpen={isExitModalOpen}
          onClose={() => dispatch(setIsExitModalOpen(false))}
          onConfirm={handleConfirmExit}
          title="Exit Game"
          itemName="game"
          description="You won't be able to rejoin with the same name if you leave now."
        />

        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}

        <ThankYouModal
          isOpen={showThankYouModal}
          hostName={hostName}
          playerName={playerName}
          onClose={() => dispatch(setShowThankYouModal(false))}
        />
      </>
    );
  }

  // Fallback: Game in progress but no question active yet
  return (
    <>
      <div className="min-h-screen bg-deep-navy text-text-light flex items-center justify-center p-4">
        <button
          onClick={handleExitGame}
          className="absolute top-4 right-4 w-10 h-10 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
          title="Exit Game"
        >
          <X className="w-5 h-5" />
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-card-bg rounded-xl border border-indigo/20 shadow-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-text-light mb-4">
              {gameState.status === "QUESTION_ENDED"
                ? "Question ended"
                : "Game in progress..."}
            </h2>
            <p className="text-text-light/70">
              {gameState.status === "QUESTION_ENDED"
                ? "Waiting for next question."
                : "Waiting for the host to start the first question."}
            </p>
          </div>
        </motion.div>
      </div>

      <GameWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => dispatch(setShowWelcomeModal(false))}
        playerName={playerName}
        hostName={hostName}
        sessionCode={sessionCode}
      />

      <DeleteConfirmationModal
        playerMode={true}
        isOpen={isExitModalOpen}
        onClose={() => dispatch(setIsExitModalOpen(false))}
        onConfirm={handleConfirmExit}
        title="Exit Game"
        itemName="game"
        description="You won't be able to rejoin with the same name if you leave now."
      />

      {playerName && playerId && (
        <WinnerDisplay
          isOpen={showWinnerDisplay}
          playerName={playerName}
          playerId={playerId}
          leaderboard={leaderboard}
        />
      )}

      <ThankYouModal
        isOpen={showThankYouModal}
        hostName={hostName}
        playerName={playerName}
        onClose={() => dispatch(setShowThankYouModal(false))}
      />
    </>
  );
}
