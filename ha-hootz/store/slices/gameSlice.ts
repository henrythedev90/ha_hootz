import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type GameStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "QUESTION_ACTIVE"
  | "QUESTION_ENDED";

export interface Question {
  text: string;
  A: string;
  B: string;
  C: string;
  D: string;
  correct: "A" | "B" | "C" | "D";
  index?: number;
}

export interface GameState {
  status: GameStatus;
  sessionId?: string;
  questionIndex?: number;
  questionCount?: number;
  question?: Question;
  endAt?: number;
  answerRevealed?: boolean;
  correctAnswer?: "A" | "B" | "C" | "D";
  isReviewMode?: boolean;
  scoringConfig?: {
    basePoints?: number;
    questionDuration?: number; // Duration in seconds: 10, 20, or 30
    timeBonusEnabled?: boolean;
    timeBonusThreshold?: number;
    timeBonusPoints?: number;
    streakBonusEnabled?: boolean;
    streakBonusThreshold?: number;
    streakBonusPoints?: number;
  };
  randomizeAnswers?: boolean; // Whether to randomize answer order for each player
}

interface GameSliceState {
  gameState: GameState | null;
  sessionCode: string | null;
}

const initialState: GameSliceState = {
  gameState: null,
  sessionCode: null,
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setSessionCode: (state, action: PayloadAction<string>) => {
      state.sessionCode = action.payload;
    },
    setGameState: (state, action: PayloadAction<GameState | null>) => {
      state.gameState = action.payload;
    },
    updateGameState: (state, action: PayloadAction<Partial<GameState>>) => {
      if (state.gameState) {
        state.gameState = { ...state.gameState, ...action.payload };
      }
    },
    setQuestion: (state, action: PayloadAction<Question>) => {
      if (state.gameState) {
        state.gameState.question = action.payload;
      }
    },
    setQuestionIndex: (state, action: PayloadAction<number>) => {
      if (state.gameState) {
        state.gameState.questionIndex = action.payload;
      }
    },
    setAnswerRevealed: (state, action: PayloadAction<boolean>) => {
      if (state.gameState) {
        state.gameState.answerRevealed = action.payload;
      }
    },
    setCorrectAnswer: (
      state,
      action: PayloadAction<"A" | "B" | "C" | "D" | undefined>
    ) => {
      if (state.gameState) {
        state.gameState.correctAnswer = action.payload;
      }
    },
    setReviewMode: (state, action: PayloadAction<boolean>) => {
      if (state.gameState) {
        state.gameState.isReviewMode = action.payload;
      }
    },
    resetGameState: (state) => {
      state.gameState = null;
    },
  },
});

export const {
  setSessionCode,
  setGameState,
  updateGameState,
  setQuestion,
  setQuestionIndex,
  setAnswerRevealed,
  setCorrectAnswer,
  setReviewMode,
  resetGameState,
} = gameSlice.actions;

export default gameSlice.reducer;

