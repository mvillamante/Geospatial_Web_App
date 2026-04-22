import { getOfflineReports, deleteOfflineReport } from "./offlineReportsDB";

export const syncOfflineReports = async () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const reports = await getOfflineReports();
  const token = localStorage.getItem("token");

  for (const report of reports) {
    try {
      const { id, ...payload } = report;

      const res = await fetch(`${API_URL}/api/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed");

      await deleteOfflineReport(report.id);
    } catch (err) {
      console.error("Sync failed:", report.id);
    }
  }
};