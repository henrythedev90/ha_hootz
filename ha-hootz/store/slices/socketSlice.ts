import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Socket } from "socket.io-client";

interface SocketSliceState {
  socket: Socket | null;
  connected: boolean;
  sessionCode: string | null;
}

const initialState: SocketSliceState = {
  socket: null,
  connected: false,
  sessionCode: null,
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    setSocket: (state, action: PayloadAction<Socket | null>) => {
      // Socket has readonly internals; we only store the reference, so assert for Immer draft compatibility
      state.socket = action.payload as typeof state.socket;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    setSessionCode: (state, action: PayloadAction<string | null>) => {
      state.sessionCode = action.payload;
    },
    resetSocketState: (state) => {
      state.socket = null;
      state.connected = false;
      state.sessionCode = null;
    },
  },
});

export const {
  setSocket,
  setConnected,
  setSessionCode: setSocketSessionCode,
  resetSocketState,
} = socketSlice.actions;

export default socketSlice.reducer;
