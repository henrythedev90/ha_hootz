"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "./index";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | undefined>(undefined);
  if (storeRef.current == null) {
    storeRef.current = makeStore();
  }
  const store = storeRef.current;
  return <Provider store={store}>{children}</Provider>;
}
