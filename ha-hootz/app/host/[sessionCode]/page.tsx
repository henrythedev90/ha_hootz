"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import SessionQRCode from "@/components/SessionQRCode";
import Loading from "@/components/Loading";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function HostDashboard() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionCode = params.sessionCode as string;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [players, setPlayers] = useState<
    Array<{ playerId: string; name: string }>
  >([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!sessionCode) return;

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
      console.log("✅ Host connected to server");
      setConnected(true);
      // Host should join the session room
      newSocket.emit("host-join", { sessionCode });
    });

    newSocket.on(
      "host-joined",
      (data: {
        sessionCode: string;
        players: Array<{ playerId: string; name: string }>;
      }) => {
        console.log("👑 Host joined session:", data);
        setPlayers(data.players || []);
      }
    );

    newSocket.on(
      "player-joined",
      (data: { playerId: string; name: string; sessionCode: string }) => {
        console.log("👤 Player joined:", data);
        setPlayers((prev) => {
          // Check if player already exists
          const exists = prev.some((p) => p.playerId === data.playerId);
          if (exists) return prev;
          return [...prev, { playerId: data.playerId, name: data.name }];
        });
      }
    );

    newSocket.on(
      "player-left",
      (data: { playerId: string; name: string; sessionCode: string }) => {
        console.log("👋 Player left:", data);
        setPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));
      }
    );

    newSocket.on(
      "game-started",
      (data: { status: string; questionIndex: number }) => {
        console.log("🎮 Game started:", data);
        setGameState((prev: any) => ({ ...prev, ...data }));
      }
    );

    newSocket.on(
      "question-started",
      (data: { question: any; questionIndex: number; endAt: number }) => {
        console.log("❓ Question started:", data);
        setGameState((prev: any) => ({
          ...prev,
          status: "QUESTION_ACTIVE",
          ...data,
        }));
      }
    );

    newSocket.on("disconnect", () => {
      console.log("🔌 Host disconnected from server");
      setConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionCode]);

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("START_GAME", { sessionCode });
  };

  const handleStartQuestion = (questionIndex: number, question: any) => {
    if (!socket) return;
    socket.emit("START_QUESTION", {
      sessionCode,
      question,
      questionIndex,
    });
  };

  if (status === "loading") {
    return <Loading />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Host Dashboard
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SessionQRCode
              sessionCode={sessionCode}
              joinUrl={`/join/${sessionCode}`}
            />

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Players ({players.length})
              </h3>
              {players.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No players joined yet
                </p>
              ) : (
                <ul className="space-y-2">
                  {players.map((player) => (
                    <li
                      key={player.playerId}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      👤 {player.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            {gameState?.status !== "IN_PROGRESS" && (
              <button
                onClick={handleStartGame}
                disabled={!connected || players.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
