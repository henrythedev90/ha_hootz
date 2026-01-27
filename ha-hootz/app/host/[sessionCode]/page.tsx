"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";
import Loading from "@/components/Loading";
import CenteredLayout from "@/components/CenteredLayout";
import PlayersListModal from "@/components/PlayersListModal";
import EndGameModal from "@/components/EndGameModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import LobbyView from "@/components/LobbyView";
import LiveGameHeader from "@/components/LiveGameHeader";
import QuestionDisplay from "@/components/QuestionDisplay";
import GameStatsSidebar from "@/components/GameStatsSidebar";
import ActiveGameJoinInfo from "@/components/ActiveGameJoinInfo";
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

  const [copied, setCopied] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Random loading variant for visual variety
  const loadingVariants: Array<"dots" | "pulse" | "bars" | "orbit" | "wave"> = [
    "dots",
    "pulse",
    "bars",
    "orbit",
    "wave",
  ];
  const randomLoadingVariant = useRef(
    loadingVariants[Math.floor(Math.random() * loadingVariants.length)],
  ).current;

  // Refs for timeout cleanup
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalToggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef(gameState);
  const statsRef = useRef(stats);
  const playersRef = useRef(players);

  // Keep refs in sync with Redux state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Reset Redux state and set session code when sessionCode changes
  useEffect(() => {
    // Clear any pending timeouts from previous session
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }
    if (modalToggleTimeoutRef.current) {
      clearTimeout(modalToggleTimeoutRef.current);
      modalToggleTimeoutRef.current = null;
    }

    // Reset all state when sessionCode changes (new session)
    dispatch(resetGameState());
    dispatch(resetHostState());
    dispatch(resetUiState()); // Reset all modals and UI state

    // Explicitly close all modals as a safety measure
    dispatch(setShowPlayersModal(false));
    dispatch(setShowEndGameModal(false));

    // Reset loading state for new session
    setIsInitializing(true);

    if (sessionCode) {
      dispatch(setSessionCode(sessionCode));
      dispatch(setSocketSessionCode(sessionCode));
    }
  }, [sessionCode, dispatch]);

  // Fetch questions and game state when component mounts
  useEffect(() => {
    if (!sessionCode) return;

    setIsInitializing(true);

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
        if (process.env.NODE_ENV === "development") {
          console.error("[HostDashboard] Error fetching questions:", error);
        }
        return [];
      }
    };

    const fetchSessionStatus = async () => {
      try {
        const response = await fetch(`/api/sessions/validate/${sessionCode}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch session status: ${response.status}`);
        }

        const data = await response.json();
        if (data.sessionStatus) {
          dispatch(setSessionStatus(data.sessionStatus));
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[HostDashboard] Error fetching session status:",
            error,
          );
        }
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
            }),
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
            }),
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
          }),
        );
        // Close all modals on error
        dispatch(setShowPlayersModal(false));
        dispatch(setShowEndGameModal(false));
      }
    };

    // Fetch all initial data
    Promise.all([
      fetchQuestions().then(async (questionsData) => {
        const questionCount = questionsData?.length || 0;
        await fetchGameState(questionCount);
      }),
      fetchSessionStatus(),
    ]).finally(() => {
      // Mark initialization as complete after all data is fetched
      setIsInitializing(false);
    });
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
          Math.floor((gameState.endAt! - Date.now()) / 1000),
        );
        dispatch(setTimeRemaining(remaining));

        if (remaining === 0) {
          // Auto-reveal answer when timer expires
          if (socket && !gameState.answerRevealed) {
            socket.emit("REVEAL_ANSWER", {
              sessionCode,
              questionIndex: gameState.questionIndex,
            });
            dispatch(
              updateGameState({
                answerRevealed: true,
                correctAnswer: gameState.question?.correct,
                status: "QUESTION_ENDED",
              }),
            );
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
          `/api/sessions/${sessionCode}/stats?questionIndex=${questionIndex}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }

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
            }),
          );
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[HostDashboard] Error fetching stats:", error);
        }
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
          `/api/sessions/validate/${sessionCode}?hostCheck=true`,
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

    // Socket.io connection configuration
    // Use empty config object to connect to same origin (current page's origin)
    // This is the recommended approach for same-origin connections
    if (typeof window === "undefined") {
      // SSR: Don't create socket on server
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Socket.io Client] Connecting to same origin: ${window.location.origin}/api/socket`,
      );
    }

    const newSocket = io({
      path: "/api/socket",
      // Use same origin (default behavior when no URL specified)
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: ((attemptNumber: number) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
        const baseDelay = 1000;
        const maxDelay = 30000;
        const delay = Math.min(
          baseDelay * Math.pow(2, attemptNumber - 1),
          maxDelay,
        );
        return delay;
      }) as any,
      reconnectionDelayMax: 30000,
      // Ensure we use WebSocket transport (required for Fly.io)
      transports: ["websocket", "polling"],
      // Auto-upgrade to WebSocket
      upgrade: true,
      // Add timeout for connection attempts
      timeout: 20000,
    });

    socketRef.current = newSocket;
    dispatch(setSocket(newSocket));

    newSocket.on("connect", () => {
      console.log(
        `[HostDashboard] ✅ Socket connected with ID: ${newSocket.id}`,
      );
      dispatch(setConnected(true));
    });

    newSocket.on("connect_error", (error) => {
      console.error(
        `[HostDashboard] ❌ Socket connection error:`,
        error.message,
      );
      console.error(`[HostDashboard] Error type:`, (error as any).type);
      dispatch(setConnected(false));
    });

    newSocket.on(
      "host-joined",
      (data: {
        sessionCode: string;
        players: Array<{
          playerId: string;
          name: string;
          avatarUrl?: string;
          streak?: number;
        }>;
        gameState?: any;
      }) => {
        // Ensure players is an array
        const safePlayers = Array.isArray(data.players) ? data.players : [];
        dispatch(setPlayers(safePlayers));

        if (data.gameState) {
          dispatch(setGameState(data.gameState));

          if (data.gameState.question) {
            // Question already in gameState
          } else if (data.gameState.questionIndex !== undefined) {
            const fetchQuestion = async () => {
              try {
                const response = await fetch(
                  `/api/sessions/${sessionCode}/questions`,
                );

                if (!response.ok) {
                  throw new Error(
                    `Failed to fetch questions: ${response.status}`,
                  );
                }

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
      },
    );

    newSocket.on(
      "player-joined",
      (data: {
        playerId: string;
        name: string;
        avatarUrl?: string;
        streak?: number;
        sessionCode: string;
        playerCount?: number;
      }) => {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[HostDashboard] Host received player-joined event:",
            data,
          );
        }
        dispatch(
          addPlayer({
            playerId: data.playerId,
            name: data.name,
            avatarUrl: data.avatarUrl,
            streak: data.streak || 0,
          }),
        );

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
                `/api/sessions/${sessionCode}/stats?questionIndex=${questionIndex}`,
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch stats: ${response.status}`);
              }

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
                  }),
                );
              }
            } catch (error) {
              console.error("Error refreshing stats after player join:", error);
            }
          };
          fetchStats();
        }
      },
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

        // Recalculate answer count after player leaves
        // This ensures answerCount only counts active players
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
                `/api/sessions/${sessionCode}/stats?questionIndex=${questionIndex}`,
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch stats: ${response.status}`);
              }

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
                  }),
                );
              }
            } catch (error) {
              if (process.env.NODE_ENV === "development") {
                console.error(
                  "[HostDashboard] Error refreshing stats after player left:",
                  error,
                );
              }
            }
          };
          fetchStats();
        }
      },
    );

    newSocket.on(
      "game-started",
      (data: { status: string; questionIndex: number }) => {
        dispatch(setShowPlayersModal(true));
        dispatch(
          updateGameState({
            status: "IN_PROGRESS",
            questionIndex: data.questionIndex ?? 0,
          }),
        );
      },
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
          }),
        );
      },
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
            }),
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
            }),
          );
        }

        // If in review mode, fetch stats to show player answers
        if (isReviewMode) {
          try {
            const response = await fetch(
              `/api/sessions/${sessionCode}/stats?questionIndex=${data.questionIndex}`,
            );

            if (!response.ok) {
              throw new Error(`Failed to fetch stats: ${response.status}`);
            }

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
                }),
              );
            }
          } catch (error) {
            console.error(
              "Error fetching stats for navigated question:",
              error,
            );
          }
        } else {
          // Reset stats for new questions
          dispatch(
            updateStats({
              answerCount: 0,
              answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
              playersWithAnswers: [],
            }),
          );
        }
      },
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
            }),
          );
        }
      },
    );

    newSocket.on(
      "player-streaks-updated",
      (data: { sessionCode: string; streaks: Record<string, number> }) => {
        // Update streaks for all players in Redux state
        // Use ref to get current players to avoid stale closure
        const currentPlayers = playersRef.current;
        if (!Array.isArray(currentPlayers) || currentPlayers.length === 0) {
          // If players list is empty, don't update (prevents clearing players)
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "[HostDashboard] player-streaks-updated received but players list is empty, skipping update",
            );
          }
          return;
        }
        // Ensure streaks data is valid
        const safeStreaks =
          data.streaks && typeof data.streaks === "object" ? data.streaks : {};
        const updatedPlayers = currentPlayers.map((player) => ({
          ...player,
          streak: safeStreaks[player.playerId] ?? player.streak ?? 0,
        }));
        dispatch(setPlayers(updatedPlayers));
      },
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
    // Update game state with randomizeAnswers setting before starting
    dispatch(
      updateGameState({
        randomizeAnswers: randomizeAnswers,
      }),
    );
    socket.emit("START_GAME", { sessionCode, randomizeAnswers });
  };

  const handleStartQuestion = () => {
    if (!socket || gameState?.questionIndex === undefined) return;

    const safeQuestions = Array.isArray(questions) ? questions : [];
    const question =
      gameState.question || safeQuestions[gameState.questionIndex];

    if (!question) {
      if (process.env.NODE_ENV === "development") {
        console.error("[HostDashboard] No question available to start");
      }
      return;
    }

    // Get question duration from scoring config (default to 30 seconds)
    const questionDuration =
      ((gameState.scoringConfig as any)?.questionDuration || 30) * 1000; // Convert to milliseconds

    socket.emit("START_QUESTION", {
      sessionCode,
      question: {
        text: question.text,
        A: question.A,
        B: question.B,
        C: question.C,
        D: question.D,
        correct: question.correct,
        durationMs: questionDuration,
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
      }),
    );
  };

  const handleNextQuestion = () => {
    if (!socket || !gameState || !questions.length) return;
    const safeQuestions = Array.isArray(questions) ? questions : [];
    const nextIndex = (gameState.questionIndex ?? 0) + 1;
    if (nextIndex < safeQuestions.length) {
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

    // Clear any existing timeout
    if (modalToggleTimeoutRef.current) {
      clearTimeout(modalToggleTimeoutRef.current);
      modalToggleTimeoutRef.current = null;
    }

    // Force a toggle to ensure re-render even if already true
    if (showEndGameModal) {
      dispatch(setShowEndGameModal(false));
      modalToggleTimeoutRef.current = setTimeout(() => {
        dispatch(setShowEndGameModal(true));
        modalToggleTimeoutRef.current = null;
      }, 10);
    } else {
      dispatch(setShowEndGameModal(true));
    }
  };

  const handleCopyLink = async () => {
    // Clear any existing timeout
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }

    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/join/${sessionCode}`
        : `/join/${sessionCode}`;

    // Use clipboard API with error handling
    if (typeof window !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        copiedTimeoutRef.current = setTimeout(() => {
          setCopied(false);
          copiedTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[HostDashboard] Failed to copy link:", error);
        }
        // Fallback to execCommand for older browsers
        if (typeof document !== "undefined") {
          try {
            const textArea = document.createElement("textarea");
            textArea.value = fullUrl;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            copiedTimeoutRef.current = setTimeout(() => {
              setCopied(false);
              copiedTimeoutRef.current = null;
            }, 2000);
          } catch (fallbackError) {
            if (process.env.NODE_ENV === "development") {
              console.error(
                "[HostDashboard] Fallback copy failed:",
                fallbackError,
              );
            }
          }
        }
      }
    }
  };

  const handleRevealWinner = () => {
    // Ensure players is an array and stats.playerScores exists
    const safePlayers = Array.isArray(players) ? players : [];
    const safePlayerScores =
      stats?.playerScores && typeof stats.playerScores === "object"
        ? stats.playerScores
        : {};

    // Prepare leaderboard data
    const leaderboard = safePlayers
      .map((player) => ({
        ...player,
        score: safePlayerScores[player.playerId] || 0,
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
  // Ensure questions is an array
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const currentQuestion =
    gameState?.question || safeQuestions[gameState?.questionIndex ?? 0];
  const currentIndex = gameState?.questionIndex ?? 0;
  const questionCount = gameState?.questionCount ?? safeQuestions.length;
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

  // Show loading while initializing (fetching questions, game state, session status)
  if (isInitializing) {
    return (
      <Loading
        message="Loading session..."
        variant={randomLoadingVariant}
        size="jumbo"
      />
    );
  }

  // Show loading if game state is not ready yet (shouldn't happen after initialization, but safety check)
  if (!gameState && connected && socket) {
    return (
      <Loading
        message="Restoring game state..."
        variant={randomLoadingVariant}
        size="jumbo"
      />
    );
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
        <EndGameModal
          isOpen={showEndGameModal}
          onClose={() => dispatch(setShowEndGameModal(false))}
          onConfirm={() => {
            if (socket && connected) {
              socket.emit("CANCEL_SESSION", { sessionCode });
            }
            dispatch(setShowEndGameModal(false));
            router.push("/");
          }}
          sessionCode={sessionCode}
        />
        <LobbyView
          sessionCode={sessionCode}
          players={Array.isArray(players) ? players : []}
          connected={connected}
          copied={copied}
          randomizeAnswers={randomizeAnswers}
          onRandomizeAnswersChange={setRandomizeAnswers}
          onCopyLink={handleCopyLink}
          onStartGame={handleStartGame}
          onCancelSession={handleCancelSession}
        />
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
        <LiveGameHeader
          sessionCode={sessionCode}
          playerCount={Array.isArray(players) ? players.length : 0}
          connected={connected}
          onEndGame={handleCancelSession}
        />

        <div className="max-w-7xl mx-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Question Display */}
            <div className="lg:col-span-2 space-y-6">
              <QuestionDisplay
                question={currentQuestion || null}
                questionIndex={currentIndex}
                questionCount={questionCount}
                isQuestionActive={isQuestionActive}
                answerRevealed={gameState?.answerRevealed || false}
                correctAnswer={gameState?.correctAnswer}
                isReviewMode={gameState?.isReviewMode || false}
                timeRemaining={timeRemaining}
                endAt={gameState?.endAt}
                questionDuration={
                  gameState?.scoringConfig?.questionDuration
                    ? (gameState.scoringConfig as any).questionDuration * 1000
                    : 30000
                }
                answerDistribution={
                  stats?.answerDistribution || { A: 0, B: 0, C: 0, D: 0 }
                }
                connected={connected}
                playerCount={
                  typeof stats?.playerCount === "number" ? stats.playerCount : 0
                }
                answerCount={
                  typeof stats?.answerCount === "number" ? stats.answerCount : 0
                }
                randomizeAnswers={gameState?.randomizeAnswers || false}
                onStartQuestion={handleStartQuestion}
                onRevealAnswer={handleRevealAnswer}
                onPreviousQuestion={handlePreviousQuestion}
                onNextQuestion={handleNextQuestion}
                onRevealWinner={handleRevealWinner}
                onViewLeaderboard={() => setShowLeaderboard(true)}
              />
              <ActiveGameJoinInfo sessionCode={sessionCode} />
            </div>

            {/* Right Column - Stats/Players/Leaderboard */}
            <GameStatsSidebar
              players={Array.isArray(players) ? players : []}
              stats={stats}
              answerRevealed={gameState?.answerRevealed || false}
              correctAnswer={gameState?.correctAnswer}
              streakThresholds={
                gameState?.scoringConfig &&
                typeof (gameState.scoringConfig as any)?.streakThresholds !==
                  "undefined"
                  ? (gameState.scoringConfig as any).streakThresholds
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Leaderboard/Winner Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => {
          if (!winnerRevealed) {
            setShowLeaderboard(false);
          }
        }}
        players={Array.isArray(players) ? players : []}
        playerScores={
          stats?.playerScores && typeof stats.playerScores === "object"
            ? stats.playerScores
            : {}
        }
        winnerRevealed={winnerRevealed}
        onEndGame={() => dispatch(setShowEndGameModal(true))}
        streakThresholds={(gameState?.scoringConfig as any)?.streakThresholds}
        isLastQuestion={questionCount > 0 && currentIndex >= questionCount - 1}
      />

      {/* End Game Modal */}
      <EndGameModal
        isOpen={showEndGameModal}
        onClose={() => dispatch(setShowEndGameModal(false))}
        onConfirm={() => {
          if (socket && connected) {
            socket.emit("CANCEL_SESSION", { sessionCode });
          }
          dispatch(setShowEndGameModal(false));
          router.push("/");
        }}
        sessionCode={sessionCode}
      />
    </>
  );
}
