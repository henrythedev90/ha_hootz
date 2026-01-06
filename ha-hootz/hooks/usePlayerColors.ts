import { useState, useEffect } from "react";

interface Player {
  playerId: string;
  name: string;
  avatarUrl?: string;
}

interface PlayerColor {
  color: string;
  rgba: string;
}

const COLOR_PALETTE = [
  "#6366F1",
  "#22D3EE",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
  "#10B981",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#84CC16",
];

export function usePlayerColors(players: Player[]) {
  const [playerColors, setPlayerColors] = useState<Record<string, PlayerColor>>(
    {}
  );

  useEffect(() => {
    setPlayerColors((prevColors) => {
      const newColors: Record<string, PlayerColor> = { ...prevColors };

      players.forEach((player) => {
        if (!newColors[player.playerId]) {
          // Pick a random color from palette
          const randomColor =
            COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
          // Convert hex to rgba for glow effect
          const r = parseInt(randomColor.slice(1, 3), 16);
          const g = parseInt(randomColor.slice(3, 5), 16);
          const b = parseInt(randomColor.slice(5, 7), 16);
          newColors[player.playerId] = {
            color: randomColor,
            rgba: `rgba(${r},${g},${b},0.3)`,
          };
        }
      });

      return newColors;
    });
  }, [players]);

  return playerColors;
}
