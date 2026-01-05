"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Trophy, BarChart3 } from "lucide-react";

interface Player {
  playerId: string;
  name: string;
}

interface GameStatsSidebarProps {
  players: Player[];
  stats: {
    playerCount: number;
    answerCount: number;
    answerDistribution: { A: number; B: number; C: number; D: number };
    playersWithAnswers?: string[];
    playerScores?: Record<string, number>;
  };
  answerRevealed: boolean;
  correctAnswer?: "A" | "B" | "C" | "D";
}

export default function GameStatsSidebar({
  players,
  stats,
  answerRevealed,
  correctAnswer,
}: GameStatsSidebarProps) {
  const [activeTab, setActiveTab] = useState<
    "players" | "stats" | "leaderboard"
  >("players");

  return (
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
              <p className="text-text-light/50 text-sm">No players joined</p>
            ) : (
              players.map((player) => {
                const hasSubmitted =
                  stats.playersWithAnswers?.includes(player.playerId) || false;
                return (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      hasSubmitted
                        ? "bg-success/20 border border-success shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        : "bg-deep-navy/50"
                    }`}
                  >
                    <span className="text-text-light">{player.name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      {hasSubmitted && (
                        <span className="text-cyan" title="Answer submitted">
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
            <h3 className="font-semibold mb-4 text-text-light">Leaderboard</h3>
            {players.length === 0 ? (
              <p className="text-text-light/50 text-sm">No players yet</p>
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
            <h3 className="font-semibold mb-4 text-text-light">Live Stats</h3>
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
              {answerRevealed && correctAnswer && (
                <div className="p-4 bg-deep-navy/50 rounded-lg">
                  <div className="text-sm text-text-light/60 mb-1">
                    Correct Answers
                  </div>
                  <div className="text-2xl font-bold text-success">
                    {stats.answerDistribution[correctAnswer] || 0}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
