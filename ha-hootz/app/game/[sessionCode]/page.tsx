"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Loading from "@/components/Loading";

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionCode = params.sessionCode as string;
  const playerName = searchParams.get("name");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [players, setPlayers] = useState<Array<{ playerId: string; name: string }>>([]);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

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

      // Join session
      newSocket.emit("join-session", {
        sessionCode,
        name: playerName,
      });
    });

    newSocket.on("joined-session", (data) => {
      console.log("✅ Joined session:", data);
      setGameState(data.gameState);
    });

    newSocket.on("join-error", (data) => {
      console.error("❌ Join error:", data);
      setError(data.reason || "Failed to join session");
    });

    newSocket.on("player-joined", (data) => {
      console.log("👤 Player joined:", data);
      // Update players list (you might want to fetch from server)
    });

    newSocket.on("player-left", (data) => {
      console.log("👋 Player left:", data);
    });

    newSocket.on("game-started", (data) => {
      console.log("🎮 Game started:", data);
      setGameState((prev: any) => ({ ...prev, ...data }));
    });

    newSocket.on("question-started", (data) => {
      console.log("❓ Question started:", data);
      setGameState((prev: any) => ({
        ...prev,
        status: "QUESTION_ACTIVE",
        ...data,
      }));
    });

    newSocket.on("force-disconnect", (data) => {
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
      newSocket.disconnect();
    };
  }, [sessionCode, playerName]);

  const handleSubmitAnswer = (answer: "A" | "B" | "C" | "D") => {
    if (!socket || !gameState) return;

    socket.emit("SUBMIT_ANSWER", {
      gameId: gameState.sessionId,
      questionIndex: gameState.questionIndex,
      answer,
    });
  };

  if (error && !connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {playerName}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Session: {sessionCode}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}
              </div>
            </div>
          </div>
        </div>

        {gameState.status === "WAITING" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Waiting for game to start...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              The host will start the game soon.
            </p>
          </div>
        )}

        {gameState.status === "QUESTION_ACTIVE" && gameState.question && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {gameState.question.text}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {["A", "B", "C", "D"].map((option) => (
                <button
                  key={option}
                  onClick={() => handleSubmitAnswer(option as "A" | "B" | "C" | "D")}
                  className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
                >
                  {option}: {gameState.question[option]}
                </button>
              ))}
            </div>
            {gameState.endAt && (
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Time remaining:{" "}
                {Math.max(0, Math.floor((gameState.endAt - Date.now()) / 1000))}s
              </div>
            )}
          </div>
        )}

        {gameState.status === "IN_PROGRESS" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Game in progress...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Waiting for next question.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

