"use client";

import { useEffect } from "react";

/**
 * Global chunk-load error recovery.
 *
 * When the app is deployed and a new version is pushed, old tabs holding
 * stale chunks get `ChunkLoadError` when they try to lazy-load a route.
 * The same thing happens in dev when the `.next/dev` cache is cleared.
 *
 * This component listens for unhandled `ChunkLoadError` events and
 * automatically reloads the page ONCE so the user picks up the fresh chunks.
 * Without this, users see a blank screen / broken route.
 *
 * Mount this once at the root layout level.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    // Track whether we've already reloaded for this session — prevents
    // infinite reload loops if the fresh chunk ALSO fails (e.g. server down).
    const RELOAD_FLAG = "__chunkReloadDone";

    const isChunkError = (message: string): boolean => {
      const lower = message.toLowerCase();
      return (
        lower.includes("chunkloaderror") ||
        lower.includes("loading chunk") ||
        lower.includes("loading css chunk") ||
        lower.includes("failed to fetch dynamically imported module") ||
        lower.includes("importing a module script failed")
      );
    };

    const handleChunkError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || "";
      if (!isChunkError(message)) return;
      if (sessionStorage.getItem(RELOAD_FLAG) === "1") {
        // Already reloaded once and still failing — don't loop.
        console.error("[ChunkError] Persistent chunk load failure:", message);
        return;
      }
      console.warn("[ChunkError] Auto-reloading to fetch fresh chunks:", message);
      sessionStorage.setItem(RELOAD_FLAG, "1");
      // Reload from server (not cache) to pick up new chunks.
      window.location.reload();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason?.message || reason?.name || "";
      if (!isChunkError(message)) return;
      if (sessionStorage.getItem(RELOAD_FLAG) === "1") {
        console.error("[ChunkError] Persistent chunk load failure:", message);
        return;
      }
      console.warn("[ChunkError] Auto-reloading to fetch fresh chunks:", message);
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    };

    // Listen for both sync errors and async promise rejections (lazy imports
    // fail as rejected promises, not sync errors).
    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Clear the reload flag after a successful navigation so future
    // deployments can also auto-recover.
    const clearFlag = () => sessionStorage.removeItem(RELOAD_FLAG);
    window.addEventListener("load", clearFlag);

    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("load", clearFlag);
    };
  }, []);

  return null;
}
