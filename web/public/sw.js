// Service worker tối giản cho PWA Zenith Clinic.
// Chiến lược: ưu tiên mạng (network-first), chỉ dùng cache khi mất mạng —
// để KHÔNG bao giờ hiển thị dữ liệu cũ khi đang online.
const CACHE = "hong-phuc-mobile-v2";
const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Tin nhắn mới", body: event.data?.text() ?? "Có tin nhắn mới trong hộp thư." };
  }

  const title = data.title || "Tin nhắn mới";
  const options = {
    body: data.body || "Có tin nhắn mới trong hộp thư.",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "hong-phuc-inbox",
    renotify: true,
    data: { url: data.url || "/cham-soc/hop-thu" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/cham-soc/hop-thu";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
