"use client";

import { Users, X } from "lucide-react";

interface LiveGameHeaderProps {
  sessionCode: string;
  playerCount: number;
  connected: boolean;
  onEndGame: () => void;
}

export default function LiveGameHeader({
  sessionCode,
  playerCount,
  connected,
  onEndGame,
}: LiveGameHeaderProps) {
  return (
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
              {playerCount} Players
            </span>
            <span className={connected ? "text-success" : "text-error"}>
              {connected ? "🟢 Connected" : "🔴 Disconnected"}
            </span>
          </div>
        </div>
        <button
          onClick={onEndGame}
          className="px-4 py-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-lg flex items-center gap-2 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>End Game</span>
        </button>
      </div>
    </div>
  );
}

