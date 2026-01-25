"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import Loading from "./Loading";
import { usePlayerColors } from "@/hooks/usePlayerColors";
import Image from "next/image";

interface Player {
  playerId: string;
  name: string;
  avatarUrl?: string;
}

interface PlayersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
  socket: Socket | null;
  connected?: boolean;
}

export default function PlayersListModal({
  isOpen,
  onClose,
  sessionCode,
  socket,
  connected,
}: PlayersListModalProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number>(5);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStartTimeRef = useRef<number | null>(null);
  const countdownDurationRef = useRef<number>(5); // 5 seconds
  const hasClosedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerColors = usePlayerColors(players);

  // Update onClose ref when it changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Fetch players when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setCountdown(0);
      setLoading(true);
      setError("");
      setPlayers([]);
      // Clear any pending redirect timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      return;
    }

    const fetchPlayers = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}/players`);
        const data = await response.json();
        if (data.success) {
          setPlayers(data.players);
        } else {
          setError(data.error || "Failed to fetch players");
        }
      } catch (err: any) {
        console.error("Error fetching players:", err);
        setError(err.message || "Failed to fetch players");
      } finally {
        setLoading(false);
      }
    };

  }, [isOpen, sessionCode]);

  // Listen for player join/leave events via socket
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handlePlayerJoined = (data: {
      playerId: string;
      name: string;
      avatarUrl?: string;
      playerCount: number;
    }) => {
      // Validate data before processing
      if (!data.playerId || !data.name) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[PlayersListModal] Invalid player-joined data:", data);
        }
        return;
      }
      
      setPlayers((prev) => {
        // Ensure prev is an array
        const safePrev = Array.isArray(prev) ? prev : [];
        if (safePrev.some((p) => p.playerId === data.playerId)) {
          return safePrev;
        }
        return [
          ...safePrev,
          {
            playerId: data.playerId,
            name: data.name,
            avatarUrl: data.avatarUrl,
          },
        ];
      });
    };

    const handlePlayerLeft = (data: {
      playerId: string;
      playerCount: number;
    }) => {
      // Validate data before processing
      if (!data.playerId) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[PlayersListModal] Invalid player-left data:", data);
        }
        return;
      }
      
      setPlayers((prev) => {
        // Ensure prev is an array
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter((p) => p.playerId !== data.playerId);
      });
    };

    socket.on("player-joined", handlePlayerJoined);
    socket.on("player-left", handlePlayerLeft);

    return () => {
      socket.off("player-joined", handlePlayerJoined);
      socket.off("player-left", handlePlayerLeft);
    };
  }, [socket, isOpen]);

  // Countdown timer - automatically close after countdown
  // Uses timestamp-based approach for accurate timing
  // Continues running even when confirmation modal is open
  useEffect(() => {
    if (!isOpen) {
      // Clean up if modal is closed
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      // Clear redirect timeout if modal closes
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      countdownStartTimeRef.current = null;
      hasClosedRef.current = false;
      return;
    }

    // Reset closed flag and initialize when modal opens
    if (!countdownStartTimeRef.current) {
      hasClosedRef.current = false;
      countdownDurationRef.current = 5;
      setCountdown(5);

      // Record start time when countdown begins
      const startTime = Date.now();
      countdownStartTimeRef.current = startTime;
    }

    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const durationMs = 5000; // 5 seconds in milliseconds

    // Update countdown based on elapsed time (more accurate than interval-based)
    const updateCountdown = () => {
      if (hasClosedRef.current || !countdownStartTimeRef.current) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }

      const elapsed = Date.now() - countdownStartTimeRef.current;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));

      setCountdown(remaining);

      if (remaining <= 0) {
        if (!hasClosedRef.current) {
          hasClosedRef.current = true;
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          // Close confirmation modal if open, then close main modal
          setShowCancelConfirm(false);
          onCloseRef.current();
        }
      }
    };

    // Update immediately to show initial countdown
    updateCountdown();

    // Update every 100ms for smooth countdown display
    // But calculate based on actual elapsed time for accuracy
    countdownIntervalRef.current = setInterval(updateCountdown, 100);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isOpen]);

  const handleStartNow = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    onClose();
  };

  const handleCancel = () => {
    // Show confirmation modal instead of immediately canceling
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    countdownStartTimeRef.current = null;

    // Close confirmation modal
    setShowCancelConfirm(false);

    // Emit CANCEL_SESSION to end the game and notify all players
    if (socket && connected) {
      socket.emit("CANCEL_SESSION", { sessionCode });
    }

    // Close the modal
    onClose();

    // Navigate host back to dashboard
    // The socket handler will also trigger session-cancelled event
    // which will redirect, but we'll do it here too for immediate feedback
    // Clear any existing redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    
    redirectTimeoutRef.current = setTimeout(() => {
      router.push("/");
      redirectTimeoutRef.current = null;
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-[#1A1F35] rounded-2xl border border-[#6366F1]/30 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 border-b border-[#6366F1]/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-[#E5E7EB] mb-2">
                      Players Joined
                    </h2>
                    <p className="text-[#E5E7EB]/60">
                      Session Code:{" "}
                      <span className="text-[#22D3EE] font-mono font-semibold">
                        {sessionCode}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="px-4 py-2 bg-[#6366F1]/20 text-[#6366F1] rounded-lg">
                      <span className="text-3xl font-bold">
                        {players.length}
                      </span>
                      <span className="text-sm ml-2">
                        {players.length === 1 ? "Player" : "Players"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Players List */}
              <div className="px-8 py-6 flex-1 overflow-y-auto">
                {loading ? (
                  <Loading
                    message="Loading players..."
                    fullScreen={false}
                    variant="dots"
                    size="small"
                  />
                ) : error && (!Array.isArray(players) || !players.length) ? (
                  <div className="text-center py-12">
                    <p className="text-[#EF4444]">{error}</p>
                  </div>
                ) : !Array.isArray(players) || players.length === 0 ? (
                  <div className="text-center py-12 text-[#E5E7EB]/50">
                    <p className="text-lg">
                      No players have joined yet. Waiting for players...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {Array.isArray(players) && players.map((player, index) => {
                        // Validate player data
                        if (!player || !player.playerId || !player.name) {
                          return null;
                        }
                        
                        return (
                        <motion.div
                          key={player.playerId}
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -10 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                            delay: index * 0.03,
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-[#1A1F35] rounded-full border hover:bg-[#1A1F35]/80 transition-all group shadow-sm"
                          style={
                            playerColors[player.playerId]
                              ? {
                                  borderColor:
                                    playerColors[player.playerId].color,
                                  boxShadow: `0 0 20px ${
                                    playerColors[player.playerId].rgba
                                  }`,
                                }
                              : {
                                  borderColor: "#6366F1",
                                  boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)",
                                }
                          }
                        >
                          {/* Avatar Pill */}
                          {player.avatarUrl ? (
                            <div
                              className="relative w-8 h-8 rounded-full overflow-hidden ring-2 shadow-md shrink-0"
                              style={
                                playerColors[player.playerId]
                                  ? {
                                      borderColor:
                                        playerColors[player.playerId].color,
                                      boxShadow: `0 0 15px ${
                                        playerColors[player.playerId].rgba
                                      }`,
                                    }
                                  : {
                                      borderColor: "#6366F1",
                                      boxShadow:
                                        "0 0 15px rgba(99, 102, 241, 0.3)",
                                    }
                              }
                            >
                              <Image
                                src={player.avatarUrl}
                                alt={player.name}
                                fill
                                className="object-cover"
                                unoptimized
                                onError={(e) => {
                                  // Fallback to initial if image fails to load
                                  if (process.env.NODE_ENV === "development") {
                                    console.warn(
                                      `[PlayersListModal] Failed to load avatar for ${player.name}`,
                                    );
                                  }
                                  // Image component will handle the error gracefully
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full bg-linear-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                              style={
                                playerColors[player.playerId]
                                  ? {
                                      boxShadow: `0 0 15px ${
                                        playerColors[player.playerId].rgba
                                      }`,
                                    }
                                  : {}
                              }
                            >
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-[#E5E7EB] pr-1">
                            {player.name}
                          </span>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-1.5 h-1.5 bg-[#22C55E] rounded-full shadow-sm shadow-[#22C55E]/50"
                          />
                        </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Countdown and Actions */}
              <div className="px-8 py-6 border-t border-[#6366F1]/20 bg-[#0B1020]/30">
                <div className="text-center mb-6">
                  <p className="text-[#E5E7EB]/60 mb-2">
                    Starting automatically in
                  </p>
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl font-bold text-[#22D3EE] mb-1"
                  >
                    {countdown}
                  </motion.div>
                  <p className="text-sm text-[#E5E7EB]/50">
                    {countdown === 1 ? "second" : "seconds"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancel}
                    className="flex-1 px-6 py-4 bg-[#1A1F35] hover:bg-[#252B44] border-2 border-[#6366F1]/30 hover:border-[#6366F1]/50 text-[#E5E7EB] rounded-xl transition-all font-medium"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartNow}
                    disabled={!Array.isArray(players) || players.length === 0}
                    className="flex-1 px-6 py-4 bg-linear-to-r from-[#6366F1] to-[#5558E3] hover:from-[#5558E3] hover:to-[#4F46E5] text-white rounded-xl font-semibold shadow-lg shadow-[#6366F1]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#6366F1] disabled:hover:to-[#5558E3]"
                  >
                    Start Now
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Session"
        itemName="session"
        description="Are you sure you want to cancel this session? All players will be disconnected and the game will end."
        playerMode={false}
        countdown={countdown}
      />
    </>
  );
}
