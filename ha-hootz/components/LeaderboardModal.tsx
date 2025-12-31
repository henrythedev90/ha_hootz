"use client";

import { motion, AnimatePresence } from "framer-motion";
import Modal from "./Modal";

interface Player {
  playerId: string;
  name: string;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  playerScores: Record<string, number>;
  winnerRevealed: boolean;
  onEndGame: () => void;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  players,
  playerScores,
  winnerRevealed,
  onEndGame,
}: LeaderboardModalProps) {
  const leaderboard = players
    .map((player) => ({
      ...player,
      score: playerScores[player.playerId] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  const winner = leaderboard.length > 0 ? leaderboard[0] : null;
  const isTie =
    leaderboard.length > 1 &&
    leaderboard[0].score > 0 &&
    leaderboard[0].score === leaderboard[1].score;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={winnerRevealed ? "🏆 Winner!" : "Leaderboard"}
      size="4xl"
    >
      <div className="space-y-6">
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
        )}
        <div className="space-y-3">
          {players.length === 0 ? (
            <p className="text-center text-text-light/50 py-8">
              No players yet
            </p>
          ) : (
            <AnimatePresence>
              {leaderboard.map((player, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
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
                          <span className="ml-2 text-cyan/70">- Winner!</span>
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
              onClick={onEndGame}
              className="px-6 py-3 bg-error text-white rounded-md hover:bg-error/90 transition-colors font-medium"
            >
              End Game
            </motion.button>
          </div>
        )}
      </div>
    </Modal>
  );
}

