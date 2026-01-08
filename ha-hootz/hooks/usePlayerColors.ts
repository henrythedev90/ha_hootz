import { useRandomColors } from "./useRandomColors";

interface Player {
  playerId: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Hook to generate random colors for players
 * Uses useRandomColors internally with player-specific configuration
 */
export function usePlayerColors(players: Player[]) {
  // Map players to items with id property for useRandomColors
  const playerItems = players.map((player) => ({
    id: player.playerId,
    ...player,
  }));

  return useRandomColors(playerItems, {
    shuffle: false, // Random colors for players
    opacity: 0.3,
  });
}
