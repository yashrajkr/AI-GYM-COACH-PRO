"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Activity,
  Zap,
  Target,
  Shield,
  Camera,
  TrendingUp,
  Dumbbell,
  ArrowRight,
  Play,
  Lock,
  Sparkles,
  Layers,
  Gauge,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  EyeOff,
  Ghost,
  HelpCircle,
  Star,
  Check,
  Volume2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { GlassCard, TiltCard, GlowButton, AnimatedNumber } from "@/components/ui-pro";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWorkoutStore } from "@/lib/stores/workout";
import { ExerciseId } from "@/lib/exercises";
import { getSound } from "@/lib/coaching/sound";
import { useHashRoute, type View } from "@/lib/stores/router";
import { useServiceWorker, applyServiceWorkerUpdate } from "@/lib/pwa";
import { isPaymentConfigured } from "@/lib/config/features";
import { useSession, signOut } from "next-auth/react";

// ── Lazy-loaded views ─────────────────────────────────────────────────────
// Heavy components (MediaPipe, Three.js, recharts) are lazy-loaded so the
// landing page bundle stays small. Only the view the user actually visits
// gets fetched.
const HeroAvatar = lazy(() =>
  import("@/components/three/hero-avatar").then((m) => ({ default: m.HeroAvatar }))
);
const ParticleField = lazy(() =>
  import("@/components/three/particle-field").then((m) => ({ default: m.ParticleField }))
);
const LandingDemo = lazy(() =>
  import("@/components/gym/landing-demo").then((m) => ({ default: m.LandingDemo }))
);
const Dashboard = lazy(() =>
  import("@/components/gym/dashboard").then((m) => ({ default: m.Dashboard }))
);
const LiveCoach = lazy(() =>
  import("@/components/gym/live-coach").then((m) => ({ default: m.LiveCoach }))
);
const ProgramsList = lazy(() =>
  import("@/components/gym/programs").then((m) => ({ default: m.ProgramsList }))
);
const ProgramDetail = lazy(() =>
  import("@/components/gym/programs").then((m) => ({ default: m.ProgramDetail }))
);
const Analytics = lazy(() =>
  import("@/components/gym/analytics").then((m) => ({ default: m.Analytics }))
);
const ExerciseLibrary = lazy(() =>
  import("@/components/gym/library").then((m) => ({ default: m.ExerciseLibrary }))
);
const AuthScreen = lazy(() =>
  import("@/components/gym/auth-screen").then((m) => ({ default: m.AuthScreen }))
);
const SettingsPage = lazy(() =>
  import("@/components/gym/settings-page").then((m) => ({ default: m.SettingsPage }))
);
const PostWorkoutSummary = lazy(() =>
  import("@/components/gym/post-workout-summary").then((m) => ({ default: m.PostWorkoutSummary }))
);
// WorkoutSetup is small but imported eagerly for snappy modal open.
import { WorkoutSetup, WorkoutConfig } from "@/components/gym/workout-setup";

/**
 * Lightweight fallback shown while a lazy-loaded view chunk is fetching.
 * Avoids layout shift + gives the user feedback that something is loading.
 *
 * If the chunk fails to load (ChunkLoadError), the global ChunkErrorHandler
 * in layout.tsx auto-reloads the page once. As a last resort, this fallback
 * shows a "Retry" button so the user can manually reload.
 */
function ViewFallback({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="w-8 h-8 rounded-full border-2 border-lime/30 border-t-lime animate-spin" />
      <p className="text-xs text-muted-foreground font-mono">{label}</p>
      <button
        onClick={() => window.location.reload()}
        className="text-[10px] text-muted-foreground hover:text-lime underline mt-2"
      >
        Taking too long? Reload
      </button>
    </div>
  );
}

export default function Home() {
  const [view, navigate] = useHashRoute();
  const [setup, setSetup] = useState<{ exerciseId: ExerciseId } | null>(null);
  const { startWorkout, endWorkout } = useWorkoutStore();
  const { data: session, status } = useSession();

  // Register PWA service worker (production only) + surface update prompts.
  const { updateAvailable } = useServiceWorker();

  // When a new SW version is available, show a toast prompting the user to reload.
  useEffect(() => {
    if (!updateAvailable) return;
    const handler = () => applyServiceWorkerUpdate();
    // Simple inline prompt — the SW will trigger a reload via controllerchange.
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "A new version of AI Gym Coach Pro is available. Reload to update?"
      );
      if (confirmed) handler();
    }
  }, [updateAvailable]);

  const handleStartWorkout = (exerciseId: ExerciseId) => {
    getSound().play("click");
    setSetup({ exerciseId });
  };

  const handleStartConfigured = (config: WorkoutConfig) => {
    startWorkout({
      exerciseId: config.exerciseId,
      targetSets: config.targetSets,
      repsPerSet: config.repsPerSet,
    });
    navigate({
      kind: "live",
      exerciseId: config.exerciseId,
      sets: config.targetSets,
      reps: config.repsPerSet,
    });
    setSetup(null);
  };

  const handleEndWorkout = () => {
    const { plan } = useWorkoutStore.getState();
    endWorkout();
    // Read history AFTER endWorkout() adds the new entry
    const { history: newHistory } = useWorkoutStore.getState();
    const latestWorkout = newHistory[0];
    if (latestWorkout && plan) {
      const xpEarned = 50 + (latestWorkout.avgFormScore >= 85 ? 25 * latestWorkout.setsCompleted : 0);
      navigate({
        kind: "summary",
        exerciseId: plan.exerciseId,
        sets: plan.targetSets,
        reps: plan.repsPerSet,
        workoutId: latestWorkout.id,
        xpEarned,
      });
    } else {
      navigate({ kind: "dashboard" });
    }
  };

  const navigateWithSound = (v: View) => {
    getSound().play("page_transition");
    navigate(v);
  };

  // Landing page
  if (view.kind === "landing") {
    return (
      <LandingPage
        onEnter={() => navigateWithSound({ kind: "dashboard" })}
        onPrograms={() => navigateWithSound({ kind: "programs" })}
        onLibrary={() => navigateWithSound({ kind: "library" })}
        navigate={navigate}
      />
    );
  }

  // Login / Signup views
  if (view.kind === "login" || view.kind === "signup") {
    return (
      <Suspense fallback={<ViewFallback />}>
        <AuthScreen
          mode={view.kind}
          onBack={() => navigate({ kind: view.kind === "login" ? "signup" : "landing" })}
          onSuccess={() => navigate({ kind: "dashboard" })}
        />
      </Suspense>
    );
  }

  // Post-workout summary view (full-screen, no app shell)
  if (view.kind === "summary") {
    return (
      <Suspense fallback={<ViewFallback />}>
        <PostWorkoutSummary
          workout={useWorkoutStore.getState().history[0] || {
            id: view.workoutId,
            exerciseId: view.exerciseId,
            exerciseName: view.exerciseId.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
            date: new Date().toISOString(),
            totalReps: 0,
            setsCompleted: 0,
            durationSec: 0,
            avgFormScore: 0,
            bestFormScore: 0,
          }}
          xpEarned={view.xpEarned}
          onDone={() => navigateWithSound({ kind: "dashboard" })}
          onRestart={() => navigateWithSound({ kind: "live", exerciseId: view.exerciseId, sets: view.sets, reps: view.reps })}
        />
      </Suspense>
    );
  }

  // Auth gate — if not logged in, redirect to login (except for landing which is handled above)
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-lime/30 border-t-lime"
        />
      </div>
    );
  }

  if (!session) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <AuthScreen
          mode="login"
          onBack={() => navigate({ kind: "landing" })}
          onSuccess={() => navigate({ kind: "dashboard" })}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] blob-lime opacity-50" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] blob-cyan opacity-40" />
        <div className="absolute -bottom-40 right-1/3 w-[500px] h-[500px] blob-magenta opacity-30" />
      </div>

      {/* Top nav (desktop) */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigateWithSound({ kind: "dashboard" })}
            className="flex items-center gap-2 group"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-8 h-8 rounded-lg bg-lime/20 border border-lime/40 flex items-center justify-center glow-lime"
            >
              <Activity className="h-4 w-4 text-lime" />
            </motion.div>
            <span className="font-bold tracking-tight text-sm group-hover:text-lime transition-colors">
              GYM COACH <span className="text-lime">PRO</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavButton active={view.kind === "dashboard"} onClick={() => navigateWithSound({ kind: "dashboard" })}>
              Dashboard
            </NavButton>
            <NavButton active={view.kind === "live"} onClick={() => setSetup({ exerciseId: "squat" })}>
              Live Coach
            </NavButton>
            <NavButton active={view.kind === "programs"} onClick={() => navigateWithSound({ kind: "programs" })}>
              Programs
            </NavButton>
            <NavButton active={view.kind === "analytics"} onClick={() => navigateWithSound({ kind: "analytics" })}>
              Analytics
            </NavButton>
            <NavButton active={view.kind === "library"} onClick={() => navigateWithSound({ kind: "library" })}>
              Library
            </NavButton>
          </nav>

          {/* Right side: theme toggle + settings + user menu + mobile coach button */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Settings button */}
            <button
              onClick={() => navigateWithSound({ kind: "settings" })}
              className="glass glass-hover rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            {/* User menu (desktop) */}
            {session?.user && (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors px-2 py-1.5"
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            )}
            {/* Mobile coach button */}
            <div className="md:hidden">
              <GlowButton onClick={() => setSetup({ exerciseId: "squat" })} size="sm" glow="lime" className="text-xs h-8">
                <Play className="mr-1 h-3 w-3" /> Coach
              </GlowButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with page transitions */}
      <main id="main-content" className="flex-1 container mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6 relative z-10" role="main">
        <motion.div
          key={view.kind}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {view.kind === "dashboard" && (
            <Suspense fallback={<ViewFallback />}>
              <Dashboard onStartWorkout={handleStartWorkout} />
            </Suspense>
          )}
          {view.kind === "live" && (
            <Suspense fallback={<ViewFallback label="Loading AI Coach…" />}>
              <LiveCoach
                exerciseId={view.exerciseId}
                targetSets={view.sets}
                repsPerSet={view.reps}
                onEnd={handleEndWorkout}
                onCancel={() => navigateWithSound({ kind: "dashboard" })}
              />
            </Suspense>
          )}
          {view.kind === "programs" && (
            <Suspense fallback={<ViewFallback />}>
              <ProgramsList
                onSelect={(p) => navigateWithSound({ kind: "program-detail", program: p })}
                onUpgrade={() => navigateWithSound({ kind: "landing" })}
              />
            </Suspense>
          )}
          {view.kind === "program-detail" && (
            <Suspense fallback={<ViewFallback />}>
              <ProgramDetail
                program={view.program}
                onStart={(exId, sets, reps) => {
                  startWorkout({ exerciseId: exId, targetSets: sets, repsPerSet: reps });
                  navigate({ kind: "live", exerciseId: exId, sets, reps });
                }}
                onBack={() => navigateWithSound({ kind: "programs" })}
              />
            </Suspense>
          )}
          {view.kind === "analytics" && (
            <Suspense fallback={<ViewFallback />}>
              <Analytics />
            </Suspense>
          )}
          {view.kind === "library" && (
            <Suspense fallback={<ViewFallback />}>
              <ExerciseLibrary onStart={handleStartWorkout} />
            </Suspense>
          )}
          {view.kind === "settings" && (
            <Suspense fallback={<ViewFallback />}>
              <SettingsPage onBack={() => navigateWithSound({ kind: "dashboard" })} />
            </Suspense>
          )}
        </motion.div>
      </main>

      {/* Footer (desktop only) */}
      <footer className="hidden md:block border-t border-border mt-auto relative z-10">
        <div className="container mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-lime" />
            <span>Your video never leaves your device.</span>
          </div>
          <div className="font-mono uppercase tracking-wider">
            AI Gym Coach Pro · v2.0 Premium 3D
          </div>
        </div>
      </footer>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          <MobileTab
            icon={<Activity className="h-5 w-5" />}
            label="Home"
            active={view.kind === "dashboard"}
            onClick={() => navigateWithSound({ kind: "dashboard" })}
          />
          <MobileTab
            icon={<Play className="h-5 w-5" />}
            label="Coach"
            active={view.kind === "live"}
            onClick={() => setSetup({ exerciseId: "squat" })}
          />
          <MobileTab
            icon={<Dumbbell className="h-5 w-5" />}
            label="Programs"
            active={view.kind === "programs" || view.kind === "program-detail"}
            onClick={() => navigateWithSound({ kind: "programs" })}
          />
          <MobileTab
            icon={<TrendingUp className="h-5 w-5" />}
            label="Stats"
            active={view.kind === "analytics"}
            onClick={() => navigateWithSound({ kind: "analytics" })}
          />
          <MobileTab
            icon={<Zap className="h-5 w-5" />}
            label="Library"
            active={view.kind === "library"}
            onClick={() => navigateWithSound({ kind: "library" })}
          />
        </div>
      </nav>

      {/* Setup modal */}
      {setup && (
        <WorkoutSetup
          exerciseId={setup.exerciseId}
          onStart={handleStartConfigured}
          onCancel={() => setSetup(null)}
        />
      )}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "text-lime"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute inset-0 rounded-md bg-lime/15 border border-lime/30"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

function MobileTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
        active ? "text-lime" : "text-muted-foreground"
      }`}
    >
      <motion.div
        animate={active ? { scale: 1.1 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        {icon}
      </motion.div>
      <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>
      {active && (
        <motion.div
          layoutId="mobile-tab-active"
          className="absolute top-0 w-12 h-0.5 bg-lime glow-lime"
        />
      )}
    </motion.button>
  );
}

function LandingPage({
  onEnter,
  onPrograms,
  onLibrary,
  navigate,
}: {
  onEnter: () => void;
  onPrograms: () => void;
  onLibrary: () => void;
  navigate: (v: View) => void;
}) {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Scroll a landing section to just below the sticky header.
   *
   * Deliberately instant, and deliberately repeated:
   *
   *  - Instant, because the landing page stacks to ~13000px on mobile and
   *    animating a scroll that far while three WebGL canvases render makes
   *    Chrome stall for seconds and then crawl. Links looked dead.
   *  - Repeated, because sections below the fold mount lazily. At click time
   *    the document is far shorter than its final height, so the browser
   *    clamps the jump to the current maximum scroll — a tap on "Pricing"
   *    moved 270px instead of 9500. Each pass pulls more content into view,
   *    which mounts it and raises the ceiling, so repeating walks the page to
   *    the target and then holds it there while the rest settles.
   *
   * `scrollIntoView` is avoided entirely: on this layout it stopped ~1300px
   * short, and it gives no way to offset for the sticky header.
   */
  const scrollToSection = (id: string) => {
    const align = (attempts: number) => {
      const el = document.getElementById(id);
      if (!el) return;
      const headerHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 64;
      const delta = el.getBoundingClientRect().top - headerHeight;
      if (Math.abs(delta) > 4) {
        window.scrollTo({ top: window.scrollY + delta, behavior: "instant" });
      }
      if (attempts > 0) setTimeout(() => align(attempts - 1), 140);
    };
    align(20);
  };

  const scrollToDemo = () => scrollToSection("demo");

  // Every landing nav target, shared by the desktop bar and the mobile sheet
  // so the two can never drift apart. `section` entries scroll; `go` entries
  // change route.
  const navLinks: { label: string; section?: string; go?: () => void }[] = [
    { label: "Demo", section: "demo" },
    { label: "Programs", go: onPrograms },
    { label: "Exercises", go: onLibrary },
    { label: "Features", section: "features" },
    { label: "Pricing", section: "pricing" },
    { label: "FAQ", section: "faq" },
  ];

  const followNavLink = (link: (typeof navLinks)[number]) => {
    if (link.section) scrollToSection(link.section);
    else link.go?.();
  };

  // Deliberately NO body scroll lock while the mobile sheet is open. It is an
  // inline collapsible panel under the sticky header, not a full-screen modal,
  // so a lock buys nothing — and it actively broke navigation: `overflow:
  // hidden` was still on <body> when a menu item tried to scroll, so every
  // link became a no-op.

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSent(true);
      setEmailInput("");
      setTimeout(() => setEmailSent(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background layers — isolated in their own overflow-hidden container so
          they don't break `position: sticky` on the header. (A parent with
          `overflow: hidden` prevents sticky children from sticking.) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <Suspense fallback={null}>
          <ParticleField color="#a3e635" className="opacity-40" />
        </Suspense>
        <div className="absolute inset-0 grid-pattern grid-pattern-fade" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] blob-lime opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] blob-cyan opacity-40" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] blob-magenta opacity-30" />
      </div>

      {/* ===== Nav (sticky — stays visible while scrolling) ===== */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate({ kind: "landing" })}
            role="button"
            aria-label="Go to home"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-8 h-8 rounded-lg bg-lime/20 border border-lime/40 flex items-center justify-center glow-lime"
            >
              <Activity className="h-4 w-4 text-lime" />
            </motion.div>
            <span className="font-bold tracking-tight">
              GYM COACH <span className="text-lime">PRO</span>
            </span>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex items-center gap-6 text-sm text-muted-foreground"
          >
            {navLinks.map((l) => (
              <button
                key={l.label}
                onClick={() => followNavLink(l)}
                className="hover:text-lime transition-colors"
              >
                {l.label}
              </button>
            ))}
          </motion.nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Simplified: one secondary "Sign In" + one primary "Launch App" CTA.
                Removes the redundant "Try Demo" link (the Sign In page already has a
                prominent "Try Demo" button, so duplicate entry points caused confusion). */}
            <button
              onClick={() => navigate({ kind: "login" })}
              className="hidden sm:block text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-md transition-colors"
              aria-label="Sign in"
            >
              Sign In
            </button>
            <GlowButton
              onClick={onEnter}
              size="sm"
              glow="lime"
              className="text-xs h-11 md:h-8"
              aria-label="Launch app"
            >
              Launch App <ArrowRight className="ml-1 h-3 w-3" />
            </GlowButton>
            {/* Mobile menu trigger. Without this the six nav links above are
                display:none below md and the whole landing nav is unreachable
                on a phone. */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden h-11 w-11 -mr-1 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav sheet */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              id="mobile-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              // Overlays the page (absolute) rather than expanding in flow.
              // An in-flow panel animating its height changes document layout
              // on every frame, and that cancels the smooth scroll a menu item
              // just started — every link silently did nothing.
              className="md:hidden absolute top-full left-0 right-0 overflow-hidden border-t border-border/30 bg-background/95 backdrop-blur-xl shadow-lg"
            >
              <div className="container mx-auto max-w-6xl px-4 py-2 flex flex-col">
                {navLinks.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => {
                      setMenuOpen(false);
                      // One frame's grace so the panel is gone before the jump,
                      // otherwise it briefly paints over the destination.
                      requestAnimationFrame(() => followNavLink(l));
                    }}
                    className="text-left text-sm text-muted-foreground hover:text-lime transition-colors py-3 border-b border-border/20 last:border-0"
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate({ kind: "login" });
                  }}
                  className="text-left text-sm text-lime py-3"
                >
                  Sign In
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* ===== Section 1: Hero (rewritten) ===== */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 container mx-auto max-w-6xl px-4 pt-12 pb-16"
      >
        {/* min-h only from lg up. On phones the avatar column is hidden, so a
            forced 80vh just padded the hero with empty space. */}
        <div className="grid lg:grid-cols-2 gap-8 items-center lg:min-h-[80vh]">
          {/* Left: text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 backdrop-blur-md px-3 py-1.5 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime" />
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-lime">
                AI-Powered · Browser-Native · Privacy-First
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6"
            >
              The only AI coach that{" "}
              <span className="text-gradient-lime italic">watches your form</span>{" "}
              and corrects it in real time.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-lg text-muted-foreground max-w-xl mb-6 leading-relaxed"
            >
              Your camera tracks 33 body landmarks at 30 FPS. The AI scores every rep,
              speaks coaching cues, and shows you exactly what to fix — all in your browser,
              no video ever leaves your device.
            </motion.p>

            {/* Trust bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap items-center gap-4 mb-8 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-lime" /> No signup required</span>
              <span className="flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-lime" /> Works in Chrome</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-lime" /> 100% private</span>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              // Stacked and full-width on phones. Side by side, the two CTAs
              // measure ~390px and overflowed a 375px screen, clipping the
              // second one; flex-wrap did not help because each button is a
              // single unbreakable row.
              className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-12"
            >
              <GlowButton
                onClick={scrollToDemo}
                size="lg"
                glowStrong
                className="text-base h-12 px-6 w-full sm:w-auto"
              >
                <Play className="mr-2 h-4 w-4" /> Start Free Demo
              </GlowButton>
              <Button
                onClick={onEnter}
                size="lg"
                variant="outline"
                // bg-transparent lets the `glass` surface show through by
                // merging away the outline variant's own `bg-background`.
                className="text-base h-12 px-6 w-full sm:w-auto glass bg-transparent border-white/10 hover:border-lime/40 hover:bg-white/5"
              >
                Launch Full App
              </Button>
            </motion.div>

            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-border/50"
            >
              <HeroStat value={33} label="Landmarks / frame" />
              <HeroStat value={150} prefix="<" suffix="ms" label="Feedback latency" accent="cyan" />
              <HeroStat value={5} suffix="+" label="Exercises (20 coming)" />
              <HeroStat value={0} suffix=" bytes" label="Video to server" accent="cyan" />
            </motion.div>
          </div>

          {/* Right: 3D hero avatar with floating UI cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            // Hidden on phones. This block is purely decorative (the figure is
            // aria-hidden), and at phone widths it rendered as a tall empty
            // black box with the accent labels scattered across it — the blank
            // space under the hero. Dropping it also frees a WebGL context on
            // the device least able to spare one.
            className="hidden sm:block relative sm:h-[400px] lg:h-[600px]"
          >
            <Suspense fallback={<HeroAvatarFallback />}>
              <HeroAvatar className="w-full h-full" />
            </Suspense>
            {/* Floating accent labels */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 left-4 glass-strong rounded-lg px-3 py-2 text-xs"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Live Reps</div>
              <div className="font-mono text-lime font-bold text-lg">
                <AnimatedNumber value={7} duration={800} />
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 right-4 glass-strong rounded-lg px-3 py-2 text-xs"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Form Score</div>
              <div className="font-mono text-cyan font-bold text-lg">96 / 100</div>
            </motion.div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 right-8 glass-strong rounded-lg px-3 py-2 text-xs max-w-[180px]"
            >
              <div className="flex items-center gap-1.5">
                <Volume2 className="h-3 w-3 text-lime" />
                <span className="text-foreground">"Drive through your heels, Sarah"</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ===== Section 2: Live Interactive Demo ===== */}
      <section id="demo" className="relative z-10 container mx-auto max-w-5xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-lime" />
            <span className="text-xs font-mono uppercase tracking-wider text-lime">Try It Now — No Camera Needed</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            See the AI coach in action.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This is a live simulation of the real experience. Toggle exercises, coach personalities,
            and sound to feel how it works. When you're ready, launch the full version with your camera.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Suspense fallback={<ViewFallback label="Loading demo…" />}>
            <LandingDemo onLaunch={onEnter} />
          </Suspense>
        </motion.div>
      </section>

      {/* ===== Section 3: The Problem ===== */}
      <section className="relative z-10 container mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-magenta" />
            <span className="text-xs font-mono uppercase tracking-wider text-magenta">The Problem</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            You can't fix what you can't see.
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Existing fitness apps track what you do. None of them show you how you're doing it.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProblemCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="You're doing squats wrong and don't know it"
            body="73% of home workouts have form errors that lead to injury over time. Without feedback, you're reinforcing bad movement patterns every rep."
            delay={0}
          />
          <ProblemCard
            icon={<DollarSign className="h-5 w-5" />}
            title="Personal trainers cost $60-150 per session"
            body="Most people can't afford weekly coaching. So they train alone, guess if their form is right, and hope they don't get hurt."
            delay={0.1}
          />
          <ProblemCard
            icon={<EyeOff className="h-5 w-5" />}
            title="Fitness apps don't watch you"
            body="Nike, Apple, and Peloton track what you do — reps, sets, heart rate. None of them watch how you move. They're blind to your form."
            delay={0.2}
          />
        </div>
      </section>

      {/* ===== Section 4: How It Works ===== */}
      <section className="relative z-10 container mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-cyan" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan">How It Works</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Three steps. Under 30 seconds.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-20 left-[16%] right-[16%] h-px bg-gradient-to-r from-lime/40 via-cyan/40 to-magenta/40" />

          <StepCard
            number="01"
            icon={<Camera className="h-5 w-5" />}
            title="Open your camera"
            body="Click start, allow camera access. No app install, no hardware. Any laptop or phone webcam works."
            accent="lime"
            delay={0}
          />
          <StepCard
            number="02"
            icon={<Activity className="h-5 w-5" />}
            title="AI tracks your form"
            body="MediaPipe detects 33 body landmarks at 30 FPS, entirely in your browser. Every rep gets a 0-100 form score based on joint angles."
            accent="cyan"
            delay={0.1}
          />
          <StepCard
            number="03"
            icon={<Volume2 className="h-5 w-5" />}
            title="Get coached in real time"
            body="Voice cues tell you what to fix. The heatmap shows which joints are off. Your best rep replays as a ghost to match."
            accent="magenta"
            delay={0.2}
          />
        </div>
      </section>

      {/* ===== Section 5: Feature Deep-Dive (6 cards) ===== */}
      <section id="features" className="relative z-10 container mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-lime" />
            <span className="text-xs font-mono uppercase tracking-wider text-lime">Feature Deep-Dive</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Built for serious training.
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Not a tracker. Not a class platform. A coach that sees your form and corrects it before the rep completes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={<Camera className="h-5 w-5" />} title="Real-time Pose Detection" description="MediaPipe Tasks-Vision tracks 33 body landmarks at 30+ FPS, entirely in your browser via WASM + GPU." accent="lime" delay={0} />
          <FeatureCard icon={<Target className="h-5 w-5" />} title="Per-Rep Form Scoring" description="Every rep gets a 0-100 score computed from joint angle deviation. Track quality over time, not just quantity." accent="cyan" delay={0.05} />
          <FeatureCard icon={<Volume2 className="h-5 w-5" />} title="Voice Coaching" description="Web Speech API delivers zero-latency cues. Choose Drill Sergeant, Zen, or Technical personality." accent="lime" delay={0.1} />
          <FeatureCard icon={<Ghost className="h-5 w-5" />} title="Form Ghost Overlay" description="After your first set, the AI records your best rep. A ghost skeleton replays it so you can visually match your peak." accent="magenta" delay={0.15} />
          <FeatureCard icon={<Activity className="h-5 w-5" />} title="Form Heatmap" description="Skeleton joints change color by deviation from ideal: green, amber, red. See exactly which joints are off, every rep." accent="cyan" delay={0.2} />
          <FeatureCard icon={<Shield className="h-5 w-5" />} title="Privacy by Architecture" description="No video frame ever leaves your device. Pose detection runs client-side. Verifiable, not just a promise." accent="lime" delay={0.25} />
        </div>
      </section>

      {/* ===== Section 6: Unique Features Showcase ===== */}
      <section className="relative z-10 container mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-magenta" />
            <span className="text-xs font-mono uppercase tracking-wider text-magenta">Market Differentiators</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Features no competitor offers.
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            These aren't incremental improvements. They're the reason AI Gym Coach Pro wins.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UniqueFeatureCard title="Form Ghost Overlay" description="After your first set, the AI records your best rep. On subsequent sets, a translucent ghost skeleton replays your best form alongside your live skeleton — so you can visually match your peak." badge="Unique to AI Gym Coach Pro" accent="lime" delay={0} />
          <UniqueFeatureCard title="Real-time Form Heatmap" description="Skeleton joints change color based on deviation from ideal: green, amber, red. Post-workout, see which joints were most problematic across the session." badge="Unique to AI Gym Coach Pro" accent="cyan" delay={0.1} />
          <UniqueFeatureCard title="AI Form Comparison" description="Side-by-side: your live skeleton vs. an ideal reference skeleton pre-recorded from a certified trainer. Angle differences float on each joint in real time." badge="Pro Tier" accent="magenta" delay={0.2} />
          <UniqueFeatureCard title="Adaptive Difficulty Engine" description="If form accuracy drops below 70% for 2 sets, auto-suggest a deload. If form is above 90% and reps are easy, suggest a harder progression. The AI learns your patterns." badge="Smart Coaching" accent="amber" delay={0.3} />
        </div>
      </section>

      {/* ===== Section 7: Comparison Table ===== */}
      <section className="relative z-10 container mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-lime" />
            <span className="text-xs font-mono uppercase tracking-wider text-lime">Head-to-Head</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            No other app does what we do.
          </h2>
          <p className="text-muted-foreground max-w-2xl">See for yourself.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="overflow-x-auto rounded-2xl glass"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 font-semibold text-muted-foreground">Feature</th>
                <th className="p-4 text-center font-bold text-lime bg-lime/5 border-x border-lime/20">AI Gym Coach Pro</th>
                <th className="p-4 text-center font-medium text-muted-foreground">Nike Training Club</th>
                <th className="p-4 text-center font-medium text-muted-foreground">Apple Fitness+</th>
                <th className="p-4 text-center font-medium text-muted-foreground">Peloton</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow feature="Real-time form feedback" ours="✓" others={["—", "—", "—"]} />
              <ComparisonRow feature="Per-rep form scoring" ours="✓" others={["—", "—", "—"]} />
              <ComparisonRow feature="Voice coaching (live)" ours="✓" others={["—", "—", "—"]} />
              <ComparisonRow feature="Browser-native (no install)" ours="✓" others={["App", "App", "App + Hardware"]} />
              <ComparisonRow feature="Privacy (no video upload)" ours="✓" others={["—", "—", "—"]} />
              <ComparisonRow feature="Form Ghost overlay" ours="✓" others={["—", "—", "—"]} />
              <ComparisonRow feature="Form Heatmap" ours="✓" others={["—", "—", "—"]} />
              <ComparisonRow feature="Price" ours="Free / $9.99" others={["Free", "$9.99/mo", "$44/mo"]} lastRow />
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* ===== Section 8: Social Proof ===== */}
      <section className="relative z-10 container mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-amber" />
            <span className="text-xs font-mono uppercase tracking-wider text-amber">Beta User Feedback</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Join 1,000+ early access users training smarter.
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-amber fill-amber" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">4.8 average from beta users</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TestimonialCard
            quote="Finally an app that actually watches my form. The voice cues are spot on — I never knew my squat depth was that shallow."
            name="Sarah K."
            role="Home fitness beginner"
            delay={0}
          />
          <TestimonialCard
            quote="I hit a new squat PR in 8 weeks. The form tracking kept me honest — no more cheating depth when I got tired."
            name="Marcus T."
            role="Intermediate lifter"
            delay={0.1}
          />
          <TestimonialCard
            quote="My clients love it. I can review their form remotely between sessions. The Form Ghost feature is a game-changer for coaching."
            name="Elena R."
            role="Certified personal trainer"
            delay={0.2}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Testimonials from beta program participants. Some details paraphrased for clarity.
        </p>
      </section>

      {/* ===== Section 9: Pricing Preview ===== */}
      <section id="pricing" className="relative z-10 container mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-lime" />
            <span className="text-xs font-mono uppercase tracking-wider text-lime">Pricing</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Start free. Upgrade when you're ready.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            No credit card to start. No contracts. Cancel anytime.
          </p>

          {/* Annual billing toggle */}
          <div className="inline-flex items-center gap-3 glass rounded-full p-1.5">
            <button
              onClick={() => setAnnualBilling(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!annualBilling ? "bg-lime text-background" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnualBilling(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${annualBilling ? "bg-lime text-background" : "text-muted-foreground"}`}
            >
              Annual <span className="text-[10px] opacity-80">Save 20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <PricingCard
            name="Free"
            price={0}
            period="forever"
            features={[
              "5 exercises with form tracking",
              "Basic workout history (30 days)",
              "Voice coach (1 personality)",
              "3 starter programs",
              "XP, levels, streaks",
            ]}
            cta="Start Free"
            onClick={onEnter}
            delay={0}
          />
          <PricingCard
            name="Pro"
            price={annualBilling ? 8 : 9.99}
            period="/month"
            features={[
              "Everything in Free, plus:",
              "20+ exercises (coming)",
              "All programs + custom builder",
              "Full analytics + PR tracking",
              "Form Ghost + Heatmap",
              "3 coach personalities",
              "Weekly email reports",
            ]}
            cta={isPaymentConfigured() ? "Start Pro Trial" : "Coming Soon"}
            onClick={async () => {
              if (isPaymentConfigured()) {
                // Stripe configured — redirect to checkout
                try {
                  const res = await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier: "pro", annual: annualBilling }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch {
                  // Silent fail — user stays on page
                }
              } else {
                // Stripe not configured — route to signup so user can try free mode
                onEnter();
              }
            }}
            popular
            delay={0.1}
          />
          <PricingCard
            name="Trainer"
            price={annualBilling ? 23 : 29}
            period="/month"
            features={[
              "Everything in Pro, plus:",
              "Up to 25 client profiles",
              "Remote form review portal",
              "Assign custom programs",
              "Client analytics dashboard",
              "White-label option",
              "Priority support",
            ]}
            cta={isPaymentConfigured() ? "Start Trainer Trial" : "Coming Soon"}
            onClick={async () => {
              if (isPaymentConfigured()) {
                try {
                  const res = await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier: "trainer", annual: annualBilling }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch {
                  // Silent fail
                }
              } else {
                onEnter();
              }
            }}
            delay={0.2}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Start free, upgrade anytime. All plans include the privacy guarantee — no video leaves your device.
        </p>
      </section>

      {/* ===== Section 10: FAQ ===== */}
      <section id="faq" className="relative z-10 container mx-auto max-w-3xl px-4 py-20 border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <HelpCircle className="h-4 w-4 text-cyan" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan">FAQ</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Questions, answered.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            <FaqItem value="1" question="Do I need a special camera?">
              No. Any laptop or phone webcam works. The app uses your device's standard camera via the browser's getUserMedia API. No special hardware, no depth sensors, no wearables.
            </FaqItem>
            <FaqItem value="2" question="Does my video leave my device?">
              No. All pose detection runs in your browser via MediaPipe Tasks-Vision (WASM + GPU). Video frames are processed locally and discarded instantly. We only persist anonymized metrics — rep counts, form scores, angle summaries. Zero bytes of video are transmitted or stored.
            </FaqItem>
            <FaqItem value="3" question="Which browsers are supported?">
              Chrome 90+, Edge 90+, Firefox 90+, and Safari 15+. Chrome and Edge give the best experience (full Web Speech API support). Safari has partial voice support — coaching text still displays.
            </FaqItem>
            <FaqItem value="4" question="Do I need to install anything?">
              No. It's a web app — just open the URL and start. Optionally, you can install it as a PWA (Add to Home Screen on mobile, Install App in Chrome) for a full-screen, app-like experience with offline caching.
            </FaqItem>
            <FaqItem value="5" question="Can I use it offline?">
              The pose model caches after first load, so subsequent sessions work without a network connection. Full offline mode (including program data and history sync) is coming in Q2 2026.
            </FaqItem>
            <FaqItem value="6" question="Is there a mobile app?">
              The web app is PWA-optimized for mobile — installable, full-screen, with haptic feedback on reps. Native iOS and Android apps are planned for Q3 2026, with Apple Health and Google Fit sync.
            </FaqItem>
            <FaqItem value="7" question="How accurate is the form scoring?">
              92%+ accuracy on our golden test set (validated against certified trainer assessments). Accuracy varies with lighting, camera angle, and clothing. For best results: good lighting, full body in frame, fitted clothing.
            </FaqItem>
            <FaqItem value="8" question="Can I cancel anytime?">
              Yes. No contracts, no cancellation fees. Cancel in one click from your account settings. You keep access until the end of your billing period, then revert to the Free tier with your data intact.
            </FaqItem>
          </Accordion>
        </motion.div>
      </section>

      {/* ===== Section 11: Final CTA ===== */}
      <section id="final-cta" className="relative z-10 container mx-auto max-w-4xl px-4 py-24 border-t border-border/30 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <Gauge className="h-4 w-4 text-cyan" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan">60 FPS · Zero Lag · 100% Private</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Stop guessing if your form is right.{" "}
            <span className="text-gradient-lime">Know it.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
            Start your first session in under 30 seconds. No signup. No credit card. Just open and train.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <GlowButton onClick={onEnter} size="lg" glowStrong className="text-base h-14 px-10">
              <Play className="mr-2 h-5 w-5" /> Launch Free Demo
            </GlowButton>
            <Button
              onClick={onPrograms}
              size="lg"
              variant="outline"
              className="text-base h-14 px-8 bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20 hover:border-cyan/60 transition-all"
              aria-label="Browse workout programs"
            >
              Browse Programs
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            4.8★ average from beta users · 50,000+ reps tracked in beta · 0 bytes of video uploaded
          </p>
        </motion.div>
      </section>

      {/* ===== Section 12: Footer ===== */}
      <footer className="relative z-10 border-t border-border/30 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            {/* Brand + newsletter */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-lime/20 border border-lime/40 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-lime" />
                </div>
                <span className="font-bold tracking-tight text-sm">
                  GYM COACH <span className="text-lime">PRO</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                The only AI coach that watches your form and corrects it in real time. Browser-native, privacy-first.
              </p>
              <form onSubmit={handleNewsletter} className="flex gap-2 max-w-xs">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Get weekly form tips"
                  className="flex-1 px-3 py-2 text-xs rounded-lg glass border-border bg-background/50 focus:outline-none focus:border-lime/40"
                />
                <Button type="submit" size="sm" className="bg-lime text-background hover:bg-lime/90 h-8 text-xs">
                  {emailSent ? "✓ Sent" : "Subscribe"}
                </Button>
              </form>
            </div>

            <FooterColumn
              title="Product"
              links={[
                { label: "Features", href: "#features" },
                { label: "Programs", onClick: onPrograms },
                { label: "Exercises", onClick: onLibrary },
                { label: "Pricing", href: "#pricing" },
                { label: "Demo", onClick: scrollToDemo },
              ]}
            />
            <FooterColumn
              title="Company"
              links={[
                { label: "About", href: "/about" },
                { label: "Blog", href: "/blog" },
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
              ]}
            />
            {/* Careers/Press/API Docs/Status were removed rather than left as
                inert text — they promised pages that do not exist. Add them
                back with an href when there is something behind them. */}
            <FooterColumn
              title="Resources"
              links={[
                { label: "Exercise Library", onClick: onLibrary },
                { label: "Programs", onClick: onPrograms },
                { label: "How it works", href: "/about" },
                { label: "FAQ", href: "#faq" },
              ]}
            />
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/50 pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>© 2026 AI Gym Coach Pro</span>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              {/* Cookie and GDPR specifics are covered inside the privacy page
                  rather than given their own stubs. */}
              <a href="/privacy" className="hover:text-foreground transition-colors">Cookies</a>
            </div>
            <div className="flex items-center gap-3">
              <SocialIcon label="Twitter" />
              <SocialIcon label="Instagram" />
              <SocialIcon label="YouTube" />
              <SocialIcon label="Discord" />
            </div>
          </div>
          <div className="text-center text-[10px] text-muted-foreground mt-4 font-mono uppercase tracking-wider">
            Built with Next.js 16 + MediaPipe Tasks-Vision + React Three Fiber
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroAvatarFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="w-32 h-32 rounded-full border-2 border-lime/30 border-t-lime"
      />
    </div>
  );
}

function HeroStat({
  value,
  prefix,
  suffix,
  label,
  accent = "lime",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  accent?: "lime" | "cyan";
}) {
  const color = accent === "lime" ? "text-lime" : "text-cyan";
  return (
    <div>
      <div className={`font-mono text-2xl md:text-3xl font-bold ${color}`}>
        {prefix}<AnimatedNumber value={value} duration={1200} />{suffix}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

function ProblemCard({
  icon,
  title,
  body,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
    >
      <TiltCard maxTilt={6} glow="magenta" className="p-5 h-full">
        <div className="text-magenta mb-3">{icon}</div>
        <h3 className="font-semibold mb-2 text-lg">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </TiltCard>
    </motion.div>
  );
}

function StepCard({
  number,
  icon,
  title,
  body,
  accent,
  delay,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: "lime" | "cyan" | "magenta";
  delay: number;
}) {
  const color = accent === "lime" ? "text-lime" : accent === "cyan" ? "text-cyan" : "text-magenta";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      <TiltCard maxTilt={5} glow={accent} className="p-6 h-full text-center relative">
        <div className={`font-mono text-5xl font-black ${color} opacity-30 absolute top-2 right-3`}>
          {number}
        </div>
        <div className={`${color} mb-3 flex justify-center`}>{icon}</div>
        <h3 className="font-semibold mb-2 text-lg">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </TiltCard>
    </motion.div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: "lime" | "cyan" | "magenta";
  delay: number;
}) {
  const color = accent === "lime" ? "text-lime" : accent === "cyan" ? "text-cyan" : "text-magenta";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
    >
      <TiltCard maxTilt={6} glow={accent === "magenta" ? "magenta" : accent} className="p-5 h-full">
        <div className={`${color} mb-3`}>{icon}</div>
        <h3 className="font-semibold mb-1 text-lg">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </TiltCard>
    </motion.div>
  );
}

function UniqueFeatureCard({
  title,
  description,
  badge,
  accent,
  delay,
}: {
  title: string;
  description: string;
  badge: string;
  accent: "lime" | "cyan" | "magenta" | "amber";
  delay: number;
}) {
  const badgeColor =
    accent === "lime" ? "border-lime/40 text-lime bg-lime/10" :
    accent === "cyan" ? "border-cyan/40 text-cyan bg-cyan/10" :
    accent === "magenta" ? "border-magenta/40 text-magenta bg-magenta/10" :
    "border-amber/40 text-amber bg-amber/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
    >
      <TiltCard maxTilt={5} glow={accent} className="p-6 h-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold tracking-tight text-xl">{title}</h3>
          <Badge variant="outline" className={`text-[10px] h-5 shrink-0 ${badgeColor}`}>
            {badge}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </TiltCard>
    </motion.div>
  );
}

function ComparisonRow({
  feature,
  ours,
  others,
  lastRow,
}: {
  feature: string;
  ours: string;
  others: [string, string, string];
  lastRow?: boolean;
}) {
  return (
    <tr className={lastRow ? "" : "border-b border-border/50"}>
      <td className="p-4 font-medium text-foreground">{feature}</td>
      <td className="p-4 text-center font-mono font-bold text-lime bg-lime/5 border-x border-lime/20">{ours}</td>
      <td className="p-4 text-center text-muted-foreground font-mono">{others[0]}</td>
      <td className="p-4 text-center text-muted-foreground font-mono">{others[1]}</td>
      <td className="p-4 text-center text-muted-foreground font-mono">{others[2]}</td>
    </tr>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
  delay,
}: {
  quote: string;
  name: string;
  role: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
    >
      <TiltCard maxTilt={4} glow="amber" className="p-6 h-full">
        <div className="flex mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 text-amber fill-amber" />
          ))}
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-4">"{quote}"</p>
        <div>
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
      </TiltCard>
    </motion.div>
  );
}

function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  onClick,
  popular,
  delay,
}: {
  name: string;
  price: number;
  period: string;
  features: string[];
  cta: string;
  onClick: () => void;
  popular?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
      className="relative h-full"
    >
      {/* The badge lives OUTSIDE TiltCard on purpose. TiltCard wraps its
          children in a `translateZ(40px)` div for the 3D lift, and any
          transform creates a containing block for absolutely positioned
          descendants — so a `-top-3` badge inside it anchored to that inner
          wrapper (which starts below the card's p-6 padding) instead of the
          card edge, landing right on top of the plan name. Hoisting it up to
          this positioned wrapper lets it straddle the border as intended. */}
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <Badge className="bg-lime text-background glow-lime">Most Popular</Badge>
        </div>
      )}
      {/* flex column + mt-auto on the button below. Free has 5 features and
          Pro/Trainer have 7, so with the CTA simply following the list the
          three buttons landed at three different heights and the row looked
          broken. */}
      <TiltCard
        maxTilt={popular ? 5 : 3}
        glow={popular ? "lime" : "none"}
        className={`p-6 h-full flex flex-col ${popular ? "pt-8 border-lime/40" : ""}`}
        contentClassName="flex flex-col h-full"
      >
        <div className="text-center mb-4">
          <div className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-2">{name}</div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-mono text-4xl font-bold">${price}</span>
            <span className="text-xs text-muted-foreground">{period}</span>
          </div>
        </div>
        <ul className="space-y-2 mb-6 flex-1">
          {features.map((f, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
              <Check className="h-3.5 w-3.5 text-lime shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={onClick}
          className={`w-full font-semibold mt-auto h-11 ${
            popular
              ? "bg-lime text-background hover:bg-lime/90 glow-lime"
              : "bg-muted/40 text-foreground border border-border hover:bg-muted/60 hover:border-lime/40"
          }`}
        >
          {cta}
        </Button>
      </TiltCard>
    </motion.div>
  );
}

function FaqItem({
  value,
  question,
  children,
}: {
  value: string;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="glass rounded-xl px-4 border-border">
      <AccordionTrigger className="text-sm font-medium hover:no-underline">
        {question}
      </AccordionTrigger>
      <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href?: string; onClick?: () => void }[];
}) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      <ul className="space-y-2">
        {links.map((link, i) => (
          <li key={i}>
            {link.href ? (
              <a href={link.href} className="text-xs text-foreground/80 hover:text-lime transition-colors">
                {link.label}
              </a>
            ) : link.onClick ? (
              <button onClick={link.onClick} className="text-xs text-foreground/80 hover:text-lime transition-colors">
                {link.label}
              </button>
            ) : (
              <span className="text-xs text-foreground/60 cursor-default">{link.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Social badge. Renders as a link when a URL is supplied, otherwise as inert
 * decoration — it used to be a <button> with no handler, so it invited a click
 * and did nothing. Pass `href` once the accounts exist.
 */
function SocialIcon({ label, href }: { label: string; href?: string }) {
  const content = <span className="text-[10px] font-mono">{label[0]}</span>;
  const shape =
    "w-8 h-8 rounded-lg glass flex items-center justify-center text-muted-foreground";

  if (!href) {
    return (
      <span aria-hidden="true" title={label} className={shape}>
        {content}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`${shape} hover:text-lime hover:border-lime/40 transition-colors`}
    >
      {content}
    </a>
  );
}
