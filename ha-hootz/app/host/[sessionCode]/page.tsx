"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import SessionQRCode from "@/components/SessionQRCode";
import Loading from "@/components/Loading";
import CenteredLayout from "@/components/CenteredLayout";
import PlayersListModal from "@/components/PlayersListModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Question {
  text: string;
  A: string;
  B: string;
  C: string;
  D: string;
  correct: "A" | "B" | "C" | "D";
  index: number;
}

interface GameState {
  status: "WAITING" | "IN_PROGRESS" | "QUESTION_ACTIVE" | "QUESTION_ENDED";
  questionIndex?: number;
  questionCount?: number;
  question?: Question;
  endAt?: number;
  answerRevealed?: boolean;
  correctAnswer?: "A" | "B" | "C" | "D";
}

interface Stats {
  playerCount: number;
  answerCount: number;
  answerDistribution: { A: number; B: number; C: number; D: number };
}

export default function HostDashboard() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionCode = params.sessionCode as string;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<
    Array<{ playerId: string; name: string }>
  >([]);
  const [stats, setStats] = useState<Stats>({
    playerCount: 0,
    answerCount: 0,
    answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
  });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<
    "waiting" | "live" | "ended" | null
  >(null);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch questions and game state when component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}/questions`);
        const data = await response.json();
        if (data.success && data.questions) {
          setQuestions(data.questions);
          return data.questions;
        }
        return [];
      } catch (error) {
        console.error("Error fetching questions:", error);
        return [];
      }
    };

    const fetchSessionStatus = async () => {
      try {
        const response = await fetch(`/api/sessions/validate/${sessionCode}`);
        const data = await response.json();
        if (data.sessionStatus) {
          setSessionStatus(data.sessionStatus);
        }
      } catch (error) {
        console.error("Error fetching session status:", error);
      }
    };

    const fetchGameState = async (questionCount: number) => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}/game-state`);
        const data = await response.json();
        if (data.success && data.gameState) {
          console.log("🔄 Restored game state on mount:", data.gameState);
          setGameState({
            ...data.gameState,
            questionCount: questionCount || data.gameState.questionCount,
          });
        }
      } catch (error) {
        console.error("Error fetching game state:", error);
      }
    };

    if (sessionCode) {
      fetchQuestions().then(async (questionsData) => {
        // Fetch game state after questions are loaded
        const questionCount = questionsData?.length || 0;
        await fetchGameState(questionCount);
      });
      fetchSessionStatus();
    }
  }, [sessionCode]);

  // Timer countdown effect
  useEffect(() => {
    if (gameState?.status === "QUESTION_ACTIVE" && gameState.endAt) {
      const updateTimer = () => {
        const remaining = Math.max(
          0,
          Math.floor((gameState.endAt! - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);

        if (remaining === 0) {
          // Auto-end question when timer expires
          if (socket) {
            socket.emit("END_QUESTION", {
              sessionCode,
              questionIndex: gameState.questionIndex,
            });
          }
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
      setTimeRemaining(0);
    }
  }, [
    gameState?.status,
    gameState?.endAt,
    socket,
    sessionCode,
    gameState?.questionIndex,
  ]);

  // Fetch stats periodically
  useEffect(() => {
    if (!connected) return;
    // Check if questionIndex is defined (including 0)
    const questionIndex = gameState?.questionIndex;
    if (questionIndex === undefined) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(
          `/api/sessions/${sessionCode}/stats?questionIndex=${questionIndex}`
        );
        const data = await response.json();
        if (data.success) {
          setStats({
            playerCount: data.playerCount,
            answerCount: data.answerCount || 0,
            answerDistribution: data.answerDistribution || {
              A: 0,
              B: 0,
              C: 0,
              D: 0,
            },
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000); // Update every 1 second for real-time updates

    return () => clearInterval(interval);
  }, [connected, sessionCode, gameState?.questionIndex]);

  // Verify authentication and host ownership
  useEffect(() => {
    // Wait for session to finish loading
    if (status === "loading") return;

    // Only redirect if we're certain the user is not authenticated
    if (status === "unauthenticated" || (!session && status !== "loading")) {
      router.push("/auth/signin");
      return;
    }

    // Verify user is the host of this session
    const verifyHostOwnership = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}/questions`);
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // User is not authorized or not the host
            router.push("/");
            return;
          }
        }
        // If successful, user is the host (API route verifies ownership)
      } catch (error) {
        console.error("Error verifying host ownership:", error);
        router.push("/");
      }
    };

    if (session && sessionCode) {
      verifyHostOwnership();
    }
  }, [session, status, router, sessionCode]);

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
      // Emit host-join will be handled by separate effect when session is ready
    });

    newSocket.on(
      "host-joined",
      (data: {
        sessionCode: string;
        players: Array<{ playerId: string; name: string }>;
        gameState?: GameState;
      }) => {
        console.log("👑 Host joined session:", data);
        setPlayers(data.players || []);
        setStats((prev) => ({ ...prev, playerCount: data.players.length }));

        // Restore game state if it exists (for reconnections)
        if (data.gameState) {
          console.log("🔄 Restoring game state:", data.gameState);
          setGameState(data.gameState);

          // If there's a question in the state, make sure it's loaded
          if (data.gameState.question) {
            // Question is already in gameState, no need to fetch
          } else if (data.gameState.questionIndex !== undefined) {
            // Fetch the question if we have an index but no question
            const fetchQuestion = async () => {
              try {
                const response = await fetch(
                  `/api/sessions/${sessionCode}/questions`
                );
                const questionsData = await response.json();
                if (questionsData.success && questionsData.questions) {
                  const questionIndex = data.gameState!.questionIndex ?? 0;
                  const question = questionsData.questions[questionIndex];
                  if (question) {
                    setGameState((prev) =>
                      prev
                        ? {
                            ...prev,
                            question,
                          }
                        : null
                    );
                  }
                }
              } catch (error) {
                console.error("Error fetching question on reconnect:", error);
              }
            };
            fetchQuestion();
          }
        }
      }
    );

    newSocket.on(
      "player-joined",
      (data: {
        playerId: string;
        name: string;
        sessionCode: string;
        playerCount?: number;
      }) => {
        console.log("👤 Player joined:", data);
        setPlayers((prev) => {
          const exists = prev.some((p) => p.playerId === data.playerId);
          if (exists) return prev;
          return [...prev, { playerId: data.playerId, name: data.name }];
        });
        if (data.playerCount !== undefined) {
          setStats((prev) => ({
            ...prev,
            playerCount: data.playerCount ?? prev.playerCount,
          }));
        }
      }
    );

    newSocket.on(
      "player-left",
      (data: {
        playerId: string;
        name: string;
        sessionCode: string;
        playerCount?: number;
      }) => {
        console.log("👋 Player left:", data);
        setPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));
        if (data.playerCount !== undefined) {
          setStats((prev) => ({
            ...prev,
            playerCount: data.playerCount ?? prev.playerCount,
          }));
        }
      }
    );

    newSocket.on(
      "game-started",
      (data: { status: string; questionIndex: number }) => {
        console.log("🎮 Game started:", data);
        // Show players modal after game starts
        setShowPlayersModal(true);
        setGameState((prev) => ({
          ...prev,
          status: "IN_PROGRESS",
          questionIndex: data.questionIndex ?? 0,
        }));
      }
    );

    newSocket.on(
      "question-started",
      (data: { question: Question; questionIndex: number; endAt: number }) => {
        console.log("❓ Question started:", data);
        setGameState((prev) => ({
          ...prev,
          status: "QUESTION_ACTIVE",
          question: data.question,
          questionIndex: data.questionIndex,
          endAt: data.endAt,
          answerRevealed: false,
        }));
      }
    );

    newSocket.on("question-ended", (data: { questionIndex: number }) => {
      console.log("⏹️ Question ended:", data);
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: "QUESTION_ENDED",
            }
          : null
      );
    });

    newSocket.on(
      "question-navigated",
      (data: { questionIndex: number; question: Question }) => {
        console.log("📄 Question navigated:", data);
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                questionIndex: data.questionIndex,
                question: data.question,
                status: "IN_PROGRESS",
                answerRevealed: false,
                endAt: undefined,
              }
            : null
        );
      }
    );

    newSocket.on("session-cancelled", () => {
      console.log("❌ Session cancelled");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    });

    newSocket.on("error", (data: { message: string }) => {
      console.error("Socket error:", data);
      alert(data.message);
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Host disconnected from server");
      setConnected(false);
    });

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      newSocket.disconnect();
    };
  }, [sessionCode, router]);

  // Emit host-join when socket is connected and session is ready
  useEffect(() => {
    if (!connected || !socket || status === "loading") return;

    if (session?.user?.id) {
      socket.emit("host-join", { sessionCode, userId: session.user.id });
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [connected, socket, session, status, sessionCode, router]);

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("START_GAME", { sessionCode });
  };

  const handleStartQuestion = () => {
    if (!socket || gameState?.questionIndex === undefined) return;

    // Get question from gameState or from questions array
    const question = gameState.question || questions[gameState.questionIndex];

    if (!question) {
      console.error("No question available to start");
      return;
    }

    socket.emit("START_QUESTION", {
      sessionCode,
      question: {
        text: question.text,
        A: question.A,
        B: question.B,
        C: question.C,
        D: question.D,
        correct: question.correct,
        durationMs: 30000, // Default 30 seconds, can be made configurable
      },
      questionIndex: gameState.questionIndex,
    });
  };

  const handleRevealAnswer = () => {
    if (!socket || gameState?.questionIndex === undefined) return;
    socket.emit("REVEAL_ANSWER", {
      sessionCode,
      questionIndex: gameState.questionIndex,
    });
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            answerRevealed: true,
            correctAnswer: prev.question?.correct,
          }
        : null
    );
  };

  const handleNextQuestion = () => {
    if (!socket || !gameState || !questions.length) return;
    const nextIndex = (gameState.questionIndex ?? 0) + 1;
    if (nextIndex < questions.length) {
      socket.emit("NAVIGATE_QUESTION", {
        sessionCode,
        questionIndex: nextIndex,
      });
    }
  };

  const handlePreviousQuestion = () => {
    if (!socket || !gameState) return;
    const prevIndex = (gameState.questionIndex ?? 0) - 1;
    if (prevIndex >= 0) {
      socket.emit("NAVIGATE_QUESTION", {
        sessionCode,
        questionIndex: prevIndex,
      });
    }
  };

  const handleEndQuestion = () => {
    if (!socket || gameState?.questionIndex === undefined) return;
    socket.emit("END_QUESTION", {
      sessionCode,
      questionIndex: gameState.questionIndex,
    });
  };

  const handleCancelSession = () => {
    if (!socket) return;
    if (
      !confirm(
        "Are you sure you want to cancel this session? All players will be disconnected."
      )
    ) {
      return;
    }
    socket.emit("CANCEL_SESSION", { sessionCode });
  };

  // Get current question from gameState or fallback to questions array
  const currentQuestion =
    gameState?.question || questions[gameState?.questionIndex ?? 0];
  const currentIndex = gameState?.questionIndex ?? 0;
  const questionCount = gameState?.questionCount ?? questions.length;
  const isQuestionActive = gameState?.status === "QUESTION_ACTIVE";
  const isQuestionEnded = gameState?.status === "QUESTION_ENDED";
  const canNavigate = !isQuestionActive && gameState?.status !== "WAITING";

  if (status === "loading") {
    return <Loading />;
  }

  if (!session) {
    return null;
  }

  // Show message if game has ended (host can still access dashboard when game is live)
  if (sessionStatus === "ended") {
    return (
      <CenteredLayout>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-4">
            Game Has Ended
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            This game has already ended.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            We apologize, but you cannot access the host dashboard for a game
            that has already ended.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </CenteredLayout>
    );
  }

  // If gameState is null but session is loaded and socket is connected,
  // wait briefly for socket to restore state (this happens on refresh)
  if (!gameState && connected && socket) {
    return <Loading message="Restoring game state..." />;
  }

  // Lobby view (before game starts)
  // Only show lobby if game state is explicitly WAITING
  if (gameState?.status === "WAITING") {
    return (
      <>
        <PlayersListModal
          isOpen={showPlayersModal}
          onClose={() => setShowPlayersModal(false)}
          sessionCode={sessionCode}
          socket={socket}
          connected={connected}
        />
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
                <button
                  onClick={handleStartGame}
                  disabled={!connected || players.length === 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Start Game
                </button>
                <button
                  onClick={handleCancelSession}
                  disabled={!connected}
                  className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Live Game Session View (Desktop-First Two-Column Layout)
  return (
    <>
      <PlayersListModal
        isOpen={showPlayersModal}
        onClose={() => setShowPlayersModal(false)}
        sessionCode={sessionCode}
        socket={socket}
        connected={connected}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Live Game Session
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Session: {sessionCode} •{" "}
                  {connected ? "🟢 Connected" : "🔴 Disconnected"}
                </p>
              </div>
              <button
                onClick={handleCancelSession}
                disabled={!connected}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Cancel Session
              </button>
            </div>
          </div>

          {/* Two-Column Layout: Desktop-First */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: Question Control */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Question Control
              </h2>

              {/* Question Index */}
              {currentQuestion && (
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Question {currentIndex + 1} of {questionCount}
                </div>
              )}

              {/* Timer Display */}
              {isQuestionActive && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {timeRemaining}s
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Time Remaining
                    </div>
                  </div>
                </div>
              )}

              {/* Current Question Display */}
              {currentQuestion ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {currentQuestion.text}
                  </h3>
                  <div className="space-y-3">
                    {(["A", "B", "C", "D"] as const).map((option) => {
                      const isCorrect = currentQuestion.correct === option;
                      const isRevealed = gameState?.answerRevealed && isCorrect;
                      return (
                        <div
                          key={option}
                          className={`p-3 rounded-lg border-2 ${
                            isRevealed
                              ? "bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-500"
                              : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                              {option}:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {currentQuestion[option]}
                            </span>
                            {isRevealed && (
                              <span className="ml-auto text-green-600 dark:text-green-400 font-semibold">
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400">
                  No question loaded
                </div>
              )}

              {/* Question Controls */}
              <div className="space-y-3">
                <button
                  onClick={handleStartQuestion}
                  disabled={
                    !connected ||
                    !currentQuestion ||
                    isQuestionActive ||
                    gameState?.answerRevealed
                  }
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Start Question
                </button>

                <button
                  onClick={handleRevealAnswer}
                  disabled={
                    !connected || isQuestionEnded || gameState?.answerRevealed
                  }
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {gameState?.answerRevealed
                    ? "Answer Revealed"
                    : "Reveal Answer"}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={!connected || !canNavigate || currentIndex === 0}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    disabled={
                      !connected ||
                      !canNavigate ||
                      currentIndex >= questionCount - 1
                    }
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Next →
                  </button>
                </div>

                {isQuestionActive && (
                  <button
                    onClick={handleEndQuestion}
                    disabled={!connected}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    End Question
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel: Live Monitoring */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Live Monitoring
              </h2>

              {/* Player Count */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {stats.playerCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Connected Players
                </div>
              </div>

              {/* Answer Stats */}
              {isQuestionActive || isQuestionEnded ? (
                <div className="mb-6">
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg mb-4">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                      {stats.answerCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Answers Submitted
                    </div>
                  </div>

                  {/* Answer Distribution */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Answer Distribution
                    </h4>
                    {(["A", "B", "C", "D"] as const).map((option) => {
                      const count = stats.answerDistribution[option];
                      const total = Object.values(
                        stats.answerDistribution
                      ).reduce((a, b) => a + b, 0);
                      const percentage =
                        total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={option} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {option}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Start a question to see live stats
                </div>
              )}

              {/* Player List */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Players
                </h4>
                {players.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No players joined
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {players.map((player) => (
                      <li
                        key={player.playerId}
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        👤 {player.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
