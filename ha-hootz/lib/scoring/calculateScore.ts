/**
 * Pure scoring calculation functions
 *
 * These functions contain the core game logic for calculating scores.
 * They are pure functions (no side effects) and can be easily unit tested.
 *
 * Business Rules:
 * 1. Base points are awarded for correct answers
 * 2. Time bonus is calculated based on remaining time (if enabled)
 * 3. Streak bonus is calculated based on consecutive correct answers (if enabled)
 * 4. Incorrect or unanswered questions receive 0 points
 */

import type { ScoringConfig } from "@/types";

/**
 * Calculate time bonus based on remaining time
 *
 * Formula: maxTimeBonus * (timeRemaining / totalDuration)
 *
 * @param submissionTime - Timestamp when player submitted answer (milliseconds)
 * @param questionStartTime - Timestamp when question started (milliseconds)
 * @param questionDuration - Total duration of question (milliseconds)
 * @param maxTimeBonus - Maximum bonus points available
 * @returns Time bonus points (0 to maxTimeBonus)
 */
export function calculateTimeBonus(
  submissionTime: number,
  questionStartTime: number,
  questionDuration: number,
  maxTimeBonus: number
): number {
  // Calculate time remaining
  const timeRemaining = questionStartTime + questionDuration - submissionTime;

  // No bonus if time expired
  if (timeRemaining <= 0) {
    return 0;
  }

  // Calculate ratio (0 to 1) and apply to max bonus
  const timeRatio = Math.max(0, Math.min(1, timeRemaining / questionDuration));
  const bonus = Math.round(maxTimeBonus * timeRatio);

  return bonus;
}

/**
 * Calculate streak bonus based on current streak and thresholds
 *
 * Business Rule: Player receives bonus for the highest threshold they've reached.
 * Example: If thresholds are [3, 5, 7] and player has streak of 6,
 * they receive the bonus for threshold 5 (the highest one they've reached).
 *
 * @param streak - Current consecutive correct answer count
 * @param thresholds - Array of streak thresholds (e.g., [3, 5, 7])
 * @param bonusValues - Array of bonus values for each threshold (e.g., [10, 25, 50])
 * @returns Streak bonus points
 */
export function calculateStreakBonus(
  streak: number,
  thresholds: number[],
  bonusValues: number[]
): number {
  // Validate input
  if (thresholds.length !== bonusValues.length) {
    throw new Error(
      "Streak thresholds and bonus values arrays must have the same length"
    );
  }

  // No bonus if streak is below the first threshold
  if (streak < (thresholds[0] || 0)) {
    return 0;
  }

  // Find the highest threshold the player has reached
  // We iterate backwards to find the highest matching threshold
  let bonus = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (streak >= thresholds[i]) {
      bonus = bonusValues[i];
      break;
    }
  }

  return bonus;
}

/**
 * Calculate total score for a player's answer
 *
 * Business Rules:
 * - Incorrect or unanswered answers receive 0 points
 * - Correct answers receive base points
 * - Time bonus is added if enabled and answer was submitted in time
 * - Streak bonus is added if enabled and player has reached a threshold
 *
 * @param playerAnswer - Player's answer ("A", "B", "C", "D", or "NO_ANSWER")
 * @param correctAnswer - Correct answer ("A", "B", "C", or "D")
 * @param scoringConfig - Scoring configuration
 * @param submissionTime - Timestamp when player submitted answer (milliseconds, optional)
 * @param questionStartTime - Timestamp when question started (milliseconds, optional)
 * @param questionDuration - Total duration of question (milliseconds, optional)
 * @param currentStreak - Player's current streak count (optional, defaults to 0)
 * @returns Total score for this answer
 */
export function calculateScore(
  playerAnswer: string,
  correctAnswer: "A" | "B" | "C" | "D",
  scoringConfig: ScoringConfig,
  options?: {
    submissionTime?: number;
    questionStartTime?: number;
    questionDuration?: number;
    currentStreak?: number;
  }
): number {
  const isCorrect = playerAnswer === correctAnswer;
  const isUnanswered = playerAnswer === "NO_ANSWER";

  // Business Rule: Incorrect or unanswered = 0 points
  if (!isCorrect || isUnanswered) {
    return 0;
  }

  // Business Rule: Correct answer receives base points
  let totalScore = scoringConfig.basePoints;

  // Business Rule: Add time bonus if enabled
  if (
    scoringConfig.timeBonusEnabled &&
    options?.submissionTime &&
    options?.questionStartTime &&
    options?.questionDuration
  ) {
    const timeBonus = calculateTimeBonus(
      options.submissionTime,
      options.questionStartTime,
      options.questionDuration,
      scoringConfig.maxTimeBonus
    );
    totalScore += timeBonus;
  }

  // Business Rule: Add streak bonus if enabled
  if (scoringConfig.streakBonusEnabled && options?.currentStreak) {
    const streakBonus = calculateStreakBonus(
      options.currentStreak,
      scoringConfig.streakThresholds,
      scoringConfig.streakBonusValues
    );
    totalScore += streakBonus;
  }

  return totalScore;
}
