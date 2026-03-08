import { dbPromise } from "./offlineDB";

export const syncOfflineReports = async (API_URL: string, token: string) => {
  const db = await dbPromise;
  const reports = await db.getAll("offlineReports");

  for (const report of reports) {
    try {
      const form = new FormData();

      Object.entries(report.data).forEach(([key, value]) => {
        form.append(key, value as any);
      });

      await fetch(`${API_URL}/api/reports/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      await db.delete("offlineReports", report.id);
    } catch (err) {
      console.error("Offline sync failed", err);
    }
  }
};