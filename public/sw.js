/**
 * Service Worker for AI Gym Coach Pro
 *
 * Strategies:
 *   - App shell (HTML/CSS/JS/fonts): cache-first with network fallback.
 *   - Static assets (images, models): cache-first with network fallback.
 *   - Navigation requests: network-first, fall back to cached shell or /offline.html.
 *   - API requests: NETWORK-ONLY (never cache — auth tokens, user data, mutations).
 *   - MediaPipe CDN: bypass entirely (let browser cache handle it).
 *
 * Resilience:
 *   - Per-asset precache (one failed asset doesn't break the whole install).
 *   - Offline fallback page on navigation failure.
 *   - Update flow: skipWaiting + postMessage to clients to trigger reload prompt.
 *   - Never caches /api/auth/* or any POST/PUT/DELETE.
 */

const CACHE_VERSION = "v2"; // bump on deploys that change app shell
const CACHE_NAME = `gym-coach-pro-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Assets to precache during install. If any 404s, we log + continue.
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/robots.txt",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/logo.svg",
  "/models/pose_landmarker_lite.task",
  "/models/vision_wasm_internal.js",
  "/models/vision_wasm_internal.wasm",
  "/models/vision_wasm_nosimd_internal.js",
  "/models/vision_wasm_nosimd_internal.wasm",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Per-asset precache — one failure doesn't break the install.
      await Promise.all(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn(`[SW] precache miss: ${url}`, e.message);
          }
        })
      );
      // Force-activate on next navigation.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete any caches that aren't the current version.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Notify clients that a new SW has taken over.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) {
        c.postMessage({ type: "SW_UPDATED" });
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET. POST/PUT/DELETE always go to network.
  if (request.method !== "GET") return;

  // Skip cross-origin requests (MediaPipe CDN, fonts, analytics).
  // The browser's HTTP cache handles these.
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR + internal paths.
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Skip ALL /api/* requests — never cache API responses.
  // Auth tokens, user data, and workout POSTs must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests (HTML pages): network-first → cached shell → /offline.html.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // Cache the latest HTML for next time.
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (e) {
          // Network failed — try cache, then offline page.
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts, models): cache-first.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        // Only cache successful, same-origin responses.
        if (fresh.ok && fresh.type === "basic") {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (e) {
        // Network failed + not cached → empty response.
        return Response.error();
      }
    })()
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = { title: "AI Gym Coach Pro", body: "Time to train!" };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data.body = event.data?.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
    tag: "gym-coach-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click — focus existing window or open new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
      // Look for a client whose URL matches the target.
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise focus any existing window of our origin.
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});

// Handle message from page (e.g., "SKIP_WAITING" trigger).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
