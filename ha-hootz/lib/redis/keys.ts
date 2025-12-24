// Redis key generators for game sessions
export const gameStateKey = (gameId: string) => `trivia:game:${gameId}:state`;
export const playersKey = (sessionId: string) => `trivia:players:${sessionId}`;
export const sessionKey = (sessionId: string) => `trivia:session:${sessionId}`;
export const questionKey = (sessionId: string, index: number) =>
  `trivia:${sessionId}:question${index}`;
export const answersKey = (sessionId: string, questionIndex: number) =>
  `trivia:${sessionId}:answers:${questionIndex}`;
export const resultsKey = (sessionId: string, index: number) =>
  `trivia:${sessionId}:results:${index}`;
export const leaderboardKey = (sessionId: string) =>
  `trivia:${sessionId}:leaderboard`;
export const presenceKey = (sessionId: string, playerId: string) =>
  `trivia:${sessionId}:presence:${playerId}`;
