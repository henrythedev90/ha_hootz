"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import ConfettiEffect from "./ConfettiEffect";

interface Player {
  playerId: string;
  name: string;
  score: number;
}

interface WinnerDisplayProps {
  isOpen: boolean;
  playerName: string;
  playerId: string;
  leaderboard: Player[];
}

export default function WinnerDisplay({
  isOpen,
  playerName,
  playerId,
  leaderboard,
}: WinnerDisplayProps) {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const renderCountRef = useRef(0);

  // Find player's rank and score
  const playerIndex = leaderboard.findIndex((p) => p.playerId === playerId);
  const playerRank = playerIndex >= 0 ? playerIndex + 1 : null;
  const playerScore = playerIndex >= 0 ? leaderboard[playerIndex].score : 0;
  const totalPlayers = leaderboard.length;

  // Determine if player is in top 3
  const isWinner = playerRank === 1;
  const isSecond = playerRank === 2;
  const isThird = playerRank === 3;
  const isTopThree = playerRank !== null && playerRank <= 3;

  // Check for tie
  const isTie =
    leaderboard.length > 1 &&
    leaderboard[0].score > 0 &&
    leaderboard[0].score === leaderboard[1].score;

  // DEBUG: Track renders
  useEffect(() => {
    if (isOpen) {
      renderCountRef.current += 1;
      console.log(`[WinnerDisplay] Render #${renderCountRef.current}`, {
        isOpen,
        isWinner,
        playerRank,
        totalPlayers,
      });
    }
  }, [isOpen, isWinner, playerRank, totalPlayers]);

  // Conditional return AFTER all hooks
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <ConfettiEffect show={isOpen && isWinner} isTie={isTie} />
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/90 p-3 sm:p-2 md:p-4 overflow-y-auto">
        <div className="w-full max-w-4xl relative z-10 py-3 sm:py-4">
          {/* Winner Announcement Banner - Only for 1st Place */}
          <AnimatePresence>
            {isWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -50 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="mb-3 sm:mb-3 md:mb-4 lg:mb-6"
              >
                <div className="bg-linear-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl sm:rounded-xl md:rounded-2xl p-3 sm:p-3 md:p-4 lg:p-6 xl:p-8 shadow-2xl border-3 sm:border-3 md:border-4 border-yellow-300">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, -5, 5, -5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: 2, // FIX: Limited to 2 repeats instead of Infinity (prevents Chrome crashes)
                      repeatDelay: 1,
                    }}
                    className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl mb-2 sm:mb-2 md:mb-3 lg:mb-4 text-center"
                  >
                    🏆
                  </motion.div>
                  <h1 className="text-2xl sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-2 sm:mb-2 md:mb-3 drop-shadow-lg text-center">
                    {isTie ? "It's a Tie!" : "Congratulations!"}
                  </h1>
                  <h2 className="text-xl sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-yellow-100 mb-1.5 sm:mb-1 md:mb-2 font-semibold text-center">
                    {playerName}
                  </h2>
                  <p className="text-lg sm:text-base md:text-lg lg:text-xl xl:text-2xl text-yellow-100 font-bold text-center">
                    You Won with {playerScore} points!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player's Rank Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isWinner ? 0.5 : 0 }}
            className="bg-card-bg rounded-2xl sm:rounded-xl md:rounded-2xl shadow-2xl p-3 sm:p-3 md:p-4 lg:p-6 mb-3 sm:mb-3 md:mb-4 lg:mb-6 border border-indigo/20"
          >
            <div className="text-center">
              <h2 className="text-2xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-text-light mb-2.5 sm:mb-2 md:mb-3 lg:mb-4">
                Your Final Rank
              </h2>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  delay: isWinner ? 0.7 : 0.2,
                }}
                className={`inline-flex items-center justify-center w-20 h-20 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 rounded-full text-3xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2.5 sm:mb-2 md:mb-3 ${
                  isWinner
                    ? "bg-linear-to-br from-cyan to-indigo text-white shadow-lg shadow-cyan/50"
                    : isSecond
                    ? "bg-linear-to-br from-card-bg to-deep-navy text-text-light shadow-lg border-2 border-indigo/30"
                    : isThird
                    ? "bg-linear-to-br from-cyan/50 to-indigo/50 text-text-light shadow-lg border-2 border-cyan/30"
                    : "bg-linear-to-br from-indigo to-cyan text-white shadow-lg"
                }`}
              >
                {isWinner ? (
                  <motion.span
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: 2, repeatDelay: 1 }} // FIX: Limited to 2 repeats
                  >
                    👑
                  </motion.span>
                ) : (
                  `#${playerRank}`
                )}
              </motion.div>
              <h3 className="text-xl sm:text-lg md:text-xl lg:text-2xl font-bold text-text-light mb-1.5 sm:mb-1 md:mb-2">
                {playerName}
              </h3>
              <p className="text-lg sm:text-base md:text-lg lg:text-xl text-indigo font-semibold mb-2 sm:mb-1.5 md:mb-2 lg:mb-3">
                {playerScore} points
              </p>
              <p className="text-base sm:text-sm md:text-base text-text-light/70">
                Out of {totalPlayers}{" "}
                {totalPlayers === 1 ? "player" : "players"}
              </p>
            </div>
          </motion.div>

          {/* Full Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isWinner ? 0.9 : 0.4 }}
            className="bg-card-bg rounded-2xl sm:rounded-xl md:rounded-2xl shadow-2xl p-3 sm:p-3 md:p-4 lg:p-6 border border-indigo/20"
          >
            <h3 className="text-xl sm:text-lg md:text-xl lg:text-2xl font-bold text-text-light mb-2.5 sm:mb-2 md:mb-3 lg:mb-4 text-center">
              Final Leaderboard
            </h3>
            <div className="space-y-2 sm:space-y-1.5 md:space-y-2 lg:space-y-3 max-h-[55vh] sm:max-h-[40vh] md:max-h-[45vh] lg:max-h-[50vh] xl:max-h-none overflow-y-auto pr-1">
              {leaderboard.length === 0 ? (
                <p className="text-center text-text-light/50 py-3 sm:py-3 md:py-4 lg:py-6">
                  No players
                </p>
              ) : (
                leaderboard.map((player, index) => {
                  const rank = index + 1;
                  const isPlayer = player.playerId === playerId;
                  const isTopThree = rank <= 3;

                  return (
                    <motion.div
                      key={player.playerId}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: (isWinner ? 1.1 : 0.6) + index * 0.1,
                        type: "spring",
                      }}
                      className={`p-2.5 sm:p-2 md:p-3 lg:p-4 rounded-xl sm:rounded-lg md:rounded-xl border-2 transition-all ${
                        isPlayer
                          ? "bg-indigo/20 border-indigo shadow-xl shadow-indigo/20"
                          : isTopThree
                          ? rank === 1
                            ? "bg-cyan/20 border-cyan"
                            : rank === 2
                            ? "bg-card-bg border-indigo/30"
                            : "bg-cyan/10 border-cyan/50"
                          : "bg-deep-navy border-indigo/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-1.5 md:gap-2 lg:gap-3">
                        <div
                          className={`text-xl sm:text-lg md:text-xl lg:text-2xl font-bold shrink-0 ${
                            isTopThree
                              ? rank === 1
                                ? "text-cyan"
                                : rank === 2
                                ? "text-text-light/50"
                                : "text-cyan/70"
                              : "text-text-light/50"
                          }`}
                        >
                          {rank === 1 ? (
                            <motion.span
                              animate={{ rotate: [0, -5, 5, -5, 0] }}
                              transition={{
                                duration: 2,
                                repeat: 2, // FIX: Limited to 2 repeats instead of Infinity
                                repeatDelay: 1,
                              }}
                            >
                              👑
                            </motion.span>
                          ) : (
                            `#${rank}`
                          )}
                        </div>
                        <span
                          className={`flex-1 text-base sm:text-sm md:text-base lg:text-lg font-semibold truncate ${
                            isPlayer ? "text-indigo" : "text-text-light"
                          }`}
                        >
                          {player.name}
                          {isPlayer && (
                            <span className="ml-2 sm:ml-1.5 text-indigo/70">
                              (You)
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-base sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold shrink-0 ${
                            isPlayer ? "text-indigo" : "text-indigo/80"
                          }`}
                        >
                          {player.score} pts
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
