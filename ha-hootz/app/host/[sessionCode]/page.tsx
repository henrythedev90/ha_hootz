"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Trophy,
  Play,
  Eye,
  X,
  BarChart3,
  Copy,
  Check,
  QrCode,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SessionQRCode from "@/components/SessionQRCode";
import Loading from "@/components/Loading";
import CenteredLayout from "@/components/CenteredLayout";
import PlayersListModal from "@/components/PlayersListModal";
import Modal from "@/components/Modal";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setSessionCode,
  setGameState,
  updateGameState,
  setQuestion,
  setQuestionIndex,
  setAnswerRevealed,
  setCorrectAnswer,
  setReviewMode,
  resetGameState,
} from "@/store/slices/gameSlice";
import {
  setQuestions,
  setPlayers,
  addPlayer,
  removePlayer,
  setStats,
  updateStats,
  setTimeRemaining,
  setSessionStatus,
  setLeaderboard,
  resetHostState,
} from "@/store/slices/hostSlice";
import {
  setSocket,
  setConnected,
  setSocketSessionCode,
} from "@/store/slices/socketSlice";
import {
  setShowPlayersModal,
  setShowEndGameModal,
  resetUiState,
} from "@/store/slices/uiSlice";
import type { Question } from "@/store/slices/gameSlice";

export default function HostDashboard() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionCode = params.sessionCode as string;

  // Redux state
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.game?.gameState ?? null);
  const questions = useAppSelector((state) => state.host.questions);
  const players = useAppSelector((state) => state.host.players);
  const stats = useAppSelector((state) => state.host.stats);
  const timeRemaining = useAppSelector((state) => state.host.timeRemaining);
  const sessionStatus = useAppSelector((state) => state.host.sessionStatus);
  const socket = useAppSelector((state) => state.socket.socket);
  const connected = useAppSelector((state) => state.socket.connected);
  const showPlayersModal = useAppSelector((state) => state.ui.showPlayersModal);
  const showEndGameModal = useAppSelector((state) => state.ui.showEndGameModal);

  const [activeTab, setActiveTab] = useState<
    "players" | "stats" | "leaderboard"
  >("players");
  const [copied, setCopied] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [winnerRevealed, setWinnerRevealed] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef(gameState);
  const statsRef = useRef(stats);

  // Keep refs in sync with Redux state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Reset Redux state and set session code when sessionCode changes
  useEffect(() => {
    // Clear any pending redirects from previous session
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Reset all state when sessionCode changes (new session)
    dispatch(resetGameState());
    dispatch(resetHostState());
    dispatch(resetUiState()); // Reset all modals and UI state

    // Explicitly close all modals as a safety measure
    dispatch(setShowPlayersModal(false));
    dispatch(setShowEndGameModal(false));

    if (sessionCode) {
      dispatch(setSessionCode(sessionCode));
      dispatch(setSocketSessionCode(sessionCode));
    }
  }, [sessionCode, dispatch]);

  // Fetch questions and game state when component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}/questions`);
        const data = await response.json();
        if (data.success && data.questions) {
          dispatch(setQuestions(data.questions));
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
          dispatch(setSessionStatus(data.sessionStatus));
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
          // Completely replace game state (don't merge with old state)
          // If status is WAITING, explicitly reset all game flags
          const isWaiting = data.gameState.status === "WAITING";
          dispatch(
            setGameState({
              status: data.gameState.status || "WAITING",
              sessionId: data.gameState.sessionId,
              questionIndex: data.gameState.questionIndex ?? 0,
              questionCount: questionCount || data.gameState.questionCount || 0,
              question: isWaiting ? undefined : data.gameState.question,
              endAt: isWaiting ? undefined : data.gameState.endAt,
              answerRevealed: isWaiting
                ? false
                : data.gameState.answerRevealed || false,
              correctAnswer: isWaiting
                ? undefined
                : data.gameState.correctAnswer,
              isReviewMode: isWaiting
                ? false
                : data.gameState.isReviewMode || false,
              scoringConfig: data.gameState.scoringConfig,
            })
          );
          // Explicitly close all modals when fetching game state for a new session
          if (isWaiting) {
            dispatch(setShowPlayersModal(false));
            dispatch(setShowEndGameModal(false));
          }
        } else {
          // If no game state exists, initialize with WAITING state
          dispatch(
            setGameState({
              status: "WAITING",
              questionIndex: 0,
              questionCount: questionCount || 0,
            })
          );
          // Close all modals for new sessions
          dispatch(setShowPlayersModal(false));
          dispatch(setShowEndGameModal(false));
        }
      } catch (error) {
        console.error("Error fetching game state:", error);
        // Initialize with WAITING state on error
        dispatch(
          setGameState({
            status: "WAITING",
            questionIndex: 0,
            questionCount: questionCount || 0,
          })
        );
        // Close all modals on error
        dispatch(setShowPlayersModal(false));
        dispatch(setShowEndGameModal(false));
      }
    };

    if (sessionCode) {
      fetchQuestions().then(async (questionsData) => {
        const questionCount = questionsData?.length || 0;
        await fetchGameState(questionCount);
      });
      fetchSessionStatus();
    }
  }, [sessionCode, dispatch]);

  // Timer countdown effect
  useEffect(() => {
    // Don't run timer if answer is revealed (review mode or answer already revealed)
    if (gameState?.answerRevealed) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      dispatch(setTimeRemaining(0));
      return;
    }

    if (gameState?.status === "QUESTION_ACTIVE" && gameState.endAt) {
      const updateTimer = () => {
        const remaining = Math.max(
          0,
          Math.floor((gameState.endAt! - Date.now()) / 1000)
        );
        dispatch(setTimeRemaining(remaining));

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
      dispatch(setTimeRemaining(0));
    }
  }, [
    gameState?.status,
    gameState?.endAt,
    gameState?.answerRevealed,
    socket,
    sessionCode,
    gameState?.questionIndex,
    dispatch,
  ]);

  // Fetch stats periodically
  useEffect(() => {
    if (!connected) return;
    const questionIndex = gameState?.questionIndex;
    if (questionIndex === undefined) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(
          `/api/sessions/${sessionCode}/stats?questionIndex=${questionIndex}`
        );
        const data = await response.json();
        if (data.success) {
          dispatch(
            setStats({
              playerCount: data.playerCount,
              answerCount: data.answerCount || 0,
              answerDistribution: data.answerDistribution || {
                A: 0,
                B: 0,
                C: 0,
                D: 0,
              },
              playersWithAnswers: data.playersWithAnswers || [],
              playerScores: data.playerScores || {},
            })
          );
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [connected, gameState?.questionIndex, sessionCode, dispatch]);

  // Verify host ownership
  useEffect(() => {
    const verifyHostOwnership = async () => {
      // Wait for session to be fully loaded
      if (status === "loading") return;

      // If unauthenticated, redirect to sign in
      if (status === "unauthenticated") {
        router.push("/auth/signin");
        return;
      }

      if (!session?.user?.id || !sessionCode) return;

      try {
        const response = await fetch(
          `/api/sessions/validate/${sessionCode}?hostCheck=true`
        );
        const data = await response.json();

        // Check if session is valid and user is the host
        if (!data.isValid) {
          console.error("Session validation failed:", data.error);
          router.push("/");
          return;
        }

        if (data.hostId && data.hostId !== session.user.id) {
          console.error("Host ownership verification failed:", {
            expected: session.user.id,
            actual: data.hostId,
          });
          router.push("/");
          return;
        }
      } catch (error) {
        console.error("Error verifying host ownership:", error);
        router.push("/");
      }
    };

    verifyHostOwnership();
  }, [session, status, router, sessionCode]);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!sessionCode) return;

    // Don't create a new socket if one already exists
    if (socketRef.current?.connected) {
      return;
    }

    // Clean up existing socket if it exists but isn't connected
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
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
    });

    newSocket.on(
      "host-joined",
      (data: {
        sessionCode: string;
        players: Array<{ playerId: string; name: string }>;
        gameState?: any;
      }) => {
        dispatch(setPlayers(data.players || []));

        if (data.gameState) {
          dispatch(setGameState(data.gameState));

          if (data.gameState.question) {
            // Question already in gameState
          } else if (data.gameState.questionIndex !== undefined) {
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
                    dispatch(updateGameState({ question }));
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
        dispatch(addPlayer({ playerId: data.playerId, name: data.name }));

        if (data.playerCount !== undefined) {
          dispatch(updateStats({ playerCount: data.playerCount }));
        }

        const currentState = gameStateRef.current;
        if (
          currentState &&
          currentState.questionIndex !== undefined &&
          (currentState.status === "QUESTION_ACTIVE" ||
            currentState.status === "IN_PROGRESS")
        ) {
          const questionIndex = currentState.questionIndex;
          const fetchStats = async () => {
            try {
              const response = await fetch(
                `/api/sessions/${sessionCode}/stats?questionIndex=${questionIndex}`
              );
              const statsData = await response.json();
              if (statsData.success) {
                dispatch(
                  updateStats({
                    answerCount: statsData.answerCount || 0,
                    answerDistribution: statsData.answerDistribution || {
                      A: 0,
                      B: 0,
                      C: 0,
                      D: 0,
                    },
                    playersWithAnswers: statsData.playersWithAnswers || [],
                    playerScores:
                      statsData.playerScores || stats.playerScores || {},
                  })
                );
              }
            } catch (error) {
              console.error("Error refreshing stats after player join:", error);
            }
          };
          fetchStats();
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
        dispatch(removePlayer(data.playerId));
        if (data.playerCount !== undefined) {
          dispatch(updateStats({ playerCount: data.playerCount }));
        }
      }
    );

    newSocket.on(
      "game-started",
      (data: { status: string; questionIndex: number }) => {
        dispatch(setShowPlayersModal(true));
        dispatch(
          updateGameState({
            status: "IN_PROGRESS",
            questionIndex: data.questionIndex ?? 0,
          })
        );
      }
    );

    newSocket.on(
      "question-started",
      (data: { question: Question; questionIndex: number; endAt: number }) => {
        dispatch(
          updateGameState({
            status: "QUESTION_ACTIVE",
            question: data.question,
            questionIndex: data.questionIndex,
            endAt: data.endAt,
            answerRevealed: false,
          })
        );
      }
    );

    newSocket.on("question-ended", (data: { questionIndex: number }) => {
      dispatch(updateGameState({ status: "QUESTION_ENDED" }));
    });

    newSocket.on(
      "question-navigated",
      async (data: {
        questionIndex: number;
        question: Question;
        answerRevealed?: boolean;
        correctAnswer?: "A" | "B" | "C" | "D";
        isReviewMode?: boolean;
      }) => {
        const isReviewMode = data.isReviewMode || false;
        const answerRevealed = data.answerRevealed || false;

        // Update game state with review mode flags from server
        // If gameState doesn't exist, we need to set it first
        if (!gameState) {
          dispatch(
            setGameState({
              status: isReviewMode ? "QUESTION_ENDED" : "IN_PROGRESS",
              questionIndex: data.questionIndex,
              question: data.question,
              answerRevealed: answerRevealed,
              correctAnswer: data.correctAnswer,
              isReviewMode: isReviewMode,
            })
          );
        } else {
          dispatch(
            updateGameState({
              questionIndex: data.questionIndex,
              question: data.question,
              status: isReviewMode ? "QUESTION_ENDED" : "IN_PROGRESS",
              answerRevealed: answerRevealed,
              correctAnswer: data.correctAnswer,
              isReviewMode: isReviewMode,
              endAt: undefined,
            })
          );
        }

        // If in review mode, fetch stats to show player answers
        if (isReviewMode) {
          try {
            const response = await fetch(
              `/api/sessions/${sessionCode}/stats?questionIndex=${data.questionIndex}`
            );
            const statsData = await response.json();
            if (statsData.success) {
              dispatch(
                setStats({
                  playerCount: statsData.playerCount,
                  answerCount: statsData.answerCount || 0,
                  answerDistribution: statsData.answerDistribution || {
                    A: 0,
                    B: 0,
                    C: 0,
                    D: 0,
                  },
                  playersWithAnswers: statsData.playersWithAnswers || [],
                  playerScores: statsData.playerScores || {},
                })
              );
            }
          } catch (error) {
            console.error(
              "Error fetching stats for navigated question:",
              error
            );
          }
        } else {
          // Reset stats for new questions
          dispatch(
            updateStats({
              answerCount: 0,
              answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
              playersWithAnswers: [],
            })
          );
        }
      }
    );

    newSocket.on(
      "answer-stats-updated",
      (data: {
        questionIndex: number;
        answerCount: number;
        answerDistribution: { A: number; B: number; C: number; D: number };
        playersWithAnswers?: string[];
      }) => {
        if (data.questionIndex === gameStateRef.current?.questionIndex) {
          dispatch(
            updateStats({
              answerCount: data.answerCount,
              answerDistribution: data.answerDistribution,
              playersWithAnswers:
                data.playersWithAnswers ||
                statsRef.current.playersWithAnswers ||
                [],
            })
          );
        }
      }
    );

    newSocket.on("session-cancelled", () => {
      // Clear any existing redirect timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }

      // Store the current sessionCode to verify we're still on the cancelled session
      const cancelledSessionCode = sessionCode;

      // Set redirect timeout - only redirect if we're still on the cancelled session
      redirectTimeoutRef.current = setTimeout(() => {
        // Double-check we're still on the cancelled session before redirecting
        // This prevents redirecting if user has already navigated to a new session
        if (params.sessionCode === cancelledSessionCode) {
          router.push("/");
        }
        redirectTimeoutRef.current = null;
      }, 2000);
    });

    newSocket.on("error", (data: { message: string }) => {
      console.error("Socket error:", data);
      alert(data.message);
    });

    newSocket.on("disconnect", () => {
      dispatch(setConnected(false));
    });

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // Clear any pending redirects when cleaning up
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, [sessionCode, router, dispatch, params.sessionCode]);

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
        durationMs: 30000,
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
    dispatch(
      updateGameState({
        answerRevealed: true,
        correctAnswer: gameState.question?.correct,
        status: "QUESTION_ENDED",
      })
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
    // Allow canceling session even if socket is not connected
    // This helps in cases where connection is lost but user wants to cancel
    // Close other modals first to ensure EndGameModal is visible
    dispatch(setShowPlayersModal(false));

    // Force a toggle to ensure re-render even if already true
    if (showEndGameModal) {
      dispatch(setShowEndGameModal(false));
      setTimeout(() => {
        dispatch(setShowEndGameModal(true));
      }, 10);
    } else {
      dispatch(setShowEndGameModal(true));
    }
  };

  const handleCopyLink = () => {
    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/join/${sessionCode}`
        : `/join/${sessionCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevealWinner = () => {
    // Prepare leaderboard data
    const leaderboard = players
      .map((player) => ({
        ...player,
        score: stats.playerScores?.[player.playerId] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    // Emit REVEAL_WINNER event to all players
    if (socket) {
      socket.emit("REVEAL_WINNER", {
        sessionCode,
        leaderboard,
      });
    }

    setShowLeaderboard(true);
    setWinnerRevealed(true);
  };

  // Get current question from gameState or fallback to questions array
  const currentQuestion =
    gameState?.question || questions[gameState?.questionIndex ?? 0];
  const currentIndex = gameState?.questionIndex ?? 0;
  const questionCount = gameState?.questionCount ?? questions.length;
  const isQuestionActive = gameState?.status === "QUESTION_ACTIVE";
  const isQuestionEnded = gameState?.status === "QUESTION_ENDED";
  const canNavigate = !isQuestionActive && gameState?.status !== "WAITING";

  // Ensure modals are closed when game status is WAITING (new session)
  // But don't close EndGameModal if user is actively trying to cancel
  useEffect(() => {
    if (gameState?.status === "WAITING") {
      dispatch(setShowPlayersModal(false));
      // Don't auto-close EndGameModal - let user control it
      // dispatch(setShowEndGameModal(false));
    }
  }, [gameState?.status, dispatch]);

  if (status === "loading") {
    return <Loading />;
  }

  if (!session) {
    return null;
  }

  if (sessionStatus === "ended") {
    return (
      <CenteredLayout>
        <div className="bg-card-bg rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-cyan mb-4">Game Has Ended</h1>
          <p className="text-text-light/70 mb-4">
            This game has already ended.
          </p>
          <p className="text-text-light/50 mb-6">
            We apologize, but you cannot access the host dashboard for a game
            that has already ended.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 bg-indigo text-white rounded-md hover:bg-indigo/90 transition-colors font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </CenteredLayout>
    );
  }

  if (!gameState && connected && socket) {
    return <Loading message="Restoring game state..." />;
  }

  // Lobby view (before game starts)
  if (gameState?.status === "WAITING") {
    return (
      <>
        <PlayersListModal
          isOpen={showPlayersModal}
          onClose={() => dispatch(setShowPlayersModal(false))}
          sessionCode={sessionCode}
          socket={socket}
          connected={connected}
        />
        <Modal
          isOpen={showEndGameModal}
          onClose={() => {
            dispatch(setShowEndGameModal(false));
          }}
          title="End Game"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-text-light/70">
              Are you sure you want to end the game? All players will be
              disconnected.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => dispatch(setShowEndGameModal(false))}
                className="px-4 py-2 bg-deep-navy text-text-light rounded-md hover:bg-deep-navy/80 transition-colors font-medium border border-indigo/30"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (socket && connected) {
                    socket.emit("CANCEL_SESSION", { sessionCode });
                  }
                  dispatch(setShowEndGameModal(false));
                  router.push("/");
                }}
                className="px-4 py-2 bg-error text-white rounded-md hover:bg-error/90 transition-colors font-medium"
              >
                End Game
              </button>
            </div>
          </div>
        </Modal>
        <div className="min-h-screen bg-[#0B1020] text-[#E5E7EB] p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-4xl font-bold text-[#E5E7EB]">
                  Host Dashboard
                </h1>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    connected
                      ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30"
                      : "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connected ? "bg-[#22C55E] animate-pulse" : "bg-[#EF4444]"
                    }`}
                  />
                  <span>{connected ? "Connected" : "Disconnected"}</span>
                </div>
              </div>
              <p className="text-[#E5E7EB]/60">
                Session:{" "}
                <span className="text-[#22D3EE] font-mono font-semibold">
                  {sessionCode}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Join Instructions */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-8 shadow-2xl"
                >
                  {/* Join Code Display */}
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-[#0B1020] mb-4 text-center">
                      Join Code: {sessionCode}
                    </h2>
                  </div>

                  {/* QR Code Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-center gap-2 text-[#0B1020] mb-4">
                      <QrCode className="w-5 h-5" />
                      <h3 className="font-semibold">Scan QR Code to Join</h3>
                    </div>
                    <div className="bg-[#E5E7EB] rounded-xl p-6 flex items-center justify-center">
                      <SessionQRCode
                        sessionCode={sessionCode}
                        joinUrl={`/join/${sessionCode}`}
                        variant="minimal"
                      />
                    </div>
                    <p className="text-center text-sm text-[#0B1020]/60 mt-4">
                      Scan with your phone camera
                    </p>
                  </div>

                  {/* Copy Link Section */}
                  <div className="bg-[#E5E7EB] rounded-xl p-6">
                    <p className="text-sm font-semibold text-[#0B1020] mb-3 text-center">
                      Or copy this link:
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border-2 border-[#6366F1]/30 rounded-lg px-4 py-3 font-mono text-sm text-[#0B1020] overflow-x-auto whitespace-nowrap">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/join/${sessionCode}`
                          : `/join/${sessionCode}`}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                          copied
                            ? "bg-[#22C55E] text-white"
                            : "bg-[#6366F1] hover:bg-[#5558E3] text-white"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-5 h-5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-5 h-5" />
                            <span>Copy</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartGame}
                    disabled={!connected || players.length === 0}
                    className="flex-1 px-8 py-4 bg-linear-to-r from-[#22C55E] to-[#1DB954] hover:from-[#1DB954] hover:to-[#16A34A] text-white rounded-xl font-semibold shadow-lg shadow-[#22C55E]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Game
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelSession}
                    className="px-8 py-4 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border-2 border-[#EF4444]/30 hover:border-[#EF4444]/50 text-[#EF4444] rounded-xl font-semibold transition-all"
                  >
                    Cancel Session
                  </motion.button>
                </div>
              </div>

              {/* Right Column - Players List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#1A1F35] rounded-2xl p-6 border border-[#6366F1]/20 h-fit"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <Users className="w-6 h-6 text-[#22D3EE]" />
                    <span>Players ({players.length})</span>
                  </h3>
                  {players.length > 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 bg-[#22C55E] rounded-full"
                    />
                  )}
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {players.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto text-[#6366F1]/30 mb-4" />
                      <p className="text-[#E5E7EB]/50 mb-2">
                        Waiting for players to join...
                      </p>
                      <p className="text-sm text-[#E5E7EB]/30">
                        Share the code or QR code with players
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {players.map((player, index) => (
                        <motion.div
                          key={player.playerId}
                          initial={{ opacity: 0, x: 50, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -50, scale: 0.9 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-4 p-4 bg-[#0B1020]/50 rounded-xl border border-[#6366F1]/20 hover:border-[#6366F1]/40 transition-all"
                        >
                          <div className="w-12 h-12 rounded-full bg-linear-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-[#E5E7EB] text-lg">
                              {player.name}
                            </p>
                            <p className="text-sm text-[#E5E7EB]/50 font-mono">
                              Player ID: {player.playerId.substring(0, 8)}...
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {players.length > 0 && (
                  <div className="mt-6 p-4 bg-[#6366F1]/10 rounded-lg border border-[#6366F1]/30">
                    <p className="text-sm text-[#E5E7EB]/70 text-center">
                      Players are joining in real-time. Start the game when
                      ready!
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Live Game Session View
  return (
    <>
      <PlayersListModal
        isOpen={showPlayersModal}
        onClose={() => dispatch(setShowPlayersModal(false))}
        sessionCode={sessionCode}
        socket={socket}
        connected={connected}
      />
      <div className="min-h-screen bg-deep-navy">
        {/* Header */}
        <div className="border-b border-indigo/20 bg-card-bg/50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1 text-text-light">
                Live Game Session
              </h1>
              <div className="flex gap-4 text-sm text-text-light/60">
                <span>
                  Session Code:{" "}
                  <span className="text-cyan font-mono">{sessionCode}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {players.length} Players
                </span>
                <span className={connected ? "text-success" : "text-error"}>
                  {connected ? "🟢 Connected" : "🔴 Disconnected"}
                </span>
              </div>
            </div>
            <button
              onClick={handleCancelSession}
              className="px-4 py-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-lg flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>End Game</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Question Display */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Question */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card-bg rounded-xl p-8 border border-indigo/20"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-text-light/60">
                      Question {currentIndex + 1} of {questionCount}
                    </span>
                    {isQuestionActive && !gameState?.answerRevealed && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-cyan">
                          {timeRemaining}s
                        </span>
                        <div className="w-32 h-2 bg-deep-navy rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: "100%" }}
                            animate={{
                              width: `${
                                gameState?.endAt
                                  ? Math.max(
                                      0,
                                      ((gameState.endAt - Date.now()) / 30000) *
                                        100
                                    )
                                  : 0
                              }%`,
                            }}
                            className="h-full bg-linear-to-r from-cyan to-indigo"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl font-semibold text-text-light">
                    {currentQuestion?.text || "No question loaded"}
                  </h2>
                </div>

                {currentQuestion && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {(["A", "B", "C", "D"] as const).map((option, index) => {
                      const isCorrect =
                        gameState?.answerRevealed &&
                        gameState?.correctAnswer === option;
                      const distribution =
                        stats.answerDistribution[option] || 0;
                      const total = Object.values(
                        stats.answerDistribution
                      ).reduce((a, b) => a + b, 0);
                      const percentage =
                        total > 0
                          ? Math.round((distribution / total) * 100)
                          : 0;

                      return (
                        <div
                          key={option}
                          className={`p-6 rounded-lg border-2 transition-all ${
                            isCorrect
                              ? "bg-success/20 border-success"
                              : "bg-deep-navy/50 border-indigo/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-text-light">
                              {option}
                            </span>
                            {gameState?.answerRevealed && (
                              <span className="text-sm text-text-light/60">
                                {percentage}%
                              </span>
                            )}
                          </div>
                          <p className="text-text-light">
                            {currentQuestion[option]}
                          </p>
                          {gameState?.answerRevealed && (
                            <div className="mt-3 h-2 bg-deep-navy/50 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full ${
                                  isCorrect ? "bg-success" : "bg-indigo"
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Control Buttons */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {!isQuestionActive && !gameState?.answerRevealed && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStartQuestion}
                        disabled={(() => {
                          const disabled =
                            !connected ||
                            !currentQuestion ||
                            gameState?.isReviewMode === true ||
                            gameState?.answerRevealed === true;
                          return disabled;
                        })()}
                        className="flex-1 px-6 py-3 bg-indigo hover:bg-indigo/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-5 h-5" />
                        <span>Start Question</span>
                      </motion.button>
                    )}
                    {isQuestionActive && !gameState?.answerRevealed && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRevealAnswer}
                        disabled={
                          !connected ||
                          stats.playerCount === 0 ||
                          stats.answerCount < stats.playerCount
                        }
                        className="flex-1 px-6 py-3 bg-cyan hover:bg-cyan/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eye className="w-5 h-5" />
                        <span>Reveal Answer</span>
                      </motion.button>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  {(gameState?.answerRevealed || gameState?.isReviewMode) && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pt-4 border-t border-indigo/30">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handlePreviousQuestion}
                          disabled={
                            !connected ||
                            currentIndex === 0 ||
                            (questionCount > 0 && currentIndex >= questionCount)
                          }
                          className="px-6 py-3 bg-[#1A1F35] hover:bg-[#252B44] border-2 border-[#6366F1]/30 hover:border-[#6366F1]/50 text-[#E5E7EB] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          <span>Previous Question</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const isLastQuestion =
                              questionCount > 0 &&
                              currentIndex >= questionCount - 1;
                            if (isLastQuestion) {
                              handleRevealWinner();
                            } else {
                              setShowLeaderboard(true);
                            }
                          }}
                          className="px-6 py-3 bg-indigo hover:bg-indigo/90 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                          <Trophy className="w-5 h-5" />
                          <span>
                            {questionCount > 0 &&
                            currentIndex >= questionCount - 1
                              ? "🏆 Reveal Winner"
                              : "View Leaderboard"}
                          </span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleNextQuestion}
                          disabled={
                            !connected ||
                            questionCount === 0 ||
                            currentIndex >= questionCount - 1
                          }
                          className="px-6 py-3 bg-[#1A1F35] hover:bg-[#252B44] border-2 border-[#6366F1]/30 hover:border-[#6366F1]/50 text-[#E5E7EB] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                        >
                          <span>Next Question</span>
                          <ChevronRight className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Stats/Players/Leaderboard */}
            <div className="space-y-6">
              {/* Tabs */}
              <div className="bg-card-bg rounded-xl p-2 border border-indigo/20">
                <div className="flex gap-2">
                  {(["players", "stats", "leaderboard"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 px-4 rounded-lg transition-colors capitalize ${
                        activeTab === tab
                          ? "bg-indigo text-white"
                          : "text-text-light/60 hover:text-text-light"
                      }`}
                    >
                      {tab === "stats" ? (
                        <BarChart3 className="w-4 h-4 inline mr-1" />
                      ) : tab === "leaderboard" ? (
                        <Trophy className="w-4 h-4 inline mr-1" />
                      ) : (
                        <Users className="w-4 h-4 inline mr-1" />
                      )}
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="bg-card-bg rounded-xl p-6 border border-indigo/20">
                {activeTab === "players" && (
                  <div className="space-y-3">
                    <h3 className="font-semibold mb-4 text-text-light">
                      Players ({players.length})
                    </h3>
                    {players.length === 0 ? (
                      <p className="text-text-light/50 text-sm">
                        No players joined
                      </p>
                    ) : (
                      players.map((player) => {
                        const hasSubmitted =
                          stats.playersWithAnswers?.includes(player.playerId) ||
                          false;
                        const correctCount = Object.values(
                          stats.playerScores || {}
                        ).filter((score, idx) => {
                          // This is a simplified check - you might want to track this properly
                          return score > 0;
                        }).length;
                        return (
                          <div
                            key={player.playerId}
                            className="flex items-center justify-between p-3 bg-deep-navy/50 rounded-lg"
                          >
                            <span className="text-text-light">
                              {player.name}
                            </span>
                            <div className="flex items-center gap-3 text-sm">
                              {hasSubmitted && (
                                <span
                                  className="text-cyan"
                                  title="Answer submitted"
                                >
                                  💡
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {activeTab === "leaderboard" && (
                  <div className="space-y-3">
                    <h3 className="font-semibold mb-4 text-text-light">
                      Leaderboard
                    </h3>
                    {players.length === 0 ? (
                      <p className="text-text-light/50 text-sm">
                        No players yet
                      </p>
                    ) : (
                      players
                        .map((player) => ({
                          ...player,
                          score: stats.playerScores?.[player.playerId] || 0,
                        }))
                        .sort((a, b) => b.score - a.score)
                        .map((player, index) => (
                          <motion.div
                            key={player.playerId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-3 p-3 bg-deep-navy/50 rounded-lg"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0
                                  ? "bg-cyan text-deep-navy"
                                  : index === 1
                                  ? "bg-text-light/30 text-text-light"
                                  : index === 2
                                  ? "bg-cyan/50 text-cyan"
                                  : "bg-indigo/20 text-indigo"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <span className="flex-1 text-text-light">
                              {player.name}
                            </span>
                            <span className="font-semibold text-cyan">
                              {player.score}
                            </span>
                          </motion.div>
                        ))
                    )}
                  </div>
                )}

                {activeTab === "stats" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold mb-4 text-text-light">
                      Live Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-deep-navy/50 rounded-lg">
                        <div className="text-sm text-text-light/60 mb-1">
                          Total Answers
                        </div>
                        <div className="text-2xl font-bold text-cyan">
                          {stats.answerCount}
                        </div>
                      </div>
                      <div className="p-4 bg-deep-navy/50 rounded-lg">
                        <div className="text-sm text-text-light/60 mb-1">
                          Connected Players
                        </div>
                        <div className="text-2xl font-bold text-indigo">
                          {stats.playerCount}
                        </div>
                      </div>
                      {gameState?.answerRevealed &&
                        gameState?.correctAnswer && (
                          <div className="p-4 bg-deep-navy/50 rounded-lg">
                            <div className="text-sm text-text-light/60 mb-1">
                              Correct Answers
                            </div>
                            <div className="text-2xl font-bold text-success">
                              {gameState.correctAnswer
                                ? stats.answerDistribution[
                                    gameState.correctAnswer
                                  ] || 0
                                : 0}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti for Winner */}
      {showLeaderboard &&
        winnerRevealed &&
        (() => {
          const leaderboard = players
            .map((player) => ({
              ...player,
              score: stats.playerScores?.[player.playerId] || 0,
            }))
            .sort((a, b) => b.score - a.score);
          const isTie =
            leaderboard.length > 1 &&
            leaderboard[0].score > 0 &&
            leaderboard[0].score === leaderboard[1].score;

          // Confetti particles (only show for winner, not tie)
          const confettiColors = [
            "#FFD700",
            "#22D3EE",
            "#6366F1",
            "#22C55E",
            "#F59E0B",
          ];
          const confetti = !isTie
            ? Array.from({ length: 50 }, (_, i) => ({
                id: i,
                color:
                  confettiColors[
                    Math.floor(Math.random() * confettiColors.length)
                  ],
                delay: Math.random() * 2,
                duration: 3 + Math.random() * 2,
                x: Math.random() * 100,
              }))
            : [];

          return (
            <div
              className="fixed inset-0 pointer-events-none"
              style={{ zIndex: 10002 }}
            >
              {confetti.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{
                    y: -20,
                    x: `${particle.x}vw`,
                    opacity: 1,
                    rotate: 0,
                  }}
                  animate={{
                    y: "110vh",
                    rotate: 360,
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: particle.duration,
                    delay: particle.delay,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    position: "absolute",
                    width: "8px",
                    height: "8px",
                    backgroundColor: particle.color,
                    borderRadius: "2px",
                  }}
                />
              ))}
            </div>
          );
        })()}

      {/* Leaderboard/Winner Modal */}
      <Modal
        isOpen={showLeaderboard}
        onClose={() => {
          if (!winnerRevealed) {
            setShowLeaderboard(false);
          }
        }}
        title={winnerRevealed ? "🏆 Winner!" : "Leaderboard"}
        size="4xl"
      >
        <div className="space-y-6">
          {winnerRevealed &&
            (() => {
              const leaderboard = players
                .map((player) => ({
                  ...player,
                  score: stats.playerScores?.[player.playerId] || 0,
                }))
                .sort((a, b) => b.score - a.score);
              const winner = leaderboard.length > 0 ? leaderboard[0] : null;
              const isTie =
                leaderboard.length > 1 &&
                leaderboard[0].score > 0 &&
                leaderboard[0].score === leaderboard[1].score;

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mb-6 text-center"
                >
                  <div className="bg-linear-to-r from-cyan via-indigo to-cyan rounded-lg p-6 sm:p-8 shadow-lg border-4 border-cyan/50 overflow-hidden">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                      className="text-6xl mb-4"
                    >
                      🏆
                    </motion.div>
                    {isTie ? (
                      <>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                          It's a Tie!
                        </h3>
                        <p className="text-lg sm:text-xl text-white/90 mb-4">
                          Multiple winners with {winner?.score} points!
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                          Congratulations!
                        </h3>
                        <p className="text-xl sm:text-2xl text-white/90 mb-2">
                          {winner?.name}
                        </p>
                        <p className="text-lg sm:text-xl text-white/90">
                          Wins with {winner?.score} points!
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          <div className="space-y-3">
            {players.length === 0 ? (
              <p className="text-center text-text-light/50 py-8">
                No players yet
              </p>
            ) : (
              <AnimatePresence>
                {players
                  .map((player) => ({
                    ...player,
                    score: stats.playerScores?.[player.playerId] || 0,
                  }))
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => {
                    const rank = index + 1;
                    const isTopThree = rank <= 3;
                    const leaderboard = players
                      .map((p) => ({
                        ...p,
                        score: stats.playerScores?.[p.playerId] || 0,
                      }))
                      .sort((a, b) => b.score - a.score);
                    const isTie =
                      leaderboard.length > 1 &&
                      leaderboard[0].score > 0 &&
                      leaderboard[0].score === leaderboard[1].score;
                    const isWinner = winnerRevealed && rank === 1 && !isTie;
                    return (
                      <motion.div
                        key={player.playerId}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{
                          delay: index * 0.05,
                          duration: 0.3,
                          ease: "easeOut",
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isWinner
                            ? "bg-cyan/20 border-cyan shadow-lg"
                            : isTopThree
                            ? rank === 1
                              ? "bg-cyan/20 border-cyan"
                              : rank === 2
                              ? "bg-card-bg border-indigo/30"
                              : "bg-cyan/10 border-cyan/50"
                            : "bg-deep-navy border-indigo/30"
                        }`}
                        style={{
                          transform: isWinner ? "scale(1.02)" : undefined,
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`text-2xl font-bold ${
                              isWinner
                                ? "text-cyan"
                                : isTopThree
                                ? rank === 1
                                  ? "text-cyan"
                                  : rank === 2
                                  ? "text-text-light/50"
                                  : "text-cyan/70"
                                : "text-text-light/50"
                            }`}
                          >
                            {isWinner ? "👑" : `#${rank}`}
                          </div>
                          <span
                            className={`flex-1 text-lg font-semibold ${
                              isWinner ? "text-cyan" : "text-text-light"
                            }`}
                          >
                            {player.name}
                            {isWinner && (
                              <span className="ml-2 text-cyan/70">
                                - Winner!
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-xl font-bold ${
                              isWinner ? "text-cyan" : "text-indigo"
                            }`}
                          >
                            {player.score} pts
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            )}
          </div>
          {winnerRevealed && (
            <div className="flex justify-end pt-4 border-t border-indigo/30">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  dispatch(setShowEndGameModal(true));
                }}
                className="px-6 py-3 bg-error text-white rounded-md hover:bg-error/90 transition-colors font-medium"
              >
                End Game
              </motion.button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showEndGameModal}
        onClose={() => {
          dispatch(setShowEndGameModal(false));
        }}
        title="End Game"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-text-light/70">
            Are you sure you want to end the game? All players will be
            disconnected.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => dispatch(setShowEndGameModal(false))}
              className="px-4 py-2 bg-deep-navy text-text-light rounded-md hover:bg-deep-navy/80 transition-colors font-medium border border-indigo/30"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (socket && connected) {
                  socket.emit("CANCEL_SESSION", { sessionCode });
                }
                // Even if socket is not connected, we should still navigate away
                // The session will be cleaned up on the server side
                dispatch(setShowEndGameModal(false));
                // Navigate back to dashboard after canceling
                router.push("/");
              }}
              className="px-4 py-2 bg-error text-white rounded-md hover:bg-error/90 transition-colors font-medium"
            >
              End Game
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
