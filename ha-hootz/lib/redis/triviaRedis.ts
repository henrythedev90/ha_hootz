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
} from "./keys";

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
