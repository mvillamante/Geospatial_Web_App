import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "./ReportsTable.css";

interface Report {
  id: number;
  category: string;
  other_category?: string | null;
  location_display: string;
  verified_critical_level?: string | null;
  status?: string;
  created_at: string;
  assigned_officer_label?: string | null;
  description?: string;
  photo_url?: string | null;
  department_id?: number | null;
  user_label: string;
}

interface Officer {
  id: number;
  label: string;
  department_id: number;
}

export function ReportsTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");

  const API_URL = import.meta.env.VITE_API_URL;

  // Fetch reports
  const fetchReports = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/reports/list/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch officers
  const fetchOfficers = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      setLoadingOfficers(true);
      const res = await fetch(`${API_URL}/api/reports/list/officers/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setOfficers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch officers:", err);
      setOfficers([]);
    } finally {
      setLoadingOfficers(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchOfficers();
  }, []);

  // Assign officer
  const assignOfficer = async (reportId: number, officerId: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/reports/${reportId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assigned_officer: officerId }),
      });

      if (!res.ok) throw new Error(await res.text());
      const updatedReport = await res.json();

      alert(
        updatedReport.assigned_officer_label
          ? `Assigned to ${updatedReport.assigned_officer_label}`
          : "Assigned successfully"
      );

      // Refresh reports
      await fetchReports();

      // Close the modal
      setSelectedReport(null);
      setSelectedOfficer("");
    } catch (err) {
      console.error(err);
      alert("Failed to assign officer");
    }
  };

  // Helpers
  const reportCategory = (r: Report) =>
    r.category === "others" && r.other_category?.trim()
      ? r.other_category.trim()
      : r.category.charAt(0).toUpperCase() + r.category.slice(1);

  const formatDate = (iso: string) => {
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString();
  };

  const normalizeStatus = (raw?: string) => String(raw ?? "").toLowerCase();

  const formatStatusLabel = (raw?: string) => {
    const s = normalizeStatus(raw);
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

  const extractBarangay = (location: string) => {
    if (!location) return "-";
    const match = location.match(/barangay[^,]*/i);
    return match ? match[0].trim() : "-";
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
        return "hazard-pill critical";
      default:
        return "hazard-pill";
    }
  };

  const ACTIVE_STATUSES = ["pending", "assigned", "in_progress", "needs_info"];

  if (loading) return <div>Loading reports...</div>;
  if (!reports.length) return <div className="reports-card">No reports available.</div>;

  return (
    <div className="reports-card">
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
              <th className="center">Assigned Officer</th>
            </tr>
          </thead>
          <tbody>
            {reports
              .filter((r) => ACTIVE_STATUSES.includes(normalizeStatus(r.status)))
              .sort((a, b) => {
                const statusA = normalizeStatus(a.status);
                const statusB = normalizeStatus(b.status);
                if (statusA === "pending" && statusB !== "pending") return -1;
                if (statusA !== "pending" && statusB === "pending") return 1;

                const levelPriority: Record<string, number> = {
                  critical: 4,
                  high: 3,
                  moderate: 2,
                  low: 1,
                };
                const levelA = levelPriority[String(a.verified_critical_level ?? "").toLowerCase()] || 0;
                const levelB = levelPriority[String(b.verified_critical_level ?? "").toLowerCase()] || 0;
                return levelB - levelA;
              })
              .map((report) => (
                <tr key={report.id} className="clickable-row" onClick={() => setSelectedReport(report)}>
                  <td className="report-id center">R-{report.id.toString().padStart(3, "0")}</td>
                  <td className="center">{reportCategory(report)}</td>
                  <td className="center">
                    {normalizeStatus(report.status) === "pending" ? (
                      <span>---</span>
                    ) : (
                      <span className={hazardPillClass(report.verified_critical_level)}>
                        {report.verified_critical_level ?? "---"}
                      </span>
                    )}
                  </td>
                  <td className="truncate center">{extractBarangay(report.location_display)}</td>
                  <td className="center">
                    <span className={`status-badge ${normalizeStatus(report.status)}`}>
                      {formatStatusLabel(report.status)}
                    </span>
                  </td>
                  <td className="report-date center muted">{formatDate(report.created_at)}</td>
                  <td className="report-assigned center">
                    {report.assigned_officer_label ? (
                      <span className="assigned-chip">{report.assigned_officer_label}</span>
                    ) : (
                      <span className="muted">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedReport &&
        ReactDOM.createPortal(
          <div
            className="modal-overlay"
            onClick={() => {
              setSelectedReport(null);
              setSelectedOfficer("");
            }}
          >
            <div className="report-modal" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="modal-head">
                <div>
                  <div className="modal-title">
                    Report #{selectedReport.id} • {reportCategory(selectedReport)}
                  </div>
                  <div className="modal-sub">
                    {selectedReport.user_label} • {selectedReport.status ?? "Pending"}
                  </div>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => {
                    setSelectedReport(null);
                    setSelectedOfficer("");
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="modal-body">
                <div className="modal-top-grid">
                  <div className="modal-info">
                    <div className="detail-item">
                      <div className="label">Location</div>
                      <div className="value">{selectedReport.location_display || "-"}</div>
                    </div>

                    <div className="detail-item">
                      <div className="label">Submitted</div>
                      <div className="value">
                        {new Date(selectedReport.created_at).toLocaleDateString()}{" "}
                        {new Date(selectedReport.created_at).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="label">Verified Critical Level</div>
                      <div className="value">
                        {selectedReport.verified_critical_level ? (
                          <span
                            className={`critical-badge ${selectedReport.verified_critical_level.toLowerCase()}`}
                          >
                            {selectedReport.verified_critical_level}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="label">Assigned Officer</div>
                      <div className="value">
                        {selectedReport.assigned_officer_label ?? "Unassigned"}
                      </div>
                    </div>
                  </div>

                  <div className="detail-item full">
                    <div className="label">Description</div>
                    <div className="value prewrap">{selectedReport.description || "-"}</div>
                  </div>

                  {selectedReport.photo_url && (
                    <div className="modal-photo">
                      <img src={selectedReport.photo_url} alt="Report" className="report-photo" />
                    </div>
                  )}
                </div>

                {/* Officer Assignment */}
                <div className="assign-box">
                  <div className="assign-label">Assign to LGU Officer</div>
                  <div className="assign-row">
                    <select
                      className="select"
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                      disabled={loadingOfficers}
                    >
                      <option value="" disabled>
                        {loadingOfficers ? "Loading officers..." : "Select Officer.."}
                      </option>
                      {officers
                        .filter((o) => o.department_id === selectedReport.department_id)
                        .map((o) => (
                          <option key={o.id} value={String(o.id)}>
                            {o.label}
                          </option>
                        ))}
                    </select>

                    <button
                      className="btn"
                      onClick={() => {
                        if (!selectedOfficer) return alert("Please select an officer.");
                        assignOfficer(selectedReport.id, Number(selectedOfficer));
                      }}
                    >
                      {selectedReport.assigned_officer_label ? "Reassign" : "Assign"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}