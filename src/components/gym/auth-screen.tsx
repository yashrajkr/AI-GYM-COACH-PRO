"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Activity, Mail, Lock, User, ArrowLeft, Loader2, CheckCircle2, Zap } from "lucide-react";
import { TiltCard, GlowButton } from "@/components/ui-pro";
import { isAnyGoogleOAuthAvailable, isSupabaseGoogleOAuthConfigured } from "@/lib/config/features";
import { signInWithGoogleSupabase } from "@/lib/supabase/client";

interface AuthScreenProps {
  mode: "login" | "signup";
  onBack: () => void;
  onSuccess: () => void;
}

/**
 * Did a `signIn(..., { redirect: false })` call actually sign the user in?
 *
 * `result.ok` alone is not enough: it mirrors the HTTP status of the internal
 * callback POST, and NextAuth answers a rejected password with 200 + an error
 * in the returned URL. So a wrong password yields `{ ok: true,
 * error: "CredentialsSignin" }`. Both fields have to be checked — `error` for
 * refused credentials, `ok` for transport failures such as the proxy's 429.
 */
function isSignInSuccess(
  result: { error?: string | null; ok?: boolean } | undefined
): boolean {
  return !!result?.ok && !result.error;
}

/**
 * Resolve as soon as the session cookie is actually readable.
 *
 * This replaces a flat `await sleep(300)` that ran on every sign-in whether or
 * not it was needed, so the demo button always felt sluggish. In practice the
 * first poll usually succeeds, which removes the delay entirely; the loop only
 * costs time when the cookie genuinely has not propagated yet.
 */
/**
 * Human-readable text for the `error` code NextAuth appends to the sign-in
 * page after a failed OAuth round-trip.
 *
 * `pages.signIn` is "/#/login", so NextAuth redirects to
 * `/#/login?error=<code>` — the query lands INSIDE the hash fragment, where
 * neither `useSearchParams` nor the hash router surfaces it. The result was a
 * silent bounce back to an empty login form with no clue what went wrong.
 */
const OAUTH_ERRORS: Record<string, string> = {
  OAuthSignin: "Could not reach Google. Check your connection and try again.",
  OAuthCallback:
    "Google rejected the sign-in. If this keeps happening, the app's redirect URL may not be registered in Google Cloud Console.",
  OAuthAccountNotLinked:
    "That email is already registered with a password. Sign in with your password instead.",
  OAuthCreateAccount: "Could not create an account from your Google profile.",
  Callback: "Sign-in failed on the way back from Google. Please try again.",
  AccessDenied: "Access denied — you cancelled the Google sign-in, or the account isn't permitted.",
  Configuration: "Google sign-in is misconfigured on the server.",
  Verification: "That sign-in link has expired. Request a new one.",
};

/**
 * Pull `error` out of either the real query string or the hash query, since
 * this app routes on the fragment.
 *
 * Captured ONCE per page load: the mount effect scrubs `error` from the URL so
 * a refresh doesn't resurrect a stale failure, and the snapshot below must stay
 * referentially stable for `useSyncExternalStore`. A full navigation (including
 * `signOut`) reloads this module and resets it.
 */
let capturedOAuthError: string | null | undefined;

function readOAuthError(): string | null {
  if (capturedOAuthError !== undefined) return capturedOAuthError;
  const fromSearch = new URLSearchParams(window.location.search).get("error");
  const hashQuery = window.location.hash.split("?")[1] ?? "";
  const fromHash = new URLSearchParams(hashQuery).get("error");
  capturedOAuthError = fromSearch || fromHash;
  return capturedOAuthError;
}

// The URL is external, browser-only state, so it is read through
// `useSyncExternalStore` rather than assigned into state from an effect —
// the server snapshot is `null`, which keeps SSR and hydration in agreement.
// It never changes after capture, so `subscribe` has nothing to listen to.
const subscribeToNothing = () => () => {};
const noOAuthErrorOnServer = () => null;

/** Strip `error` from the URL so it doesn't survive a manual retry. */
function clearOAuthError(): void {
  const [hashPath, hashQuery] = window.location.hash.split("?");
  const params = new URLSearchParams(hashQuery ?? "");
  params.delete("error");
  const rest = params.toString();
  const search = new URLSearchParams(window.location.search);
  search.delete("error");
  const searchStr = search.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${searchStr ? `?${searchStr}` : ""}${hashPath}${rest ? `?${rest}` : ""}`
  );
}

async function waitForSession(timeoutMs = 3000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data?.user) return true;
    } catch {
      // Network hiccup — fall through and retry until the deadline.
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  return false;
}

export function AuthScreen({ mode, onBack, onSuccess }: AuthScreenProps) {
  const { data: session, update: updateSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface an OAuth failure handed back by NextAuth.
  const oauthErrorCode = useSyncExternalStore(
    subscribeToNothing,
    readOAuthError,
    noOAuthErrorOnServer
  );
  const oauthError = oauthErrorCode
    ? OAUTH_ERRORS[oauthErrorCode] ?? `Sign-in failed (${oauthErrorCode}).`
    : null;

  // Scrub `error` from the address bar so refreshing doesn't look like a
  // second failure. Purely a URL side effect — no setState, no re-render.
  useEffect(() => {
    if (oauthErrorCode) clearOAuthError();
  }, [oauthErrorCode]);

  // A fresh attempt's own error wins over the one we arrived with.
  const displayedError = error ?? oauthError;

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      // If Supabase Google OAuth is configured, use that path.
      // Otherwise fall back to NextAuth's Google provider.
      if (isSupabaseGoogleOAuthConfigured()) {
        const success = await signInWithGoogleSupabase("/#/dashboard");
        if (!success) {
          // Supabase failed — fall back to NextAuth Google if available
          await signIn("google", { callbackUrl: "/#/dashboard" });
        }
        // Browser will redirect — no need to call onSuccess here
      } else {
        // NextAuth Google provider.
        //
        // Must redirect. An OAuth sign-in has to send the browser to Google's
        // consent screen; with `redirect: false` NextAuth just returns that
        // URL and stays put, so the button appeared to do nothing and then
        // dropped the user back at login with no session.
        await signIn("google", { callbackUrl: "/#/dashboard" });
        // Unreachable in practice — the line above navigates away.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      // Use a stable demo account so repeated clicks don't pollute the DB
      // with hundreds of `demo${Date.now()}@...` rows. The password meets
      // the 8-char minimum enforced by /api/auth/signup.
      const demoEmail = "demo@try-aigymcoach.com";
      const demoPassword = "demo123456";

      // Sign in FIRST. The demo account is shared and long-lived, so on every
      // run but the very first it already exists. Calling /api/auth/signup up
      // front instead would spend one of the 5-per-minute-per-IP signup
      // attempts (see proxy.ts) on a request we know will 409, and the 6th
      // demo click in a minute would fail with a 429.
      let result = await signIn("credentials", {
        email: demoEmail,
        password: demoPassword,
        redirect: false,
      });

      // Only reached on a fresh database: create the account, then retry.
      if (!isSignInSuccess(result)) {
        const signupRes = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: demoEmail, password: demoPassword, name: "Demo User" }),
        });

        // 409 means someone else just created it — still fine to sign in.
        if (!signupRes.ok && signupRes.status !== 409) {
          const data = await signupRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create demo account");
        }

        result = await signIn("credentials", {
          email: demoEmail,
          password: demoPassword,
          redirect: false,
        });
      }

      if (!isSignInSuccess(result)) {
        throw new Error("Demo sign-in failed");
      }

      // Wait for the cookie to be readable, then force NextAuth to refresh.
      // Without the refresh, useSession still returns null when the dashboard
      // mounts and the auth gate bounces straight back to login — which looks
      // exactly like "the demo button doesn't work".
      await waitForSession();
      await updateSession();

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo failed");
    } finally {
      setDemoLoading(false);
    }
  };

  // If already logged in, show logged-in state
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <TiltCard maxTilt={5} glow="lime" className="p-8 max-w-md w-full text-center">
          <CheckCircle2 className="h-12 w-12 text-lime mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">You're signed in!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Welcome back{session.user?.name ? `, ${session.user.name}` : ""}.
          </p>
          <GlowButton onClick={onSuccess} className="w-full">
            Go to Dashboard
          </GlowButton>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </TiltCard>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        // Create account via signup API
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create account");
        }

        // Auto sign in after signup
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (!isSignInSuccess(result)) {
          throw new Error("Account created but sign-in failed. Try logging in.");
        }

        // Force session refresh before navigating (same fix as demo login).
        await waitForSession();
        await updateSession();
        onSuccess();
      } else {
        // Login
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (!isSignInSuccess(result)) {
          throw new Error("Invalid email or password");
        }

        // Force session refresh before navigating.
        await waitForSession();
        await updateSession();
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern grid-pattern-fade pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] blob-lime opacity-40 pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] blob-cyan opacity-30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <TiltCard maxTilt={4} glow="lime" className="p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6 justify-center">
            <div className="w-10 h-10 rounded-lg bg-lime/20 border border-lime/40 flex items-center justify-center glow-lime">
              <Activity className="h-5 w-5 text-lime" />
            </div>
            <span className="font-bold tracking-tight">
              GYM COACH <span className="text-lime">PRO</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-center mb-1">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {mode === "signup"
              ? "Start training smarter in under 30 seconds."
              : "Sign in to continue your training."}
          </p>

          {/* Google OAuth button — only shown when Google OAuth is configured
              (via NextAuth OR Supabase). Falls back to demo/credentials otherwise. */}
          {isAnyGoogleOAuthAvailable() && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg py-2.5 px-4 text-sm font-medium transition-all disabled:opacity-50 mb-3"
                aria-label="Continue with Google"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Name (optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah K."
                    className="pl-10 glass border-border bg-background/50"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 glass border-border bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 glass border-border bg-background/50"
                />
              </div>
            </div>

            <AnimatePresence>
              {displayedError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2"
                >
                  {displayedError}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-lime text-background hover:bg-lime/90 glow-lime"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {mode === "signup" ? "Creating..." : "Signing in..."}</>
              ) : (
                mode === "signup" ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>

          {/* Demo Login */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <button
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="w-full glass glass-hover rounded-lg py-2.5 px-4 text-sm font-medium text-cyan hover:text-cyan flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {demoLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating demo…</>
              ) : (
                <><Zap className="h-4 w-4" /> Try Demo — No Signup Needed</>
              )}
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Instant access · No email required · Data saved locally
            </p>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => onBack()}
                  className="text-lime hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => onBack()}
                  className="text-lime hover:underline"
                >
                  Sign up free
                </button>
              </>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground">
              🔒 Your password is bcrypt-hashed. We never see it.
            </p>
          </div>
        </TiltCard>
      </div>
    </div>
  );
}
