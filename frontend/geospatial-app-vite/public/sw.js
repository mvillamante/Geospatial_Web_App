const CACHE_NAME = "hazspot-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles/global.css",
  "/styles/landing.css",
  "/styles/login.css",
  "/styles/signup.css",
  "/styles/mapview.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
