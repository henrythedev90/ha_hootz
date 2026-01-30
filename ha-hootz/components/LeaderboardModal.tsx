"use client";

import { motion, AnimatePresence } from "framer-motion";
import Modal from "./Modal";
import { useMemo, useEffect, useRef } from "react";
import ConfettiEffect from "./ConfettiEffect";

interface Player {
  playerId: string;
  name: string;
  avatarUrl?: string;
  streak?: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  playerScores: Record<string, number>;
  winnerRevealed: boolean;
  onEndGame: () => void;
  streakThresholds?: number[];
  isLastQuestion?: boolean;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  players,
  playerScores,
  winnerRevealed,
  onEndGame,
  streakThresholds = [3, 5, 7], // Default thresholds
  isLastQuestion = false,
}: LeaderboardModalProps) {
  const renderCountRef = useRef(0);

  // DEBUG: Track renders (only in development)
  useEffect(() => {
    if (isOpen && process.env.NODE_ENV === "development") {
      renderCountRef.current += 1;
      console.log(`[LeaderboardModal] Render #${renderCountRef.current}`, {
        isOpen,
        winnerRevealed,
        playersCount: players.length,
      });
    }
  }, [isOpen, winnerRevealed, players.length]);

  // Get the first threshold (streak doesn't start until this many consecutive correct)
  const firstThreshold = streakThresholds.length > 0 ? streakThresholds[0] : 3;

  // FIX: Memoize leaderboard calculation to prevent expensive re-sorts on every render
  const leaderboard = useMemo(() => {
    // Ensure players is an array and playerScores is an object
    const safePlayers = Array.isArray(players) ? players : [];
    const safePlayerScores = playerScores && typeof playerScores === "object" ? playerScores : {};
    
    if (process.env.NODE_ENV === "development") {
      console.log("[LeaderboardModal] Calculating leaderboard (memoized)", {
        playersCount: safePlayers.length,
        scoresCount: Object.keys(safePlayerScores).length,
      });
    }

    const sorted = safePlayers
      .map((player) => ({
        ...player,
        score: safePlayerScores[player.playerId] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[LeaderboardModal] Leaderboard calculated:",
        sorted.length,
        "players"
      );
    }
    return sorted;
  }, [players, playerScores]);

  const winner = leaderboard.length > 0 ? leaderboard[0] : null;
  const isTie =
    leaderboard.length > 1 &&
    leaderboard[0].score > 0 &&
    leaderboard[0].score === leaderboard[1].score;

  return (
    <>
      <ConfettiEffect
        show={isOpen && winnerRevealed && isLastQuestion}
        isTie={isTie}
      />
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={winnerRevealed ? "🏆 Winner!" : "Leaderboard"}
      size="4xl"
    >
      <div className="space-y-6 mt-1">
        {winnerRevealed && (
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
                    It&apos;s a Tie!
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
        )}
        {/* FIX: Removed layout prop to prevent expensive layout recalculations in Chrome */}
        <motion.div className="space-y-3">
          {leaderboard.length === 0 ? (
            <p className="text-center text-text-light/50 py-8">
              No players yet
            </p>
          ) : (
            <AnimatePresence>
              {leaderboard.map((player, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                const isWinner = winnerRevealed && rank === 1 && !isTie;
                const isFirst = rank === 1;
                return (
                  // FIX: Removed layout prop to prevent expensive layout recalculations
                  <motion.div
                    key={player.playerId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      scale: isFirst ? 1.05 : 1,
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 25,
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isWinner
                        ? "bg-cyan/20 border-cyan shadow-lg ring-4 ring-cyan/50"
                        : isTopThree
                        ? rank === 1
                          ? "bg-cyan/20 border-cyan ring-2 ring-cyan/30"
                          : rank === 2
                          ? "bg-card-bg border-indigo/30"
                          : "bg-cyan/10 border-cyan/50"
                        : "bg-deep-navy border-indigo/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* FIX: Removed layout prop */}
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
                        {isTopThree && !isWinner
                          ? ["🥇", "🥈", "🥉"][index]
                          : isWinner
                          ? "👑"
                          : `#${rank}`}
                      </div>
                      {/* FIX: Removed layout props */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-semibold ${
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
                          {(player.streak ?? 0) >= firstThreshold && (
                            <span className="text-xs font-semibold text-cyan bg-cyan/20 px-2 py-0.5 rounded-full">
                              You&apos;re on a streak! 🔥 + {player.streak}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xl font-bold ${
                          isWinner ? "text-cyan" : "text-indigo"
                        }`}
                      >
                        {player.score} pts
                      </span>
                    </div>
                    {isFirst && winnerRevealed && !isTie && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2 pt-2 border-t border-cyan/30 text-center"
                      >
                        <span className="text-cyan font-bold text-sm">
                          ⭐ LEADER ⭐
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </motion.div>
        {winnerRevealed && (
          <div className="flex justify-end pt-4 border-t border-indigo/30">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEndGame}
              className="px-6 py-3 bg-error text-white rounded-md hover:bg-error/90 transition-colors font-medium"
            >
              End Game
            </motion.button>
          </div>
        )}
      </div>
    </Modal>
    </>
  );
}
