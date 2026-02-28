import { useEffect, useState } from "react";
import "./ReportsTable.css";

interface Report {
  id: number;
  category: string;
  other_category?: string | null;
  location_display: string;
  verified_critical_level?: string | null;
  status?: string;
  created_at: string;
}

export function ReportsTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL;

    const fetchReports = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/reports/list/`, {
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

  const formatStatusLabel = (raw?: string) => {
    const s = String(raw ?? "").toLowerCase();

    switch (s) {
      case "in_progress":
        return "In Progress";
      case "needs_info":
        return "Needs Info";
      case "assigned":
        return "Assigned";
      case "pending":
        return "Pending";
      case "resolved":
        return "Resolved";
      case "rejected":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  const normalizeStatus = (raw?: string) => {
    return String(raw ?? "").toLowerCase();
  };

  const extractBarangay = (location: string) => {
    if (!location) return "-";

    const match = location.match(/barangay[^,]*/i);
    if (!match) return "-";

    return match[0].trim();
  };


  const hazardPillClass = (level?: string | null) => {
    const l = String(level ?? "").toLowerCase();

    switch (l) {
      case "low":
        return "hazard-pill low";
      case "moderate":
        return "hazard-pill moderate";
      case "high":
        return "hazard-pill high";
      case "critical":
        return "hazard-pill critical";;
      default:
        return "hazard-pill";
    }
  };

  const ACTIVE_STATUSES = ["pending", "assigned", "in_progress", "needs_info"];


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
                <th className="center">Category</th>
                <th className="center">Critical Level</th>
                <th className="center">Location</th>
                <th className="center">Status</th>
                <th className="center">Date</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .filter((r) => ACTIVE_STATUSES.includes(String(r.status ?? "").toLowerCase()))
                .map((report) => (
                  <tr key={report.id}>
                    <td className="report-id center">R-{report.id.toString().padStart(3, "0")}</td>
                    <td className="center">
                      {reportCategory(report)}
                    </td>
                    <td className="center">
                      <span className={hazardPillClass(report.verified_critical_level)}>
                        {report.verified_critical_level}
                      </span>
                    </td>
                    <td className="truncate center">{extractBarangay(report.location_display)}</td>
                    <td className="center">
                      <span className={`status-badge ${normalizeStatus(report.status)}`}>
                        {formatStatusLabel(report.status)}
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
