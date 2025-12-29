import { configureStore } from "@reduxjs/toolkit";
import gameReducer from "./slices/gameSlice";
import hostReducer from "./slices/hostSlice";
import playerReducer from "./slices/playerSlice";
import uiReducer from "./slices/uiSlice";
import socketReducer from "./slices/socketSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      game: gameReducer,
      host: hostReducer,
      player: playerReducer,
      ui: uiReducer,
      socket: socketReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types
          ignoredActions: [
            "socket/setSocket",
            "game/updateGameState",
            "host/updateStats",
          ],
          // Ignore these field paths in all actions
          ignoredActionPaths: ["payload.socket", "payload.timestamp"],
          // Ignore these paths in the state
          ignoredPaths: ["socket.socket"],
        },
      }),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

