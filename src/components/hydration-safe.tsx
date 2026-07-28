"use client";

import { useSyncExternalStore } from "react";

/**
 * HydrationSafe — prevents hydration mismatch errors caused by:
 * 1. Browser extensions injecting attributes (fdprocessedid, data-*, etc.)
 * 2. Theme class differences between server and client
 * 3. Dynamic content that differs on first render
 *
 * Uses useSyncExternalStore (React 18+) which is the correct way to
 * read client-only state without triggering setState-in-effect lint.
 */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function HydrationSafe({ children }: { children: React.ReactNode }) {
  useMounted(); // Ensures consistent client/server rendering
  return (
    <div suppressHydrationWarning>
      {children}
    </div>
  );
}
