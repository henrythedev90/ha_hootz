import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PlayerSliceState {
  playerId: string | null;
  playerName: string | null;
  hostName: string | null;
  playerCount: number;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  timeRemaining: number;
  isTimerExpired: boolean;
  previousAnswer: "A" | "B" | "C" | "D" | null;
  leaderboard: Array<{ playerId: string; name: string; score: number }>;
}

const initialState: PlayerSliceState = {
  playerId: null,
  playerName: null,
  hostName: null,
  playerCount: 0,
  selectedAnswer: null,
  timeRemaining: 0,
  isTimerExpired: false,
  previousAnswer: null,
  leaderboard: [],
};

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setPlayerId: (state, action: PayloadAction<string | null>) => {
      state.playerId = action.payload;
    },
    setPlayerName: (state, action: PayloadAction<string | null>) => {
      state.playerName = action.payload;
    },
    setHostName: (state, action: PayloadAction<string | null>) => {
      state.hostName = action.payload;
    },
    setPlayerCount: (state, action: PayloadAction<number>) => {
      state.playerCount = action.payload;
    },
    setSelectedAnswer: (
      state,
      action: PayloadAction<"A" | "B" | "C" | "D" | null>
    ) => {
      state.selectedAnswer = action.payload;
    },
    setTimeRemaining: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;
    },
    setIsTimerExpired: (state, action: PayloadAction<boolean>) => {
      state.isTimerExpired = action.payload;
    },
    setPreviousAnswer: (
      state,
      action: PayloadAction<"A" | "B" | "C" | "D" | null>
    ) => {
      state.previousAnswer = action.payload;
    },
    setLeaderboard: (
      state,
      action: PayloadAction<
        Array<{ playerId: string; name: string; score: number }>
      >
    ) => {
      state.leaderboard = action.payload;
    },
    resetPlayerState: (state) => {
      state.selectedAnswer = null;
      state.timeRemaining = 0;
      state.isTimerExpired = false;
      state.previousAnswer = null;
    },
    clearPlayerData: (state) => {
      state.playerId = null;
      state.playerName = null;
      state.hostName = null;
      state.playerCount = 0;
      state.selectedAnswer = null;
      state.timeRemaining = 0;
      state.isTimerExpired = false;
      state.previousAnswer = null;
      state.leaderboard = [];
    },
  },
});

export const {
  setPlayerId,
  setPlayerName,
  setHostName,
  setPlayerCount,
  setSelectedAnswer,
  setTimeRemaining,
  setIsTimerExpired,
  setPreviousAnswer,
  setLeaderboard,
  resetPlayerState,
  clearPlayerData,
} = playerSlice.actions;

export default playerSlice.reducer;

