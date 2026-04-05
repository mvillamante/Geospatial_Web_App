const openDB = idb.openDB;

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reports") {
    event.waitUntil(syncReports());
  }
});

async function syncReports() {
  const db = await openDB(DB_NAME, 1);
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const reports = await store.getAll();

  for (const report of reports) {
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",        }
      });

      await store.delete(report.id);
    } catch (err) {
      console.error("Sync failed:", report.id);
    }
  }
}

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
