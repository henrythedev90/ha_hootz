"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import StoreProvider from "@/store/StoreProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes instead of default (0 = disabled in dev, but we set it explicitly)
      refetchOnWindowFocus={true} // Only refetch when window regains focus
    >
      <StoreProvider>{children}</StoreProvider>
    </SessionProvider>
  );
}
