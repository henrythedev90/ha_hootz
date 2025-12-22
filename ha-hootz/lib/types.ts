export type SessionType = "waiting" | "live" | "ended";

export interface TriviaSession {
  status: SessionType;
  hostId: string;
  currentQuestion: number;
  questionCount: number;
  createdAt: number;
}

export interface TriviaQuestion {
  text: string;
  A: string;
  B: string;
  C: string;
  D: string;
  correct: "A" | "B" | "C" | "D";
  startTime: number;
  duration: number;
}
