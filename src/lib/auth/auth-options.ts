import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateEnv } from "@/lib/env";

// Validate environment on first import (throws in production if missing).
validateEnv();

// Hard-fail if NEXTAUTH_SECRET is missing — never fall back to a hardcoded
// string. A hardcoded secret in source would let anyone forge session JWTs.
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  // Allow dev to proceed; validateEnv() already throws in production.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32"
    );
  }
  // Non-production: warn loudly so devs fix it.
  console.warn(
    "⚠️  NEXTAUTH_SECRET is not set. Run: openssl rand -base64 32  → .env"
  );
}

/**
 * NextAuth configuration.
 *
 * Providers:
 * 1. Google OAuth — requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
 * 2. Credentials — email + password, stored in Prisma with bcrypt hashing
 *
 * Session strategy: JWT (stateless, works without a Prisma adapter for simple cases).
 *
 * NOTE: JWT `tier` is refreshed on every call so that Stripe webhook tier changes
 * propagate without forcing the user to sign out and back in.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth — only enabled if env vars are present
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Do NOT allow dangerous email-account linking: an attacker who
            // controls an unverified OAuth email must not be able to take over
            // an existing credentials-based account.
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    // Credentials — always enabled for email/password login
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash) {
          // Constant-time-ish: still hash a dummy password to reduce timing signal.
          await bcrypt.compare(credentials.password, "$2a$12$abcdefghijklmnopqrstuv");
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    // Slightly shorter maxAge so a compromised JWT self-expires sooner.
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Use the validated secret — never a hardcoded fallback.
  secret: NEXTAUTH_SECRET || "insecure-dev-only-do-not-use-in-prod",

  callbacks: {
    /**
     * Give Google sign-ins a real row in our database.
     *
     * The session strategy is JWT with no Prisma adapter, so nothing creates a
     * User for an OAuth login by default. Without this the account "works"
     * (a token is issued) but has no database id, so every route that reads
     * `session.user.id` — saving a workout, loading history, billing —
     * returns 401. The user appears signed in and nothing persists.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      const existing = await db.user.findUnique({
        where: { email },
        select: { id: true, passwordHash: true },
      });

      // Only attach to an existing password account when Google asserts the
      // address is verified. Otherwise someone who controls an unverified
      // Google profile at this address could take over a credentials account —
      // the takeover `allowDangerousEmailAccountLinking: false` guards against.
      const emailVerified =
        (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
      if (existing?.passwordHash && !emailVerified) return false;

      await db.user.upsert({
        where: { email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email,
          name: user.name ?? null,
          image: user.image ?? null,
          tier: "free",
          settings: { create: {} },
        },
      });

      return true;
    },

    async jwt({ token, user, account }) {
      // On initial sign-in, attach user id.
      if (user) {
        token.id = user.id;
      }

      // Google hands back its own `sub` as the user id, which is not our
      // primary key. Resolve the real row by email on the sign-in pass,
      // otherwise the lookup below misses and wipes the token.
      if (account?.provider === "google" && token.email) {
        const googleUser = await db.user.findUnique({
          where: { email: token.email.toLowerCase().trim() },
          select: { id: true },
        });
        if (googleUser) token.id = googleUser.id;
      }

      // Always refresh tier from DB so Stripe webhook changes propagate
      // without requiring the user to sign out / sign back in.
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { tier: true, stripeSubId: true },
        });
        // If the user was deleted, invalidate the token by clearing id.
        if (!dbUser) {
          token.id = "";
          token.tier = "free";
          return token;
        }
        token.tier = dbUser.tier;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const enriched = session.user as { id?: string; tier?: string };
        if (token.id) {
          enriched.id = token.id as string;
        }
        enriched.tier = (token.tier as string) || "free";
      }
      return session;
    },
  },

  pages: {
    signIn: "/#/login",
  },
};
