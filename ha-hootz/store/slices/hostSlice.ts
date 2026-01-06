import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Question } from "./gameSlice";

export interface Player {
  playerId: string;
  name: string;
  avatarUrl?: string;
  streak?: number;
}

export interface Stats {
  playerCount: number;
  answerCount: number;
  answerDistribution: { A: number; B: number; C: number; D: number };
  playersWithAnswers?: string[];
  playerScores?: Record<string, number>;
}

interface HostSliceState {
  questions: Question[];
  players: Player[];
  stats: Stats;
  timeRemaining: number;
  sessionStatus: "waiting" | "live" | "ended" | null;
  leaderboard: Array<{ playerId: string; name: string; score: number }>;
}

const initialState: HostSliceState = {
  questions: [],
  players: [],
  stats: {
    playerCount: 0,
    answerCount: 0,
    answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
    playersWithAnswers: [],
    playerScores: {},
  },
  timeRemaining: 0,
  sessionStatus: null,
  leaderboard: [],
};

const hostSlice = createSlice({
  name: "host",
  initialState,
  reducers: {
    setQuestions: (state, action: PayloadAction<Question[]>) => {
      state.questions = action.payload;
    },
    addQuestion: (state, action: PayloadAction<Question>) => {
      state.questions.push(action.payload);
    },
    updateQuestion: (
      state,
      action: PayloadAction<{ index: number; question: Question }>
    ) => {
      const { index, question } = action.payload;
      if (state.questions[index]) {
        state.questions[index] = question;
      }
    },
    removeQuestion: (state, action: PayloadAction<number>) => {
      state.questions.splice(action.payload, 1);
    },
    setPlayers: (state, action: PayloadAction<Player[]>) => {
      state.players = action.payload;
      state.stats.playerCount = action.payload.length;
    },
    addPlayer: (state, action: PayloadAction<Player>) => {
      const existingIndex = state.players.findIndex(
        (p) => p.playerId === action.payload.playerId
      );
      if (existingIndex === -1) {
        state.players.push(action.payload);
        state.stats.playerCount = state.players.length;
      } else {
        // Update existing player with new data (e.g., streak, avatar)
        state.players[existingIndex] = action.payload;
      }
    },
    removePlayer: (state, action: PayloadAction<string>) => {
      state.players = state.players.filter(
        (p) => p.playerId !== action.payload
      );
      state.stats.playerCount = state.players.length;
    },
    setStats: (state, action: PayloadAction<Stats>) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    updateStats: (state, action: PayloadAction<Partial<Stats>>) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    setTimeRemaining: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;
    },
    setSessionStatus: (
      state,
      action: PayloadAction<"waiting" | "live" | "ended" | null>
    ) => {
      state.sessionStatus = action.payload;
    },
    setLeaderboard: (
      state,
      action: PayloadAction<
        Array<{ playerId: string; name: string; score: number }>
      >
    ) => {
      state.leaderboard = action.payload;
    },
    resetHostState: (state) => {
      state.players = [];
      state.stats = initialState.stats;
      state.timeRemaining = 0;
      state.leaderboard = [];
    },
  },
});

export const {
  setQuestions,
  addQuestion,
  updateQuestion,
  removeQuestion,
  setPlayers,
  addPlayer,
  removePlayer,
  setStats,
  updateStats,
  setTimeRemaining,
  setSessionStatus,
  setLeaderboard,
  resetHostState,
} = hostSlice.actions;

export default hostSlice.reducer;
