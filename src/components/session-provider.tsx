"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * SessionProvider — wraps NextAuth's SessionProvider.
 * The refetchInterval keeps the session fresh.
 * NextAuth handles fetch errors internally — it just returns null session
 * if the fetch fails (e.g. server still compiling in dev).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchInterval={5 * 60} // Refetch every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
