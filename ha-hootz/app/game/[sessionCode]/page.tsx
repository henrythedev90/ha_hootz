"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Loading from "@/components/Loading";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import CenteredLayout from "@/components/CenteredLayout";
import GameWelcomeModal from "@/components/GameWelcomeModal";
import WinnerDisplay from "@/components/WinnerDisplay";

type GameStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "QUESTION_ACTIVE"
  | "QUESTION_ENDED";

interface GameState {
  status: GameStatus;
  sessionId?: string;
  questionIndex?: number;
  questionCount?: number;
  question?: {
    text: string;
    A: string;
    B: string;
    C: string;
    D: string;
  };
  endAt?: number;
  playerAnswers?: Record<number, string>;
  answerRevealed?: boolean;
  correctAnswer?: "A" | "B" | "C" | "D";
}

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionCode = params.sessionCode as string;
  const playerName = searchParams.get("name");

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<
    "A" | "B" | "C" | "D" | null
  >(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [error, setError] = useState("");
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [showWinnerDisplay, setShowWinnerDisplay] = useState(false);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ playerId: string; name: string; score: number }>
  >([]);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch host name when component mounts
  useEffect(() => {
    const fetchHostName = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}/host`);
        const data = await response.json();
        if (data.success && data.hostName) {
          setHostName(data.hostName);
        }
      } catch (error) {
        console.error("Error fetching host name:", error);
      }
    };

    if (sessionCode) {
      fetchHostName();
    }
  }, [sessionCode]);

  // Timer countdown effect
  useEffect(() => {
    // Set timer to 0 if answer is revealed
    if (gameState?.answerRevealed) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeRemaining(0);
      setIsTimerExpired(true);
      return;
    }

    if (gameState?.status === "QUESTION_ACTIVE" && gameState.endAt) {
      const updateTimer = () => {
        const remaining = Math.max(
          0,
          Math.floor((gameState.endAt! - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
        setIsTimerExpired(remaining === 0);

        if (remaining === 0 && selectedAnswer && socket) {
          // Auto-submit when timer expires
          socket.emit("SUBMIT_ANSWER", {
            gameId: gameState.sessionId,
            questionIndex: gameState.questionIndex,
            answer: selectedAnswer,
          });
        }
      };

      updateTimer(); // Initial update
      timerIntervalRef.current = setInterval(updateTimer, 100); // Update every 100ms for smooth countdown

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    } else {
      setTimeRemaining(0);
      // Only set timer as expired if question has explicitly ended
      setIsTimerExpired(gameState?.status === "QUESTION_ENDED");
    }
  }, [
    gameState?.status,
    gameState?.endAt,
    gameState?.answerRevealed,
    selectedAnswer,
    socket,
    gameState?.sessionId,
    gameState?.questionIndex,
  ]);

  // Socket.io connection and event handlers
  useEffect(() => {
    if (!playerName || !sessionCode) {
      setError("Missing player name or session code");
      return;
    }

    // Initialize Socket.io connection
    const newSocket = io("/", {
      path: "/api/socket",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to server");
      setConnected(true);

      // Emit join-session event with nickname
      newSocket.emit("join-session", {
        sessionCode,
        name: playerName,
      });
    });

    newSocket.on(
      "joined-session",
      (data: {
        gameState: GameState;
        sessionId?: string;
        playerId?: string;
        playerCount?: number;
      }) => {
        console.log("✅ Joined session:", data);
        // Store playerId
        if (data.playerId) {
          setPlayerId(data.playerId);
        }
        // Ensure sessionId is set in gameState (needed for answer submission)
        setGameState({
          ...data.gameState,
          sessionId: data.sessionId || data.gameState.sessionId,
        });
        if (data.playerCount !== undefined) {
          setPlayerCount(data.playerCount);
        }
        // Restore previous answer if reconnected
        if (
          data.gameState.playerAnswers &&
          data.gameState.questionIndex !== undefined
        ) {
          const prevAnswer =
            data.gameState.playerAnswers[data.gameState.questionIndex];
          if (prevAnswer) {
            setSelectedAnswer(prevAnswer as "A" | "B" | "C" | "D");
          }
        }

        // Reset timer expired state when reconnecting to an active question
        // This allows players to submit answers even if the timer appears expired
        // The server will validate if the question is still active
        if (data.gameState.status === "QUESTION_ACTIVE") {
          setIsTimerExpired(false);
        }
      }
    );

    newSocket.on("join-error", (data: { reason?: string } | string) => {
      console.error("❌ Join error:", data);
      // Handle both object and string error formats
      const errorMessage =
        typeof data === "string"
          ? data
          : data?.reason || "Failed to join session";
      setError(errorMessage);
    });

    newSocket.on("player-joined", (data: { playerCount?: number }) => {
      console.log("👤 Player joined:", data);
      if (data.playerCount !== undefined) {
        setPlayerCount(data.playerCount);
      }
    });

    newSocket.on("player-left", (data: { playerCount?: number }) => {
      console.log("👋 Player left:", data);
      if (data.playerCount !== undefined) {
        setPlayerCount(data.playerCount);
      }
    });

    newSocket.on(
      "game-started",
      (data: { status: string; questionIndex: number }) => {
        console.log("🎮 Game started:", data);
        setGameState(
          (prev) =>
            ({
              ...prev,
              ...data,
              status: "IN_PROGRESS", // Override status to ensure it's IN_PROGRESS
            } as GameState)
        );
        setSelectedAnswer(null);
        setIsTimerExpired(false);
        // Show welcome modal when game starts
        setShowWelcomeModal(true);
      }
    );

    newSocket.on(
      "question-started",
      (data: {
        question: { text: string; A: string; B: string; C: string; D: string };
        questionIndex: number;
        endAt: number;
      }) => {
        console.log("❓ Question started:", data);
        setGameState(
          (prev) =>
            ({
              ...prev,
              status: "QUESTION_ACTIVE",
              question: data.question,
              questionIndex: data.questionIndex,
              endAt: data.endAt,
            } as GameState)
        );
        setSelectedAnswer(null);
        setIsTimerExpired(false);
        // Close welcome modal when question starts
        setShowWelcomeModal(false);
      }
    );

    newSocket.on("question-ended", (data: any) => {
      console.log("⏹️ Question ended:", data);
      setGameState(
        (prev) =>
          ({
            ...prev,
            status: "QUESTION_ENDED",
          } as GameState)
      );
      setIsTimerExpired(true);
    });

    newSocket.on(
      "question-navigated",
      (data: {
        questionIndex: number;
        question: { text: string; A: string; B: string; C: string; D: string };
      }) => {
        console.log("📄 Question navigated:", data);
        setGameState(
          (prev) =>
            ({
              ...prev,
              status: "IN_PROGRESS",
              questionIndex: data.questionIndex,
              question: data.question,
              endAt: undefined,
              answerRevealed: false, // Reset answer revealed state
              correctAnswer: undefined, // Reset correct answer
            } as GameState)
        );
        setSelectedAnswer(null); // Reset selected answer
        setIsTimerExpired(false);
        setTimeRemaining(0); // Reset timer
      }
    );

    newSocket.on(
      "answer-revealed",
      (data: {
        questionIndex: number;
        correctAnswer: "A" | "B" | "C" | "D";
      }) => {
        console.log("✅ Answer revealed:", data);
        // Stop the timer and set it to 0 when answer is revealed
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setTimeRemaining(0);
        setIsTimerExpired(true);
        // Keep the question view but mark answer as revealed
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                answerRevealed: true,
                correctAnswer: data.correctAnswer,
              }
            : null
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
          // Show error to user if answer was rejected
          if (data.reason) {
            alert(`Answer not accepted: ${data.reason}`);
          }
        }
      }
    );

    newSocket.on("session-cancelled", (data: { message?: string }) => {
      console.log("❌ Session cancelled:", data);
      const errorMessage =
        data.message || "The host has cancelled this session";
      setError(errorMessage);
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: "QUESTION_ENDED",
            }
          : null
      );
      // Disconnect the socket since session is cancelled
      newSocket.disconnect();
      setConnected(false);
    });

    newSocket.on("force-disconnect", (data: { reason: string }) => {
      console.log("🔌 Force disconnect:", data);
      setError(data.reason || "Another connection detected");
      newSocket.disconnect();
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setError("Failed to connect to server");
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
        setLeaderboard(data.leaderboard);
        setShowWinnerDisplay(true);
        console.log("🏆 Player: showWinnerDisplay set to true");
      }
    );

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      newSocket.disconnect();
    };
  }, [sessionCode, playerName]);

  const handleAnswerSelect = (answer: "A" | "B" | "C" | "D") => {
    if (!socket || !gameState) return;
    // Only allow if question is active - server will validate if timer has expired
    if (gameState.status !== "QUESTION_ACTIVE") return;

    // Update selected answer immediately (optimistic UI)
    setSelectedAnswer(answer);

    // Emit answer to server (allows changing answers while timer is active)
    socket.emit("SUBMIT_ANSWER", {
      gameId: gameState.sessionId,
      questionIndex: gameState.questionIndex,
      answer,
    });
  };

  const handleExitGame = () => {
    setIsExitModalOpen(true);
  };

  const handleConfirmExit = () => {
    // Emit leave-game event to server
    if (socket) {
      socket.emit("leave-game", { sessionCode });
    }

    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
    setConnected(false);
    setError("You have left the game. You cannot rejoin with the same name.");
    setIsExitModalOpen(false);
  };

  // Show error screen if there's an error (including session cancelled)
  if (error) {
    const isCancelled = error.includes("cancelled");
    return (
      <>
        <CenteredLayout>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              {isCancelled ? "Session Cancelled" : "Error"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            {isCancelled ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  The host has ended this session. You can close this page.
                </p>
                {playerName && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Hey {playerName}! Did you enjoy playing?
                    </p>
                    <button
                      onClick={() => (window.location.href = "/auth/signup")}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-md"
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

        {/* Exit Game Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isExitModalOpen}
          playerMode={true}
          onClose={() => setIsExitModalOpen(false)}
          onConfirm={handleConfirmExit}
          title="Exit Game"
          itemName="game"
          description="You won't be able to rejoin with the same name if you leave now."
        />

        {/* Winner Display - Full screen overlay */}
        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}
      </>
    );
  }

  if (!connected || !gameState) {
    return (
      <>
        <Loading message="Connecting to game..." />
        {/* Winner Display - Full screen overlay */}
        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}
      </>
    );
  }

  // Lobby / Waiting Room - Welcome Screen
  if (gameState.status === "WAITING") {
    return (
      <>
        <CenteredLayout relative>
          {/* Exit Button - Fixed position top right */}
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

        {/* Exit Game Confirmation Modal */}
        <DeleteConfirmationModal
          playerMode={true}
          isOpen={isExitModalOpen}
          onClose={() => setIsExitModalOpen(false)}
          onConfirm={handleConfirmExit}
          title="Exit Game"
          itemName="game"
          description="You won't be able to rejoin with the same name if you leave now."
        />

        {/* Winner Display - Full screen overlay */}
        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}
      </>
    );
  }

  // Active Question View - Show when question is active, ended, or in progress
  // But answer buttons only show when question is ACTIVE or ENDED (not just IN_PROGRESS)
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
      // Only show correct/incorrect styling when question has ended AND answer is revealed
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
        return `${baseClass} bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed`;
      }

      // Show correct answer highlighted when revealed
      if (isCorrect) {
        return `${baseClass} bg-green-600 dark:bg-green-700 text-white shadow-lg border-4 border-green-400`;
      }

      // Show incorrect selected answer when revealed
      if (isIncorrect) {
        return `${baseClass} bg-red-600 dark:bg-red-700 text-white`;
      }

      if (isSelected && !gameState.answerRevealed) {
        return `${baseClass} bg-green-600 dark:bg-green-700 text-white shadow-lg transform scale-105`;
      }

      if (isDisabled) {
        return `${baseClass} bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed`;
      }

      return `${baseClass} bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95`;
    };

    return (
      <>
        <CenteredLayout relative flexCol>
          {/* Exit Button - Fixed position top right */}
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

          <div className="max-w-md mx-auto w-full flex flex-col flex-1">
            {/* Timer - Only show when question is active */}
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

            {/* Player Name Title */}
            {playerName && (
              <div className="text-center mb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {playerName}
                </h1>
              </div>
            )}

            {/* Question */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 flex-1 flex items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                {gameState.question.text}
              </h2>
            </div>

            {/* Answer Buttons - Only show when question is active or ended */}
            {showAnswerButtons ? (
              <div className="space-y-4 mb-4">
                {(["A", "B", "C", "D"] as const).map((option) => {
                  // Only show correct indicator if answer is revealed AND question is ended
                  const showCorrectIndicator =
                    gameState.answerRevealed &&
                    gameState.correctAnswer === option &&
                    gameState.status === "QUESTION_ENDED";

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={
                        // Only disable if question has explicitly ended
                        // Don't disable just because timer expired - server will validate
                        gameState.status === "QUESTION_ENDED"
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

            {/* Status indicator */}
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

        {/* Exit Game Confirmation Modal */}
        <DeleteConfirmationModal
          playerMode={true}
          isOpen={isExitModalOpen}
          onClose={() => setIsExitModalOpen(false)}
          onConfirm={handleConfirmExit}
          title="Exit Game"
          itemName="game"
          description="You won't be able to rejoin with the same name if you leave now."
        />

        {/* Winner Display - Full screen overlay */}
        {playerName && playerId && (
          <WinnerDisplay
            isOpen={showWinnerDisplay}
            playerName={playerName}
            playerId={playerId}
            leaderboard={leaderboard}
          />
        )}
      </>
    );
  }

  // Fallback: Game in progress but no question active yet
  // Show welcome modal and waiting screen
  return (
    <>
      <CenteredLayout relative>
        {/* Exit Button - Fixed position top right */}
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

      {/* Game Welcome Modal - Shows when game starts but before first question */}
      <GameWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        playerName={playerName}
        hostName={hostName}
        sessionCode={sessionCode}
      />

      {/* Exit Game Confirmation Modal */}
      <DeleteConfirmationModal
        playerMode={true}
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirm={handleConfirmExit}
        title="Exit Game"
        itemName="game"
        description="You won't be able to rejoin with the same name if you leave now."
      />

      {/* Winner Display - Full screen overlay */}
      {console.log("🎯 Game Page - WinnerDisplay render check:", {
        showWinnerDisplay,
        playerName,
        playerId,
        leaderboardLength: leaderboard.length,
        willRender: !!(playerName && playerId),
      })}
      {playerName && playerId && (
        <WinnerDisplay
          isOpen={showWinnerDisplay}
          playerName={playerName}
          playerId={playerId}
          leaderboard={leaderboard}
        />
      )}
    </>
  );
}
