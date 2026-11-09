// Cubby service worker (KAM-51): makes the installed app feel native.
//  - Navigations go to the network; if that fails (offline), show the
//    cached "You're offline" page instead of the browser's error.
//  - Hashed build assets (/_next/static/) are immutable: cache-first.
//  - Never caches user data (pages, API, Supabase) — no offline editing.
//  - Shows daily push digests (KAM-54); tapping one opens its page.
// Bump VERSION to refresh.
const VERSION = "cubby-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        cache.add(new Request(OFFLINE_URL, { cache: "reload" })),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

// Push (KAM-54): the payload is {title, body, url, tag} from the
// send-push-digest Edge Function.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // not JSON — show a generic alert
  }
  const url =
    typeof data.url === "string" && data.url.startsWith("/")
      ? data.url
      : "/notifications";
  event.waitUntil(
    self.registration.showNotification(data.title || "Cubby", {
      body: data.body || "You have new price alerts.",
      tag: data.tag || "cubby",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/notifications",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find(
          (w) => new URL(w.url).origin === self.location.origin,
        );
        if (open) return open.focus().then((w) => w.navigate(target));
        return self.clients.openWindow(target);
      }),
  );
});
