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

    newSocket.on("join-error", (data: { reason: string }) => {
      console.error("❌ Join error:", data);
      setError(data.reason || "Failed to join session");
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

  // Active Question View
  if (gameState.status === "QUESTION_ACTIVE" && gameState.question) {
    const getTimerColor = () => {
      if (timeRemaining <= 5) return "text-red-600 dark:text-red-400";
      if (timeRemaining <= 10) return "text-orange-600 dark:text-orange-400";
      return "text-blue-600 dark:text-blue-400";
    };

    const getAnswerButtonClass = (option: "A" | "B" | "C" | "D") => {
      const baseClass =
        "w-full px-6 py-6 text-left rounded-lg transition-all font-medium text-lg";
      const isSelected = selectedAnswer === option;
      const isDisabled = isTimerExpired;

      if (isDisabled) {
        return `${baseClass} bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed`;
      }

      if (isSelected) {
        return `${baseClass} bg-green-600 dark:bg-green-700 text-white shadow-lg transform scale-105`;
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
                disabled={isTimerExpired}
                className={getAnswerButtonClass(option)}
              >
                <span className="font-bold mr-3">{option}:</span>
                {gameState.question![option]}
              </button>
            ))}
          </div>

          {/* Status indicator */}
          {isTimerExpired && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Time's up! Your answer has been submitted.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Question ended or game in progress
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
