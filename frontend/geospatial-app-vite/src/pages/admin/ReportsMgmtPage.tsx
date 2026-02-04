import { useEffect, useMemo, useState } from "react";
import { Eye, UserPlus, RefreshCcw, X } from "lucide-react";
import { FiUser, FiCheckCircle } from "react-icons/fi";
import { HiChevronUpDown, HiChevronDown, HiChevronUp } from "react-icons/hi2";
import { toast } from "sonner";
import "./ReportsMgmtPage.css";

import { getIncidentCategories } from "../../constants";
console.log("IT IS WORKING ", getIncidentCategories())

type ReportStatus =
  | "Pending"
  | "In Progress"
  | "Rejected"
  | "Resolved"

const reportStatuses: ReportStatus[] = [
  "Pending",
  "In Progress",
  "Rejected",
  "Resolved",
];

type Officer = {
  id: number;
  label: string;
}


interface Report {
  id: number;
  user_label: string;
  category: string;
  other_category?: string | null;
  location_display: string;
  created_at: string;
  description: string;
  verified_critical_level?: string | null;
  status?: ReportStatus;
  assigned_officer_label?: string | null;
  assigned_officer_id?: number | null;
  photo_url?: string | null;
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

const criticalBadgeClass = (level?: string | null) => {
  const l = String(level ?? "").toLowerCase();

  switch (l) {
    case "low":
      return "critical-badge low";
    case "moderate":
      return "critical-badge moderate";
    case "high":
      return "critical-badge high";
    case "critical":
      return "critical-badge critical";
    default:
      return "critical-badge none";
  }
};

type ApiStatus =
  | "pending"
  | "in_progress"
  | "needs_info"
  | "rejected"
  | "resolved"
  | "archived"
  | "verified";

const normalizeStatus = (raw: any): ReportStatus => {
  const s = String(raw ?? "").toLowerCase();

  if (s === "pending") return "Pending";
  if (s === "in_progress" || s === "in progress") return "In Progress";
  if (s === "rejected") return "Rejected";
  if (s === "resolved") return "Resolved";
  if (s === "archived") return "Archived";

  return "Pending";
};

const ReportsMgmtPage: React.FC = () => {
  const [viewArchived, setViewArchived] = useState(false);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);


  const categories = useMemo(() => getIncidentCategories(), []);


  useEffect(() => {
    const fetchOfficers = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        setLoadingOfficers(true);
        const res = await fetch(`${API_BASE}/api/reports/list/officers/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`)
        }

        const data = await res.json();
        setOfficers(Array.isArray(data) ? data : []);

      } catch (err) {
        console.error(err);
        toast.error("Unable to load officers");
        setOfficers([]);
      } finally {
        setLoadingOfficers(false);
      }
    };

    fetchOfficers();
  }, []);

  const includes = (value: any, q: string) =>
    String(value ?? "").toLowerCase().includes(q);

  const openDetails = (report: Report) => {
    const latest = reports.find((r) => r.id === report.id) ?? report;
    setSelectedReport(latest);
  };



  const archiveReport = async (reportId: number) => {
    try {
      const updated = await patchReport(reportId, { status: "archived" });

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, ...updated } : r))
      );

      setSelectedReport((prev) =>
        prev && prev.id === reportId ? { ...prev, ...updated } : prev
      );

      toast.success(`Report #R-${reportId} archived`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to archive report");
    }
  };


  useEffect(() => {
    const onDocClick = () => setOpenMenuId(null);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

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

  async function patchReport(reportId: number, body: any) {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/reports/${reportId}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    return res.json();
  }


  const assignOfficer = async (reportId: number, officerId: number) => {
    try {
      const updated = await patchReport(reportId, { officer_id: officerId });

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, ...updated } : r))
      );

      setSelectedReport((prev) =>
        prev && prev.id === reportId ? { ...prev, ...updated } : prev
      );

      setSelectedOfficer(updated.assigned_officer_id ? String(updated.assigned_officer_id) : "");

      toast.success(updated.assigned_officer_label ? `Assigned to ${updated.assigned_officer_label}` : "Assigned");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to assign officer");
    }
  };



  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const filteredReports = reports
    .filter((r) => {
      const isArchived = normalizeStatus(r.status) === "Archived";
      return viewArchived ? isArchived : !isArchived;
    })
    .filter((r) =>
      categoryFilter === "All"
        ? true
        : r.category.toLowerCase() === categoryFilter.toLowerCase() ||
        r.other_category?.toLowerCase() === categoryFilter.toLowerCase()
    )
    .filter((r) =>
      statusFilter === "All" ? true : normalizeStatus(r.status) === statusFilter
    )
    .filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        includes(r.id, q) ||
        includes(r.user_label, q) ||
        includes(reportCategoryLabel(r), q) ||
        includes(r.location_display, q) ||
        includes(r.description, q) ||
        includes(r.assigned_officer_label, q)
      );
    })
    .sort((a, b) => {
      if (sortOrder === null) return 0;

      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();

      return sortOrder === "asc"
        ? aTime - bTime
        : bTime - aTime;
    });


  return (
    <div className="reportsmgmt-page">
      <div className="page-head">
        <div>
          <h1>Reports Management</h1>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className={`tab-btn ${!viewArchived ? "active" : ""}`}
            onClick={() => setViewArchived(false)}
          >
            Active
          </button>
          <button
            type="button"
            className={`tab-btn ${viewArchived ? "active" : ""}`}
            onClick={() => setViewArchived(true)}
          >
            Archived
          </button>
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

        <div className="filters-right">
          <div className="search-box">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              placeholder="Search report id, reporter, location, category..."
            />
            {searchQuery.trim() && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear"
                type="button"
              >x</button>
            )}
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
              <th>Critical Level</th>
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
                const isArchived = normalizeStatus(report.status) === "Archived";
                const { date, time } = formatDateTime(report.created_at);

                return (
                  <tr key={report.id}>
                    <td className="table-id">#R-0{report.id}</td>
                    <td>{report.user_label}</td>
                    <td className="table-category">{reportCategoryLabel(report)}</td>
                    <td>
                      {report.verified_critical_level ? (
                        <span className={criticalBadgeClass(report.verified_critical_level)}>
                          {report.verified_critical_level}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
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
                      <div className="row-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="kebab-btn"
                          aria-label="Actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === report.id ? null : report.id));
                          }}
                        >...</button>

                        {openMenuId === report.id && (
                          <div className="kebab-dropdown">
                            <button
                              type="button"
                              className="kebab-item"
                              onClick={() => {
                                setOpenMenuId(null)
                                const latest = reports.find(r => r.id === report.id) ?? report;
                                setSelectedReport(latest);
                                setSelectedOfficer(latest.assigned_officer_id ? String(latest.assigned_officer_id) : "");


                              }}
                            >View Full Details
                            </button>


                            <button
                              type="button"
                              className="kebab-item danger"
                              onClick={() => {
                                setOpenMenuId(null);
                                setConfirmArchiveId(report.id);
                              }}
                              disabled={isArchived}
                            >
                              Archive
                            </button>


                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {confirmArchiveId !== null && (
        <div className="modal-overlay" onClick={() => setConfirmArchiveId(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">Archive report?</div>
            <div className="confirm-text">
              This will archive the report and remove it from the list.
            </div>

            <div className="confirm-actions">
              <button
                className="btn secondary"
                type="button"
                onClick={() => setConfirmArchiveId(null)}
              >
                Cancel
              </button>

              <button
                className="btn danger"
                type="button"
                onClick={async () => {
                  const id = confirmArchiveId;
                  setConfirmArchiveId(null);
                  await archiveReport(id);
                }}
              >
                Yes, Archive
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Drawer / Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => {
          setSelectedReport(null);
          setSelectedOfficer("");
          setOpenMenuId(null);
        }}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
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
              <button className="icon-btn" onClick={() => { setSelectedReport(null); setSelectedOfficer(""); }} title="Close">
                <X size={16} />
              </button>
            </div>

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
                      {formatDateTime(selectedReport.created_at).date}{" "}
                      {formatDateTime(selectedReport.created_at).time}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="label">Verified Critical Level</div>
                    <div className="value">
                      {selectedReport.verified_critical_level ? (
                        <span className={criticalBadgeClass(selectedReport.verified_critical_level)}>
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
                  <div className="value prewrap">
                    {selectedReport.description || "-"}
                  </div>
                </div>

                {selectedReport.photo_url && (
                  <div className="modal-photo">
                    <img
                      src={selectedReport.photo_url}
                      alt="Incident"
                      className="report-photo"
                    />
                  </div>
                )}
              </div>


              <div className="assign-box">
                <div className="assign-label">Assign to LGU Officer</div>
                <div className="assign-row">
                  <select
                    className="select"
                    value={selectedOfficer}
                    onChange={(e) => setSelectedOfficer(e.target.value)}
                  >
                    <option value="" disabled>Select Officer..</option>

                    {officers.map((o) => (
                      <option key={o.id} value={String(o.id)}>
                        {o.label}
                      </option>
                    ))}
                  </select>



                  <button
                    className="btn"
                    disabled={viewArchived}
                    onClick={() => {
                      if (!selectedOfficer) {
                        toast.error("Please select an officer.");
                        return;
                      }
                      const idNum = Number(selectedOfficer);
                      if (!idNum) {
                        toast.error("Please select an officer.");
                        return;
                      }
                      assignOfficer(selectedReport.id, idNum);

                    }}
                  >
                    {selectedReport.assigned_officer_label ? "Reassign" : "Assign"}
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
