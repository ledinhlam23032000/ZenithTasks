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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
