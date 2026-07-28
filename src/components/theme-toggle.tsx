"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemeOption = "light" | "dark" | "system";

/**
 * useMounted — returns false on server, true on client.
 *
 * Uses useSyncExternalStore (React 18+) which is the correct way to
 * read client-only state without:
 *   - setState-in-effect (lint error)
 *   - queueMicrotask setState (runtime error: "state update before mount")
 *   - hydration mismatch
 *
 * The subscribe function is a no-op because we don't track external changes.
 * The getServerSnapshot returns false (SSR), getSnapshot returns true (client).
 */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg glass" aria-hidden />;
  }

  const cycle = () => {
    const order: ThemeOption[] = ["light", "dark", "system"];
    const current = (theme as ThemeOption) || "dark";
    const next = order[(order.indexOf(current) + 1) % order.length];
    setTheme(next);
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={cycle}
      className="relative flex items-center gap-2 glass glass-hover rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      aria-label={`Theme: ${label}. Click to change.`}
      title={`Theme: ${label}`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="h-4 w-4 text-lime" />
        </motion.span>
      </AnimatePresence>
      <span className="hidden sm:inline capitalize">{label}</span>
    </motion.button>
  );
}
