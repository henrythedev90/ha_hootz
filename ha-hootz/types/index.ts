export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: "multiple-choice";
  text: string;
  timeLimit?: number; // in seconds
  points?: number;
  options: AnswerOption[];
}

export interface ScoringConfig {
  // Base scoring
  basePoints: number; // Default: 100

  // Question timer duration
  questionDuration: number; // Duration in seconds: 10, 20, or 30 (default: 30)

  // Time-based bonus
  timeBonusEnabled: boolean;
  maxTimeBonus: number; // Maximum bonus points (default: 50)

  // Streak bonus
  streakBonusEnabled: boolean;
  streakThresholds: number[]; // e.g., [3, 5, 7] for bonuses at 3, 5, 7+ consecutive correct
  streakBonusValues: number[]; // Bonus points for each threshold (e.g., [10, 25, 50])

  // Score reveal timing
  revealScores: "immediate" | "after-question" | "after-game"; // When to show scores to players
}

export interface Presentation {
  id: string;
  userId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  scoringConfig?: ScoringConfig; // Optional, defaults applied if not set
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}
