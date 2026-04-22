import { openDB } from "idb";

const DB_NAME = "incident-reports-db";
const STORE_NAME = "offline-reports";

export const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
    },
});

export const addOfflineReport = async (report: any) => {
    const db = await dbPromise;
    await db.add(STORE_NAME, report);
}

export const getOfflineReports = async () => {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
}

export const deleteOfflineReport = async (id: number) => {
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
}