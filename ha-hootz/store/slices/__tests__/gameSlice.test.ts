/**
 * Example tests for gameSlice reducer
 *
 * These tests demonstrate how to test Redux Toolkit reducers.
 * Reducers are pure functions, making them easy to test.
 */

import { gameSlice } from "../gameSlice";
import type { GameState } from "../gameSlice";

describe("gameSlice", () => {
  const initialState = {
    gameState: null,
    sessionCode: null,
  };

  describe("setSessionCode", () => {
    it("should set the session code", () => {
      const action = gameSlice.actions.setSessionCode("123456");
      const newState = gameSlice.reducer(initialState, action);

      expect(newState.sessionCode).toBe("123456");
    });

    it("should overwrite existing session code", () => {
      const stateWithCode = {
        ...initialState,
        sessionCode: "111111",
      };
      const action = gameSlice.actions.setSessionCode("222222");
      const newState = gameSlice.reducer(stateWithCode, action);

      expect(newState.sessionCode).toBe("222222");
    });
  });

  describe("setGameState", () => {
    it("should set the game state", () => {
      const gameState: GameState = {
        status: "WAITING",
        sessionId: "session-123",
      };

      const action = gameSlice.actions.setGameState(gameState);
      const newState = gameSlice.reducer(initialState, action);

      expect(newState.gameState).toEqual(gameState);
    });

    it("should set game state to null", () => {
      const stateWithGame = {
        gameState: {
          status: "IN_PROGRESS" as const,
        },
        sessionCode: "123456",
      };

      const action = gameSlice.actions.setGameState(null);
      const newState = gameSlice.reducer(stateWithGame, action);

      expect(newState.gameState).toBeNull();
    });
  });

  describe("updateGameState", () => {
    it("should update existing game state with partial data", () => {
      const existingState: GameState = {
        status: "WAITING",
        questionIndex: 0,
      };

      const stateWithGame = {
        gameState: existingState,
        sessionCode: "123456",
      };

      const action = gameSlice.actions.updateGameState({
        status: "IN_PROGRESS",
        questionIndex: 1,
      });

      const newState = gameSlice.reducer(stateWithGame, action);

      expect(newState.gameState?.status).toBe("IN_PROGRESS");
      expect(newState.gameState?.questionIndex).toBe(1);
    });

    it("should not update if game state is null", () => {
      const action = gameSlice.actions.updateGameState({
        status: "IN_PROGRESS",
      });

      const newState = gameSlice.reducer(initialState, action);

      expect(newState.gameState).toBeNull();
    });
  });

  describe("setQuestion", () => {
    it("should set question in game state", () => {
      const gameState: GameState = {
        status: "QUESTION_ACTIVE",
      };

      const stateWithGame = {
        gameState,
        sessionCode: "123456",
      };

      const question = {
        text: "What is 2+2?",
        A: "3",
        B: "4",
        C: "5",
        D: "6",
        correct: "B" as const,
        index: 0,
      };

      const action = gameSlice.actions.setQuestion(question);
      const newState = gameSlice.reducer(stateWithGame, action);

      expect(newState.gameState?.question).toEqual(question);
    });

    it("should not set question if game state is null", () => {
      const question = {
        text: "Test?",
        A: "1",
        B: "2",
        C: "3",
        D: "4",
        correct: "A" as const,
      };

      const action = gameSlice.actions.setQuestion(question);
      const newState = gameSlice.reducer(initialState, action);

      expect(newState.gameState).toBeNull();
    });
  });

  describe("setAnswerRevealed", () => {
    it("should set answerRevealed to true", () => {
      const gameState: GameState = {
        status: "QUESTION_ENDED",
        answerRevealed: false,
      };

      const stateWithGame = {
        gameState,
        sessionCode: "123456",
      };

      const action = gameSlice.actions.setAnswerRevealed(true);
      const newState = gameSlice.reducer(stateWithGame, action);

      expect(newState.gameState?.answerRevealed).toBe(true);
    });

    it("should set answerRevealed to false", () => {
      const gameState: GameState = {
        status: "QUESTION_ACTIVE",
        answerRevealed: true,
      };

      const stateWithGame = {
        gameState,
        sessionCode: "123456",
      };

      const action = gameSlice.actions.setAnswerRevealed(false);
      const newState = gameSlice.reducer(stateWithGame, action);

      expect(newState.gameState?.answerRevealed).toBe(false);
    });
  });

  describe("resetGameState", () => {
    it("should reset game state to null", () => {
      const gameState: GameState = {
        status: "IN_PROGRESS",
        questionIndex: 5,
      };

      const stateWithGame = {
        gameState,
        sessionCode: "123456",
      };

      const action = gameSlice.actions.resetGameState();
      const newState = gameSlice.reducer(stateWithGame, action);

      expect(newState.gameState).toBeNull();
      expect(newState.sessionCode).toBe("123456"); // Session code should remain
    });
  });
});

