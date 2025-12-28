export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

import type { ScoringConfig } from "@/types";

/**
 * Get default scoring configuration
 * This is a client-safe function (no server dependencies)
 */
export function getDefaultScoringConfig(): ScoringConfig {
  return {
    basePoints: 100,
    timeBonusEnabled: false,
    maxTimeBonus: 50,
    streakBonusEnabled: false,
    streakThresholds: [3, 5, 7],
    streakBonusValues: [10, 25, 50],
    revealScores: "after-question",
  };
}
