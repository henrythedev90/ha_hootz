"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Loading from "@/components/Loading";

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

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Timer countdown effect
  useEffect(() => {
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
      setIsTimerExpired(false);
    }
  }, [
    gameState?.status,
    gameState?.endAt,
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
      (data: { gameState: GameState; playerCount?: number }) => {
        console.log("✅ Joined session:", data);
        setGameState(data.gameState);
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
            } as GameState)
        );
        setSelectedAnswer(null);
        setIsTimerExpired(false);
      }
    );

    newSocket.on(
      "answer-revealed",
      (data: {
        questionIndex: number;
        correctAnswer: "A" | "B" | "C" | "D";
      }) => {
        console.log("✅ Answer revealed:", data);
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
      (data: { accepted: boolean; updated?: boolean }) => {
        if (data.accepted) {
          console.log(
            data.updated ? "✅ Answer updated" : "✅ Answer submitted"
          );
        }
      }
    );

    newSocket.on("session-cancelled", (data: { message: string }) => {
      console.log("❌ Session cancelled:", data);
      setError(data.message || "The host has cancelled this session");
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: "QUESTION_ENDED",
            }
          : null
      );
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

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      newSocket.disconnect();
    };
  }, [sessionCode, playerName]);

  const handleAnswerSelect = (answer: "A" | "B" | "C" | "D") => {
    if (!socket || !gameState || isTimerExpired) return;
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

  if (error && !connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!connected || !gameState) {
    return <Loading message="Connecting to game..." />;
  }

  // Lobby / Waiting Room
  if (gameState.status === "WAITING") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Waiting for the host to start the game...
            </h2>
            {playerCount > 0 && (
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                {playerCount} {playerCount === 1 ? "player" : "players"} waiting
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Question View - Show when question is active OR when game is in progress with a question
  if (
    gameState.question &&
    (gameState.status === "QUESTION_ACTIVE" ||
      gameState.status === "IN_PROGRESS" ||
      gameState.status === "QUESTION_ENDED")
  ) {
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
        gameState.answerRevealed && gameState.correctAnswer === option;
      const isIncorrect = gameState.answerRevealed && isSelected && !isCorrect;

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col p-4">
        <div className="max-w-md mx-auto w-full flex flex-col flex-1">
          {/* Timer - Visually prominent */}
          <div className="text-center mb-6">
            <div
              className={`text-6xl font-bold ${getTimerColor()} transition-colors`}
            >
              {timeRemaining}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              seconds remaining
            </div>
          </div>

          {/* Question */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 flex-1 flex items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {gameState.question.text}
            </h2>
          </div>

          {/* Answer Buttons - Stacked vertically, large and touch-friendly */}
          <div className="space-y-4 mb-4">
            {(["A", "B", "C", "D"] as const).map((option) => (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={
                  isTimerExpired || gameState.status === "QUESTION_ENDED"
                }
                className={getAnswerButtonClass(option)}
              >
                <span className="font-bold mr-3">{option}:</span>
                {gameState.question![option]}
                {gameState.answerRevealed &&
                  gameState.correctAnswer === option && (
                    <span className="ml-auto">✓ Correct</span>
                  )}
              </button>
            ))}
          </div>

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
      </div>
    );
  }

  // Fallback: No question available
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {gameState.status === "QUESTION_ENDED"
              ? "Question ended"
              : "Game in progress..."}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Waiting for next question.
          </p>
        </div>
      </div>
    </div>
  );
}
