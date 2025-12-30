import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiSliceState {
  // Host UI state
  showPlayersModal: boolean;
  showAnswerRevealModal: boolean;
  showEndGameModal: boolean;

  // Player UI state
  showWelcomeModal: boolean;
  showWinnerDisplay: boolean;
  showThankYouModal: boolean;
  isExitModalOpen: boolean;
  sessionEnded: boolean;
  error: string;

  // Loading states
  isLoading: boolean;
}

const initialState: UiSliceState = {
  showPlayersModal: false,
  showAnswerRevealModal: false,
  showEndGameModal: false,
  showWelcomeModal: false,
  showWinnerDisplay: false,
  showThankYouModal: false,
  isExitModalOpen: false,
  sessionEnded: false,
  error: "",
  isLoading: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Host modals
    setShowPlayersModal: (state, action: PayloadAction<boolean>) => {
      state.showPlayersModal = action.payload;
    },
    setShowAnswerRevealModal: (state, action: PayloadAction<boolean>) => {
      state.showAnswerRevealModal = action.payload;
    },
    setShowEndGameModal: (state, action: PayloadAction<boolean>) => {
      state.showEndGameModal = action.payload;
    },

    // Player modals
    setShowWelcomeModal: (state, action: PayloadAction<boolean>) => {
      state.showWelcomeModal = action.payload;
    },
    setShowWinnerDisplay: (state, action: PayloadAction<boolean>) => {
      state.showWinnerDisplay = action.payload;
    },
    setShowThankYouModal: (state, action: PayloadAction<boolean>) => {
      state.showThankYouModal = action.payload;
    },
    setIsExitModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isExitModalOpen = action.payload;
    },
    setSessionEnded: (state, action: PayloadAction<boolean>) => {
      state.sessionEnded = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = "";
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    resetUiState: (state) => {
      return initialState;
    },
  },
});

export const {
  setShowPlayersModal,
  setShowAnswerRevealModal,
  setShowEndGameModal,
  setShowWelcomeModal,
  setShowWinnerDisplay,
  setShowThankYouModal,
  setIsExitModalOpen,
  setSessionEnded,
  setError,
  clearError,
  setIsLoading,
  resetUiState,
} = uiSlice.actions;

export default uiSlice.reducer;
