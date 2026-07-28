"use client";

import { useEffect, useState } from "react";

/**
 * Registers the PWA service worker on mount and surfaces an "update
 * available" flag so the UI can prompt the user to refresh.
 *
 * In production only — dev mode would cache stale assets and break HMR.
 */
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      // The new SW has taken over — reload to pick up new app shell.
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    // Listen for the explicit SW_UPDATED message from the SW.
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_UPDATED") {
        setUpdateAvailable(true);
      }
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // If a new SW is already waiting (e.g. user came back to the tab), surface it.
        if (reg.waiting) {
          setUpdateAvailable(true);
        }
        // Listen for new SW installations.
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && reg.waiting) {
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return { updateAvailable };
}

/**
 * Apply a pending SW update by sending SKIP_WAITING to the waiting worker.
 * The SW will activate and trigger a `controllerchange`, which our hook
 * handles by reloading the page.
 */
export function applyServiceWorkerUpdate() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg?.waiting) {
      reg.waiting.postMessage("SKIP_WAITING");
    }
  });
}

/**
 * Request push notification permission.
 * Returns true if granted, false otherwise.
 *
 * NOTE: Must be called from a user-gesture handler on iOS Safari.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Show a local notification (no server push needed).
 */
export function showNotification(title: string, body: string, url = "/") {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    navigator.serviceWorker?.ready.then((reg) => {
      // TS's NotificationOptions doesn't include `vibrate` or `renotify`,
      // but both are widely supported on Android Chrome.
      const opts = {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url },
        tag: "gym-coach-notification",
        vibrate: [100, 50, 100],
        renotify: true,
      } as NotificationOptions;
      reg.showNotification(title, opts);
    });
  } catch {
    new Notification(title, { body, icon: "/icon-192.png" });
  }
}
