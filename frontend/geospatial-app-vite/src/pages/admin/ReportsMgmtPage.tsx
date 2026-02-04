import { useEffect, useMemo, useState } from "react";
import { Eye, UserPlus, RefreshCcw, X } from "lucide-react";
import { FiUser, FiCheckCircle } from "react-icons/fi";
import { HiChevronUpDown, HiChevronDown, HiChevronUp } from "react-icons/hi2";
import { toast } from "sonner";
import "./ReportsMgmtPage.css";

import { getIncidentCategories } from "../../constants";
console.log("IT IS WORKING ",  getIncidentCategories() )

type ReportStatus =
  | "Pending"
  | "Assigned"
  | "In Progress"
  | "Verified"
  | "Rejected"
  | "Resolved"
  | "Archived";

const reportStatuses: ReportStatus[] = [
  "Pending",
  "Assigned",
  "In Progress",
  "Verified",
  "Rejected",
  "Resolved",
  "Archived",
];


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
    case "Rejected":
      return "badge rejected";
    case "Resolved":
      return "badge resolved";
    case "Archived":
      return "badge archived";
    case "In Progress":
      return "badge in_progress";
    default:
      return "badge";
  }
};

type ApiStatus =
  | "pending"
  | "in_progress"
  | "needs_info"
  | "rejected"
  | "resolved"
  | "archived"
  | "verified"
  | "assigned";

const normalizeStatus = (raw: any): ReportStatus => {
  const s = String(raw ?? "").toLowerCase();

  if (s === "pending") return "Pending";
  if (s === "in_progress" || s === "in progress") return "In Progress";
  if (s === "assigned") return "Assigned";
  if (s === "rejected") return "Rejected";
  if (s === "resolved") return "Resolved";
  if (s === "archived") return "Archived";

  return "Pending";
};

const ReportsMgmtPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const categories = useMemo(() => getIncidentCategories(), []);
  

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

  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const filteredReports = reports
  .filter((r) =>
    categoryFilter === "All"
      ? true
      : r.category.toLowerCase() === categoryFilter.toLowerCase() ||
        r.other_category?.toLowerCase() === categoryFilter.toLowerCase()
  )
  .filter((r) =>
    statusFilter === "All" ? true : normalizeStatus(r.status) === statusFilter
  )
  .sort((a, b) => {
    if (sortOrder === null) return 0;

    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();

    return sortOrder === "asc"
      ? aTime - bTime
      : bTime - aTime;
  });

  return (
    <div className="reports-page">
      <div className="page-head">
        <div>
          <h1>Reports Management</h1>
        </div>
      </div>

      {/* Filters + Search + Create User */}
      <div className="filters">
        <div className="filters-left">
          <div className="select-wrapper">
            <FiUser className="select-icon" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="role-select">
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="select-wrapper">
            <FiCheckCircle className="select-icon" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'All')} className="status-select">
              <option value="All">All Status</option>
              {reportStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
              <th onClick={toggleSort} className="sort-header">
                Submitted{" "}
                {sortOrder === "asc" ? (
                  <HiChevronUp />
                ) : sortOrder === "desc" ? (
                  <HiChevronDown />
                ) : (
                  <HiChevronUpDown />
                )}
              </th>
              <th>Status</th>
              <th>Assigned Officer</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  No reports found.
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const status = normalizeStatus(report.status);
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
                          onClick={() => {
                            const latest = reports.find(r => r.id === report.id) ?? report;
                            setSelectedReport(latest);
                          }}

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
