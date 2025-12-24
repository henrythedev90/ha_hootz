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

  await redis.expire(questionKey(sessionId, index), question.duration + 10);
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
