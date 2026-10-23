// Service worker : installabilité, page hors-ligne, notifications push.
const CACHE = "studeals-v2";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/offline.html", "/icon-192.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/offline.html")));
  }
});

self.addEventListener("push", (e) => {
  let data = { title: "Studeals", body: "", href: "/", tag: "default" };
  try { data = { ...data, ...e.data.json() }; } catch {}
  const sos = data.tag === "sos";
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: sos ? `sos-${Date.now()}` : data.tag,
      data: { href: data.href },
      requireInteraction: sos,
      vibrate: sos ? [200, 100, 200] : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const href = (e.notification.data && e.notification.data.href) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) { w.navigate(href); return w.focus(); }
      }
      return self.clients.openWindow(href);
    }),
  );
});
