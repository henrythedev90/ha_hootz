"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import StoreProvider from "@/store/StoreProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <StoreProvider>{children}</StoreProvider>
    </SessionProvider>
  );
}
