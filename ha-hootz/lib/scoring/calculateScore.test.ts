/**
 * Unit tests for scoring calculation functions
 *
 * These tests verify the business rules for scoring:
 * - Base points for correct answers
 * - Time bonus calculation
 * - Streak bonus calculation
 * - Zero points for incorrect/unanswered
 */

import {
  calculateTimeBonus,
  calculateStreakBonus,
  calculateScore,
} from "./calculateScore";
import type { ScoringConfig } from "@/types";

describe("calculateTimeBonus", () => {
  it("should return 0 when time has expired", () => {
    const questionStartTime = 1000;
    const questionDuration = 30000; // 30 seconds
    const submissionTime = 31000; // 1 second after expiration
    const maxTimeBonus = 50;

    const bonus = calculateTimeBonus(
      submissionTime,
      questionStartTime,
      questionDuration,
      maxTimeBonus
    );

    expect(bonus).toBe(0);
  });

  it("should return maximum bonus when answer is submitted immediately", () => {
    const questionStartTime = 1000;
    const questionDuration = 30000;
    const submissionTime = 1001; // 1ms after start
    const maxTimeBonus = 50;

    const bonus = calculateTimeBonus(
      submissionTime,
      questionStartTime,
      questionDuration,
      maxTimeBonus
    );

    expect(bonus).toBe(maxTimeBonus);
  });

  it("should return half bonus when half time remains", () => {
    const questionStartTime = 1000;
    const questionDuration = 30000;
    const submissionTime = 16000; // 15 seconds remaining (half)
    const maxTimeBonus = 50;

    const bonus = calculateTimeBonus(
      submissionTime,
      questionStartTime,
      questionDuration,
      maxTimeBonus
    );

    expect(bonus).toBe(25);
  });

  it("should round bonus values correctly", () => {
    const questionStartTime = 1000;
    const questionDuration = 10000;
    // To get half time remaining, submit at: startTime + (duration / 2) = 1000 + 5000 = 6000
    const submissionTime = 6000; // Half time remaining
    const maxTimeBonus = 33; // Will result in 16.5, should round to 17

    const bonus = calculateTimeBonus(
      submissionTime,
      questionStartTime,
      questionDuration,
      maxTimeBonus
    );

    expect(bonus).toBe(17);
  });
});

describe("calculateStreakBonus", () => {
  const thresholds = [3, 5, 7];
  const bonusValues = [10, 25, 50];

  it("should return 0 when streak is below first threshold", () => {
    const bonus = calculateStreakBonus(2, thresholds, bonusValues);
    expect(bonus).toBe(0);
  });

  it("should return bonus for first threshold when streak equals threshold", () => {
    const bonus = calculateStreakBonus(3, thresholds, bonusValues);
    expect(bonus).toBe(10);
  });

  it("should return bonus for highest threshold reached", () => {
    // Streak of 6 should get bonus for threshold 5 (second threshold)
    const bonus = calculateStreakBonus(6, thresholds, bonusValues);
    expect(bonus).toBe(25);
  });

  it("should return bonus for highest threshold when streak exceeds all", () => {
    const bonus = calculateStreakBonus(10, thresholds, bonusValues);
    expect(bonus).toBe(50); // Highest bonus
  });

  it("should throw error when thresholds and values arrays have different lengths", () => {
    expect(() => {
      calculateStreakBonus(5, [3, 5], [10, 25, 50]);
    }).toThrow(
      "Streak thresholds and bonus values arrays must have the same length"
    );
  });

  it("should handle single threshold correctly", () => {
    const bonus = calculateStreakBonus(5, [3], [10]);
    expect(bonus).toBe(10);
  });
});

describe("calculateScore", () => {
  const baseConfig: ScoringConfig = {
    basePoints: 100,
    questionDuration: 30,
    timeBonusEnabled: false,
    maxTimeBonus: 50,
    streakBonusEnabled: false,
    streakThresholds: [3, 5, 7],
    streakBonusValues: [10, 25, 50],
    revealScores: "after-question",
  };

  describe("Basic scoring rules", () => {
    it("should return 0 for incorrect answer", () => {
      const score = calculateScore("A", "B", baseConfig);
      expect(score).toBe(0);
    });

    it("should return 0 for unanswered question", () => {
      const score = calculateScore("NO_ANSWER", "A", baseConfig);
      expect(score).toBe(0);
    });

    it("should return base points for correct answer", () => {
      const score = calculateScore("A", "A", baseConfig);
      expect(score).toBe(100);
    });
  });

  describe("Time bonus", () => {
    const timeConfig: ScoringConfig = {
      ...baseConfig,
      timeBonusEnabled: true,
    };

    it("should add time bonus when enabled and answer is fast", () => {
      const questionStartTime = 1000;
      const questionDuration = 30000;
      const submissionTime = 5000; // 25 seconds remaining

      const score = calculateScore("A", "A", timeConfig, {
        submissionTime,
        questionStartTime,
        questionDuration,
      });

      // Base (100) + time bonus (~42 for 25/30 remaining)
      expect(score).toBeGreaterThan(100);
      expect(score).toBeLessThanOrEqual(150);
    });

    it("should not add time bonus when time has expired", () => {
      const questionStartTime = 1000;
      const questionDuration = 30000;
      const submissionTime = 35000; // After expiration

      const score = calculateScore("A", "A", timeConfig, {
        submissionTime,
        questionStartTime,
        questionDuration,
      });

      expect(score).toBe(100); // Only base points
    });

    it("should not add time bonus when disabled", () => {
      const score = calculateScore("A", "A", baseConfig, {
        submissionTime: 5000,
        questionStartTime: 1000,
        questionDuration: 30000,
      });

      expect(score).toBe(100); // Only base points
    });
  });

  describe("Streak bonus", () => {
    const streakConfig: ScoringConfig = {
      ...baseConfig,
      streakBonusEnabled: true,
    };

    it("should add streak bonus when streak reaches threshold", () => {
      const score = calculateScore("A", "A", streakConfig, {
        currentStreak: 3,
      });

      // Base (100) + streak bonus (10)
      expect(score).toBe(110);
    });

    it("should add highest streak bonus when streak exceeds multiple thresholds", () => {
      const score = calculateScore("A", "A", streakConfig, {
        currentStreak: 7,
      });

      // Base (100) + highest streak bonus (50)
      expect(score).toBe(150);
    });

    it("should not add streak bonus when streak is below threshold", () => {
      const score = calculateScore("A", "A", streakConfig, {
        currentStreak: 2,
      });

      expect(score).toBe(100); // Only base points
    });

    it("should not add streak bonus when disabled", () => {
      const score = calculateScore("A", "A", baseConfig, {
        currentStreak: 5,
      });

      expect(score).toBe(100); // Only base points
    });
  });

  describe("Combined bonuses", () => {
    const fullConfig: ScoringConfig = {
      basePoints: 100,
      questionDuration: 30,
      timeBonusEnabled: true,
      maxTimeBonus: 50,
      streakBonusEnabled: true,
      streakThresholds: [3, 5, 7],
      streakBonusValues: [10, 25, 50],
      revealScores: "after-question",
    };

    it("should combine base points, time bonus, and streak bonus", () => {
      const questionStartTime = 1000;
      const questionDuration = 30000;
      const submissionTime = 5000; // Fast answer
      const currentStreak = 5; // Meets threshold

      const score = calculateScore("A", "A", fullConfig, {
        submissionTime,
        questionStartTime,
        questionDuration,
        currentStreak,
      });

      // Base (100) + time bonus (~42) + streak bonus (25) = ~167
      expect(score).toBeGreaterThan(150);
      expect(score).toBeLessThanOrEqual(200);
    });

    it("should handle all bonuses at maximum", () => {
      const questionStartTime = 1000;
      const questionDuration = 30000;
      const submissionTime = 1001; // Immediate answer
      const currentStreak = 10; // Exceeds all thresholds

      const score = calculateScore("A", "A", fullConfig, {
        submissionTime,
        questionStartTime,
        questionDuration,
        currentStreak,
      });

      // Base (100) + max time bonus (50) + max streak bonus (50) = 200
      expect(score).toBe(200);
    });
  });
});
