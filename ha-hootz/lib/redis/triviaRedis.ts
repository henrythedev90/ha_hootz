import redisPromise from "./client";
import { TriviaSession, TriviaQuestion } from "../types";
import {
  sessionKey,
  playersKey,
  questionKey,
  answersKey,
  resultsKey,
  leaderboardKey,
  presenceKey,
  sessionCodeKey,
  sessionCodeToIdKey,
  answerTimestampsKey,
  playerStreaksKey,
  questionScoresKey,
} from "./keys";
import { ScoringConfig } from "../../types";

async function getRedis() {
  return await redisPromise;
}

export async function createSession(sessionId: string, session: TriviaSession) {
  const redis = await getRedis();
  await redis.hSet(sessionKey(sessionId), {
    ...session,
    createdAt: session.createdAt.toString(),
    currentQuestion: session.currentQuestion.toString(),
    questionCount: session.questionCount.toString(),
  });

  await redis.expire(sessionKey(sessionId), 60 * 60 * 2);
}

export async function getSession(
  sessionId: string
): Promise<TriviaSession | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(sessionKey(sessionId));
  if (!Object.keys(data).length) return null;

  return {
    status: data.status as TriviaSession["status"],
    hostId: data.hostId,
    currentQuestion: Number(data.currentQuestion),
    questionCount: Number(data.questionCount),
    createdAt: Number(data.createdAt),
  };
}

export async function updateSessionStatus(
  sessionId: string,
  status: TriviaSession["status"]
) {
  const redis = await getRedis();
  await redis.hSet(sessionKey(sessionId), { status });
}
export async function addPlayer(sessionId: string, playerId: string) {
  const redis = await getRedis();
  await redis.sAdd(playersKey(sessionId), playerId);
}

export async function removePlayer(sessionId: string, playerId: string) {
  const redis = await getRedis();
  await redis.sRem(playersKey(sessionId), playerId);
}

export async function getPlayers(sessionId: string) {
  const redis = await getRedis();
  return redis.sMembers(playersKey(sessionId));
}

export async function setQuestion(
  sessionId: string,
  index: number,
  question: TriviaQuestion
) {
  const redis = await getRedis();
  await redis.hSet(questionKey(sessionId, index), {
    ...question,
    startTime: question.startTime.toString(),
    duration: question.duration.toString(),
  });

  // Set expiration to match session expiration (2 hours) so questions persist for the entire game
  await redis.expire(questionKey(sessionId, index), 60 * 60 * 2);
}

export async function getQuestion(
  sessionId: string,
  index: number
): Promise<TriviaQuestion | null> {
  const redis = await getRedis();
  const data = await redis.hGetAll(questionKey(sessionId, index));
  if (!Object.keys(data).length) return null;

  return {
    text: data.text,
    A: data.A,
    B: data.B,
    C: data.C,
    D: data.D,
    correct: data.correct as "A" | "B" | "C" | "D",
    startTime: Number(data.startTime),
    duration: Number(data.duration),
  };
}

export async function getAnswerDistribution(
  sessionId: string,
  questionIndex: number
): Promise<{ A: number; B: number; C: number; D: number }> {
  const redis = await getRedis();
  const results = await redis.zRangeWithScores(
    resultsKey(sessionId, questionIndex),
    0,
    -1
  );

  const distribution = { A: 0, B: 0, C: 0, D: 0 };
  for (const result of results) {
    const answer = result.value as "A" | "B" | "C" | "D";
    if (answer in distribution) {
      distribution[answer] = result.score;
    }
  }

  return distribution;
}

export async function getAnswerCount(
  sessionId: string,
  questionIndex: number
): Promise<number> {
  const redis = await getRedis();
  const answers = await redis.hGetAll(answersKey(sessionId, questionIndex));
  return Object.keys(answers).length;
}

export async function submitAnswer(
  sessionId: string,
  questionIndex: number,
  playerId: string,
  answer: "A" | "B" | "C" | "D"
) {
  const redis = await getRedis();
  const wrote = await redis.hSetNX(
    answersKey(sessionId, questionIndex),
    playerId,
    answer
  );

  if (!wrote) return false;

  await redis.zIncrBy(resultsKey(sessionId, questionIndex), 1, answer);

  return true;
}

export async function addScore(
  sessionId: string,
  playerId: string,
  score: number
) {
  const redis = await getRedis();
  await redis.zIncrBy(leaderboardKey(sessionId), score, playerId);
}

export async function getLeaderboard(sessionId: string, limit = 10) {
  const redis = await getRedis();
  return redis.zRangeWithScores(leaderboardKey(sessionId), 0, limit - 1, {
    REV: true,
  });
}

export async function heartbeat(sessionId: string, playerId: string) {
  const redis = await getRedis();
  await redis.set(presenceKey(sessionId, playerId), "online", { EX: 30 });
}

export async function canSubmitAnswer(sessionId: string, playerId: string) {
  const redis = await getRedis();
  const key = `rate:answer:${sessionId}:${playerId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 5);
  }

  return count <= 1;
}

/**
 * Create a session code mapping to sessionId
 * Returns the session code
 */
export async function createSessionCode(
  sessionId: string,
  ttl: number = 60 * 60
): Promise<string> {
  const redis = await getRedis();
  let sessionCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  // Generate unique 6-digit code
  do {
    sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
    const exists = await redis.exists(sessionCodeToIdKey(sessionCode));
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique session code");
  }

  // Store mapping: sessionCode -> sessionId
  await redis.set(sessionCodeToIdKey(sessionCode), sessionId, { EX: ttl });

  // Store reverse mapping: sessionId -> sessionCode (for quick lookup)
  await redis.set(sessionCodeKey(sessionId), sessionCode, { EX: ttl });

  return sessionCode;
}

/**
 * Get sessionId from session code
 */
export async function getSessionIdFromCode(
  sessionCode: string
): Promise<string | null> {
  const redis = await getRedis();
  return await redis.get(sessionCodeToIdKey(sessionCode));
}

/**
 * Get session code from sessionId
 */

/**
 * Check if session code is valid and active
 */
export async function isSessionCodeValid(
  sessionCode: string
): Promise<boolean> {
  const redis = await getRedis();
  const exists = await redis.exists(sessionCodeToIdKey(sessionCode));
  return exists === 1;
}

/**
 * Store answer submission timestamp for time-based bonus calculation
 */
export async function storeAnswerTimestamp(
  sessionId: string,
  questionIndex: number,
  playerId: string,
  timestamp: number
) {
  const redis = await getRedis();
  await redis.hSet(
    answerTimestampsKey(sessionId, questionIndex),
    playerId,
    timestamp.toString()
  );
}

/**
 * Get answer submission timestamp for a player
 */
export async function getAnswerTimestamp(
  sessionId: string,
  questionIndex: number,
  playerId: string
): Promise<number | null> {
  const redis = await getRedis();
  const timestamp = await redis.hGet(
    answerTimestampsKey(sessionId, questionIndex),
    playerId
  );
  return timestamp ? Number(timestamp) : null;
}

/**
 * Get current streak for a player
 */
export async function getPlayerStreak(
  sessionId: string,
  playerId: string
): Promise<number> {
  const redis = await getRedis();
  const streak = await redis.hGet(playerStreaksKey(sessionId), playerId);
  return streak ? Number(streak) : 0;
}

/**
 * Update player streak (increment on correct, reset on incorrect)
 */
export async function updatePlayerStreak(
  sessionId: string,
  playerId: string,
  isCorrect: boolean
): Promise<number> {
  const redis = await getRedis();
  if (isCorrect) {
    const currentStreak = await getPlayerStreak(sessionId, playerId);
    const newStreak = currentStreak + 1;
    await redis.hSet(
      playerStreaksKey(sessionId),
      playerId,
      newStreak.toString()
    );
    return newStreak;
  } else {
    // Reset streak on incorrect or unanswered
    await redis.hSet(playerStreaksKey(sessionId), playerId, "0");
    return 0;
  }
}

/**
 * Calculate time bonus based on remaining time
 * Formula: maxTimeBonus * (timeRemaining / totalDuration)
 */
function calculateTimeBonus(
  submissionTime: number,
  questionStartTime: number,
  questionDuration: number,
  maxTimeBonus: number
): number {
  // questionDuration is in milliseconds, so we need to use it as-is
  const timeRemaining = questionStartTime + questionDuration - submissionTime;

  if (timeRemaining <= 0) {
    return 0;
  }

  const timeRatio = Math.max(0, Math.min(1, timeRemaining / questionDuration));
  const bonus = Math.round(maxTimeBonus * timeRatio);
  return bonus;
}

/**
 * Calculate streak bonus based on current streak and thresholds
 */
function calculateStreakBonus(
  streak: number,
  thresholds: number[],
  bonusValues: number[]
): number {
  if (thresholds.length !== bonusValues.length) {
    console.error(
      "🔥 Streak bonus error: thresholds and values length mismatch"
    );
    return 0;
  }

  // Find the highest threshold the player has reached
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
 * Calculate score for a player's answer
 */
export async function calculatePlayerScore(
  sessionId: string,
  questionIndex: number,
  playerId: string,
  playerAnswer: string,
  correctAnswer: "A" | "B" | "C" | "D",
  questionStartTime: number,
  questionDuration: number,
  scoringConfig: ScoringConfig
): Promise<number> {
  const isCorrect = playerAnswer === correctAnswer;
  const isUnanswered = playerAnswer === "NO_ANSWER";

  // Incorrect or unanswered = 0 points
  if (!isCorrect || isUnanswered) {
    // Update streak (reset on incorrect/unanswered)
    await updatePlayerStreak(sessionId, playerId, false);
    return 0;
  }

  // Correct answer - calculate base score
  let totalScore = scoringConfig.basePoints;

  // Add time bonus if enabled
  if (scoringConfig.timeBonusEnabled) {
    const submissionTime = await getAnswerTimestamp(
      sessionId,
      questionIndex,
      playerId
    );

    if (submissionTime) {
      const timeBonus = calculateTimeBonus(
        submissionTime,
        questionStartTime,
        questionDuration,
        scoringConfig.maxTimeBonus
      );
      totalScore += timeBonus;
    }
  }

  // Update streak and add streak bonus if enabled
  if (scoringConfig.streakBonusEnabled) {
    const newStreak = await updatePlayerStreak(sessionId, playerId, true);
    const streakBonus = calculateStreakBonus(
      newStreak,
      scoringConfig.streakThresholds,
      scoringConfig.streakBonusValues
    );
    totalScore += streakBonus;
  } else {
    // Still update streak even if bonus is disabled (for tracking)
    await updatePlayerStreak(sessionId, playerId, true);
  }

  return totalScore;
}

/**
 * Calculate and store scores for all players after a question ends
 */
export async function calculateQuestionScores(
  sessionId: string,
  questionIndex: number,
  correctAnswer: "A" | "B" | "C" | "D",
  questionStartTime: number,
  questionDuration: number,
  scoringConfig: ScoringConfig
): Promise<Map<string, number>> {
  const redis = await getRedis();
  const scores = new Map<string, number>();

  // Get all players
  const allPlayers = await redis.hGetAll(playersKey(sessionId));
  const playerIds = Object.keys(allPlayers);

  // Get all answers
  const allAnswers = await redis.hGetAll(answersKey(sessionId, questionIndex));

  // Calculate score for each player
  for (const playerId of playerIds) {
    const playerAnswer = allAnswers[playerId] || "NO_ANSWER";
    const score = await calculatePlayerScore(
      sessionId,
      questionIndex,
      playerId,
      playerAnswer,
      correctAnswer,
      questionStartTime,
      questionDuration,
      scoringConfig
    );

    scores.set(playerId, score);

    // Store individual question score
    await redis.hSet(
      questionScoresKey(sessionId, questionIndex),
      playerId,
      score.toString()
    );

    // Update leaderboard (total score)
    await redis.zIncrBy(leaderboardKey(sessionId), score, playerId);
  }

  return scores;
}

import { getDefaultScoringConfig as getDefaultScoringConfigUtil } from "../utils";

/**
 * Get default scoring configuration
 * Re-exported from utils for server-side use
 */
export function getDefaultScoringConfig(): ScoringConfig {
  return getDefaultScoringConfigUtil();
}
