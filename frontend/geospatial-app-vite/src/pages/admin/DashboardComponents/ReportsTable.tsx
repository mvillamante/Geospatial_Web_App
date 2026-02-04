import { useEffect, useState } from "react";
import "./ReportsTable.css";

interface Report {
  id: number;
  category: string;
  other_category?: string | null;
  location_display: string;
  status?: string;
  created_at: string;
}

export function ReportsTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/api/reports/list/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const reportCategory = (r: Report) => {
    if (r.category === "others" && r.other_category?.trim()) {
      return r.other_category.trim();
    }
    return r.category.charAt(0).toUpperCase() + r.category.slice(1);
  };

  const formatDate = (iso: string) => {
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString();
  };

  const normalizeStatus = (raw?: string) => {
    const s = String(raw ?? "").toLowerCase();
    if (s === "pending") return "pending";
    if (s === "in_progress" || s === "under review") return "under review";
    if (s === "assigned") return "assigned";
    if (s === "resolved") return "resolved";
    return "pending";
  };

  const hazardPillClass = (category: string) => {
    const c = category.toLowerCase();

    switch (c) {
        case "fire":
        return "hazard-pill fire";
        case "flood":
        return "hazard-pill flood";
        case "landslide":
        return "hazard-pill landslide";
        case "accident":
        return "hazard-pill accident";
        case "others":
        return "hazard-pill others";
        default:
        return "hazard-pill";
    }
    };

  if (loading) return <div>Loading reports...</div>;

  if (!reports.length)
    return <div className="reports-card">No reports available.</div>;

    return (
    <div className="reports-card">
        <div className="reports-header">
            <div className="reports-table-wrapper">
                <table className="reports-table">
                <thead>
                    <tr>
                    <th className="center">ID</th>
                    <th className="center">Hazard Type</th>
                    <th className="center">Location</th>
                    <th className="center">Status</th>
                    <th className="center">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((report) => (
                    <tr key={report.id}>
                        <td className="report-id center">R-{report.id.toString().padStart(3, "0")}</td>
                        <td className="center">
                            <span className={hazardPillClass(report.category)}>
                                {reportCategory(report)}
                            </span>
                        </td>
                        <td className="truncate center">{report.location_display || "-"}</td>
                        <td className="center">
                        <span className={`status-badge ${normalizeStatus(report.status)}`}>
                            {normalizeStatus(report.status)}
                        </span>
                        </td>
                        <td className="report-date center muted">{formatDate(report.created_at)}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>
    </div>
    );
}
