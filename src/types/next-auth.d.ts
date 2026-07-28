import type { DefaultSession } from "next-auth";

/**
 * NextAuth type augmentation.
 * Adds `id` and `tier` to the session user object.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    tier?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tier: string;
  }
}
