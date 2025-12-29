"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
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
  clearError,
} from "@/store/slices/uiSlice";

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionCode = params.sessionCode as string;
  const playerName = searchParams.get("name");

  // Redux state
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.game.gameState);
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
          console.log("❌ Session has ended, showing ended message");
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
      console.log("❌ Session has ended, not connecting socket");
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
      console.log("✅ Connected to server");
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
        console.log("✅ Joined session:", data);
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
      console.log("👤 Player joined:", data);
      if (data.playerCount !== undefined) {
        dispatch(setPlayerCount(data.playerCount));
      }
    });

    newSocket.on("player-left", (data: { playerCount?: number }) => {
      console.log("👋 Player left:", data);
      if (data.playerCount !== undefined) {
        dispatch(setPlayerCount(data.playerCount));
      }
    });

    newSocket.on(
      "game-started",
      (data: { status: string; questionIndex: number }) => {
        console.log("🎮 Game started:", data);
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
        console.log("❓ Question started:", data);
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
      console.log("⏹️ Question ended:", data);
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
        console.log("📄 Question navigated:", data);
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
        console.log("✅ Answer revealed:", data);
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
          console.log(
            data.updated ? "✅ Answer updated" : "✅ Answer submitted"
          );
        } else {
          console.error("❌ Answer rejected:", data.reason);
          if (data.reason) {
            alert(`Answer not accepted: ${data.reason}`);
          }
        }
      }
    );

    newSocket.on("session-cancelled", (data: { message?: string }) => {
      console.log("❌ Player: Session cancelled event received:", data);
      console.log("🎉 Player: Showing thank you modal");
      dispatch(setShowThankYouModal(true));
      dispatch(updateGameState({ status: "QUESTION_ENDED" }));
      console.log("🔌 Player: Disconnecting socket after session cancellation");
      newSocket.disconnect();
      dispatch(setConnected(false));
    });

    newSocket.on("force-disconnect", (data: { reason: string }) => {
      console.log("🔌 Force disconnect:", data);
      dispatch(setError(data.reason || "Another connection detected"));
      newSocket.disconnect();
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
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
        console.log("🏆 Player: Winner revealed event received:", data);
        console.log(
          "🏆 Player: Setting leaderboard and showing winner display"
        );
        dispatch(setLeaderboard(data.leaderboard));
        dispatch(setShowWinnerDisplay(true));
        console.log("🏆 Player: showWinnerDisplay set to true");
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
        <CenteredLayout>
          <div className="bg-card-bg rounded-lg shadow-md p-8 max-w-md w-full text-center border border-indigo/20">
            <h1 className="text-2xl font-bold mb-4">
              {isGoodbye ? (
                <span className="text-blue-600 dark:text-blue-400">
                  Goodbye!
                </span>
              ) : isCancelled ? (
                <span className="text-red-600 dark:text-red-400">
                  Session Cancelled
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">Error</span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {displayMessage}
            </p>
            {isGoodbye ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Thanks for playing! You can close this page.
                </p>
                {playerName && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Hey {playerName}! Did you enjoy playing?
                    </p>
                    <button
                      onClick={() => (window.location.href = "/auth/signup")}
                      className="w-full px-6 py-3 bg-indigo text-white rounded-lg hover:bg-indigo/90 transition-colors font-medium shadow-md"
                    >
                      Create Your Own Ha-Hootz Account
                    </button>
                    <p className="text-xs text-text-light/60 mt-2">
                      Host your own trivia games and create engaging
                      presentations!
                    </p>
                  </div>
                )}
              </div>
            ) : isCancelled ? (
              <div className="space-y-4">
                <p className="text-sm text-text-light/60">
                  The host has ended this session. You can close this page.
                </p>
                {playerName && (
                  <div className="pt-4 border-t border-indigo/20">
                    <p className="text-sm text-text-light/80 mb-3">
                      Hey {playerName}! Did you enjoy playing?
                    </p>
                    <button
                      onClick={() => (window.location.href = "/auth/signup")}
                      className="w-full px-6 py-3 bg-indigo text-white rounded-lg hover:bg-indigo/90 transition-colors font-medium shadow-md"
                    >
                      Create Your Own Ha-Hootz Account
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Host your own trivia games and create engaging
                      presentations!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please check your connection and try again.
              </p>
            )}
          </div>
        </CenteredLayout>

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
          <div className="bg-card-bg rounded-lg shadow-md p-8 max-w-md w-full text-center border border-indigo/20">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              Game Session Ended
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
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
                className="block w-full px-6 py-3 bg-indigo text-white rounded-lg hover:bg-indigo/90 transition-colors font-medium shadow-md"
              >
                Go to Dashboard
              </a>
              <button
                onClick={() => (window.location.href = "/auth/signup")}
                className="w-full px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium shadow-md"
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
        <CenteredLayout relative>
          <button
            onClick={handleExitGame}
            className="absolute top-4 right-4 w-10 h-10 bg-error hover:bg-error/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
            title="Exit Game"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="w-full max-w-md">
            <div className="bg-card-bg rounded-lg shadow-md p-8 text-center border border-indigo/20">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Ha-Hootz!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                You're all set! We're waiting for{" "}
                {hostName ? (
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {hostName}
                  </span>
                ) : (
                  "the host"
                )}{" "}
                to start the presentation.
              </p>
              {playerCount > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                    Players in lobby
                  </p>
                  <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                    {playerCount} {playerCount === 1 ? "player" : "players"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CenteredLayout>

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
    const getTimerColor = () => {
      if (timeRemaining <= 5) return "text-red-600 dark:text-red-400";
      if (timeRemaining <= 10) return "text-orange-600 dark:text-orange-400";
      return "text-blue-600 dark:text-blue-400";
    };

    const getAnswerButtonClass = (option: "A" | "B" | "C" | "D") => {
      const baseClass =
        "w-full px-6 py-6 text-left rounded-lg transition-all font-medium text-lg";
      const isSelected = selectedAnswer === option;
      const isDisabled =
        isTimerExpired || gameState.status === "QUESTION_ENDED";
      const isCorrect =
        gameState.status === "QUESTION_ENDED" &&
        gameState.answerRevealed &&
        gameState.correctAnswer === option;
      const isIncorrect =
        gameState.status === "QUESTION_ENDED" &&
        gameState.answerRevealed &&
        isSelected &&
        !isCorrect;

      if (isDisabled && !gameState.answerRevealed) {
        return `${baseClass} bg-card-bg border border-indigo/20 text-text-light/40 cursor-not-allowed`;
      }

      if (isCorrect) {
        return `${baseClass} bg-success text-white shadow-lg border-4 border-success/80`;
      }

      if (isIncorrect) {
        return `${baseClass} bg-error text-white`;
      }

      if (isSelected && !gameState.answerRevealed) {
        return `${baseClass} bg-success text-white shadow-lg transform scale-105`;
      }

      if (isDisabled) {
        return `${baseClass} bg-card-bg border border-indigo/20 text-text-light/40 cursor-not-allowed`;
      }

      return `${baseClass} bg-indigo text-white hover:bg-indigo/90 active:scale-95`;
    };

    return (
      <>
        <CenteredLayout relative flexCol>
          <button
            onClick={handleExitGame}
            className="absolute top-4 right-4 w-10 h-10 bg-error hover:bg-error/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
            title="Exit Game"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="max-w-md mx-auto w-full flex flex-col flex-1">
            {isQuestionActive && (
              <div className="text-center mb-6">
                <div
                  className={`text-6xl font-bold ${getTimerColor()} transition-colors`}
                >
                  {timeRemaining}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Seconds Remaining
                </div>
              </div>
            )}

            {playerName && (
              <div className="text-center mb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {playerName}
                </h1>
              </div>
            )}

            <div className="bg-card-bg rounded-lg shadow-md p-6 mb-6 flex-1 flex items-center border border-indigo/20">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                {gameState.question.text}
              </h2>
            </div>

            {showAnswerButtons ? (
              <div className="space-y-4 mb-4">
                {(["A", "B", "C", "D"] as const).map((option) => {
                  const showCorrectIndicator =
                    gameState.answerRevealed &&
                    gameState.correctAnswer === option &&
                    gameState.status === "QUESTION_ENDED";

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={
                        gameState.status === "QUESTION_ENDED" ||
                        gameState.answerRevealed
                      }
                      className={getAnswerButtonClass(option)}
                    >
                      <span className="font-bold mr-3">{option}:</span>
                      {gameState.question![option]}
                      {showCorrectIndicator && (
                        <span className="ml-auto"> ✓ Correct</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
                  <p className="text-lg text-gray-700 dark:text-gray-200 mb-2">
                    Waiting for host to start the question...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Answer buttons will appear when the question begins
                  </p>
                </div>
              </div>
            )}

            {isTimerExpired && !gameState.answerRevealed && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Time's up! Your answer has been submitted.
              </div>
            )}
            {gameState.answerRevealed && (
              <div className="text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                The correct answer has been revealed!
              </div>
            )}
            {gameState.status === "IN_PROGRESS" &&
              !gameState.answerRevealed &&
              !isTimerExpired && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Waiting for host to start the question...
                </div>
              )}
          </div>
        </CenteredLayout>

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
      <CenteredLayout relative>
        <button
          onClick={handleExitGame}
          className="absolute top-4 right-4 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
          title="Exit Game"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {gameState.status === "QUESTION_ENDED"
                ? "Question ended"
                : "Game in progress..."}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {gameState.status === "QUESTION_ENDED"
                ? "Waiting for next question."
                : "Waiting for the host to start the first question."}
            </p>
          </div>
        </div>
      </CenteredLayout>

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
