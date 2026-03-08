import { openDB } from "idb";

export const dbPromise = openDB("hazspot-offline-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("offlineReports")) {
      db.createObjectStore("offlineReports", {
        keyPath: "id",
        autoIncrement: true,
      });
    }
  },
});