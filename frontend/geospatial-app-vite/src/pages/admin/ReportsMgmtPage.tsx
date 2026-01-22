import { useEffect, useMemo, useState } from "react";
import { Eye, UserPlus, RefreshCcw, X } from "lucide-react";
import { toast } from "sonner";
import "./ReportsMgmtPage.css";

type ReportStatus = "Pending" | "Assigned" | "Verified" | "Rejected" | "Resolved" | "Archived";

interface Report {
  id: number;
  user_label: string;        
  category: string;       
  other_category?: string | null;   
  location_display: string;
  created_at: string;
  description: string;
  status?: ReportStatus;
  assigned_officer_label?: string | null;
}

const API_BASE = "http://localhost:8000";

const reportCategory = (c: string) =>
  c ? c.charAt(0).toUpperCase() + c.slice(1) : "";

const reportCategoryLabel = (r: Report) => {
  const raw =
    r.category === "others" && r.other_category?.trim()
      ? r.other_category.trim()
      : r.category;

  return reportCategory(raw);
};


const formatDateTime = (iso: string) => {
  const dt = new Date(iso);
  return {
    date: isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString(),
    time: isNaN(dt.getTime()) ? "-" : dt.toLocaleTimeString(),
  };
};

const badgeClass = (status: ReportStatus) => {
  switch (status) {
    case "Pending":
      return "badge pending";
    case "Assigned":
      return "badge assigned";
    case "Verified":
      return "badge verified";
    case "Rejected":
      return "badge rejected";
    case "Resolved":
      return "badge resolved";
    case "Archived":
      return "badge archived";
    default:
      return "badge";
  }
};

const ReportsMgmtPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // dito kukunin mga officer accounts/names
  const officers = useMemo(
    () => ["Officer Hopps", "Officer Wilde", "Chief Bogo"],
    []
  );

  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Not logged in. Please sign in again.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/reports/list/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Unable to load reports");
        console.error(err);
      }
    };

    fetchReports();
  }, []);

  const assignOfficer = async (reportId: number, officerLabel: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              assigned_officer_label: officerLabel,
              status: r.status === "Resolved" || r.status === "Archived" ? r.status : "Assigned",
            }
          : r
      )
    );

    setSelectedReport((prev) =>
      prev && prev.id === reportId
        ? {
            ...prev,
            assigned_officer_label: officerLabel,
            status: prev.status === "Resolved" || prev.status === "Archived" ? prev.status : "Assigned",
          }
        : prev
    );

    toast.success(`Assigned to ${officerLabel}`);
  };

  return (
    <div className="reports-page">
      <div className="page-head">
        <div>
          <h1>Reports Management</h1>
        </div>
      </div>

      <div className="card">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Reporter</th>
              <th>Category</th>
              <th>Location</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Assigned Officer</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  No reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const status: ReportStatus = report.status ?? "Pending";
                const { date, time } = formatDateTime(report.created_at);

                return (
                  <tr key={report.id}>
                    <td className="table-id">#R-{report.id}</td>
                    <td>{report.user_label}</td>
                    <td>{reportCategoryLabel(report)}</td>
                    <td className="location-cell" title={report.location_display}>
                      {report.location_display || "-"}
                    </td>
                    <td>
                      <div className="dt">
                        <div className="dt-date">{date}</div>
                        <div className="dt-time">{time}</div>
                      </div>
                    </td>
                    <td>
                      <span className={badgeClass(status)}>{status}</span>
                    </td>
                    <td className="assigned">
                      {report.assigned_officer_label ? (
                        <span className="assigned-chip">{report.assigned_officer_label}</span>
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-btn"
                          title="View details"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          className="icon-btn assign"
                          title={report.assigned_officer_label ? "Reassign" : "Assign"}
                          onClick={() => {
                            const officer = officers[0];
                            assignOfficer(report.id, officer);
                          }}
                        >
                          {report.assigned_officer_label ? (
                            <RefreshCcw size={16} />
                          ) : (
                            <UserPlus size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer / Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">
                  Report #{selectedReport.id} • {reportCategoryLabel(selectedReport)}
                </div>
                <div className="modal-sub">
                  {selectedReport.user_label} •{" "}
                  {(selectedReport.status ?? "Pending") as ReportStatus}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedReport(null)} title="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="label">Location</div>
                  <div className="value">{selectedReport.location_display || "-"}</div>
                </div>

                <div className="detail-item">
                  <div className="label">Submitted</div>
                  <div className="value">
                    {formatDateTime(selectedReport.created_at).date}{" "}
                    {formatDateTime(selectedReport.created_at).time}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="label">Assigned Officer</div>
                  <div className="value">
                    {selectedReport.assigned_officer_label ?? "Unassigned"}
                  </div>
                </div>

                <div className="detail-item full">
                  <div className="label">Description</div>
                  <div className="value prewrap">{selectedReport.description || "-"}</div>
                </div>
              </div>

              <div className="assign-box">
                <div className="assign-label">Assign to LGU Officer</div>
                <div className="assign-row">
                  <select
                    className="select"
                    defaultValue=""
                    onChange={(e) => {
                      const officer = e.target.value;
                      if (!officer) return;
                      assignOfficer(selectedReport.id, officer);
                      e.currentTarget.value = "";
                    }}
                  >
                    <option value="" disabled>
                      Select officer...
                    </option>
                    {officers.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn"
                    onClick={() => {
                      const officer = officers[0];
                      assignOfficer(selectedReport.id, officer);
                    }}
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsMgmtPage;
