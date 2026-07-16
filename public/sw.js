// Former HilltopAds verification worker — unused after switching to Adcash banners.
// Kept at /sw.js so old registrations do not 404; does not load any ad network.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
