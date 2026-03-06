import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { X, MapPin, Users, CheckCircle2 } from "lucide-react";
import { FiUser, FiCheckCircle, FiSearch } from "react-icons/fi";
import { HiChevronUpDown, HiChevronDown, HiChevronUp } from "react-icons/hi2";
import { HiOutlineTable, HiOutlineMap } from "react-icons/hi";
import { toast } from "sonner";
import "./ReportsMgmtPage.css";

import LeafletMap from "../../components/ui/LeafletMap";
import { getIncidentCategories, getIncidentLabel, type IncidentCategories } from "../../constants"
import Pagination from "../../components/ui/Pagination";

type ReportStatus =
  | "Pending"
  | "In Progress"
  | "Rejected"
  | "Resolved"
  | "Archived"
  | "Critical";

const reportStatuses: ReportStatus[] = [
  "Pending",
  "In Progress",
  "Rejected",
  "Resolved",
  "Archived",
];

type Officer = {
  id: number;
  label: string;
  department_id: number;
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
  department_id?: number | null;
  photo_url?: string | null;
  
}


const API_URL = import.meta.env.VITE_API_URL;

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

const normalizeStatus = (raw: any): ReportStatus => {
  const s = String(raw ?? "").toLowerCase();

  if (s === "pending") return "Pending";
  if (s === "in_progress" || s === "in progress") return "In Progress";
  if (s === "rejected") return "Rejected";
  if (s === "resolved") return "Resolved";
  if (s === "archived") return "Archived";
  if (s === "critical") return "Critical";

  return "Pending";
};



const ReportsMgmtPage: React.FC = () => {
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const updatePageSize = () => {
      setPageSize(window.innerHeight <= 800 ? 6 : 10);
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);

    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  const [currentPage, setCurrentPage] = useState(1);

  const [viewArchived, setViewArchived] = useState(false);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [openMapMenuId, setOpenMapMenuId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedReportMap, setSelectedReportMap] = useState<Report | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<IncidentCategories | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const [reportTimeFilter, setReportTimeFilter] = useState<"today" | "7days" | "last30days" | "last12months" | "all">("all");
  const categories = useMemo(() => getIncidentCategories(), []);

  const selectedReportForMap = useMemo<ReportMapPreview | null>(() => {
    if (!selectedReportMap) return null;

    return {
      ...selectedReportMap,
      incident_type:
        selectedReportMap.category === "others" && selectedReportMap.other_category?.trim()
          ? selectedReportMap.other_category
          : selectedReportMap.category,

      verified_critical_level:
        selectedReportMap.verified_critical_level ?? null,

      status: normalizeStatus(selectedReportMap.status),

      assigned_officer_id: selectedReportMap.assigned_officer_id ?? null,
    };
  }, [selectedReportMap]);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    setViewArchived(tab === "archived");

    const status = searchParams.get("status");
    if (status && ["Pending", "In Progress", "Rejected", "Resolved", "Archived"].includes(status)) {
      setStatusFilter(status as any);
    }
  }, [searchParams]);


  useEffect(() => {
    const fetchOfficers = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        setLoadingOfficers(true);
        const res = await fetch(`${API_URL}/api/reports/list/officers/`, {
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
    const onDocClick = () => setOpenMapMenuId(null);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, sortOrder, viewArchived]);

  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Not logged in. Please sign in again.");
        setLoadingReports(false);
        return;
      }

      try {
        setLoadingReports(true);
        const res = await fetch(`${API_URL}/api/reports/list/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
        setCurrentPage(1);
      } catch (err) {
        toast.error("Unable to load reports");
        console.error(err);
        setReports([]);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReports();
  }, []);

  async function patchReport(reportId: number, body: any) {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_URL}/api/reports/${reportId}/`, {
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
      const updated = await patchReport(reportId, { assigned_officer: officerId });

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

  const now = new Date();
  const matchesTimeFilter = (dateString: string) => {
    if (reportTimeFilter === "all") return true;

    const reportDate = new Date(dateString);
    const diffMs = now.getTime() - reportDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (reportTimeFilter) {
      case "today":
        return reportDate.toDateString() === now.toDateString();
      case "7days":
        return diffDays <= 7;
      case "last30days":
        return diffDays <= 30;
      case "last12months":
        return diffDays <= 365;
      default:
        return true;
    }
  };

  const filteredReports = reports
    .filter((r) => {
      const isArchived = normalizeStatus(r.status) === "Archived";
      return viewArchived ? isArchived : !isArchived;
    })
    .filter((r) =>
      categoryFilter === "all"
        ? true
        : r.category.toLowerCase() === categoryFilter.toLowerCase() ||
        r.other_category?.toLowerCase() === categoryFilter.toLowerCase()
    )
    .filter((r) =>
      statusFilter === "All" ? true : normalizeStatus(r.status) === statusFilter
    )
    .filter((r) => matchesTimeFilter(r.created_at))
    .filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        includes(r.id, q) ||
        includes(r.user_label, q) ||
        includes(r.category, q) ||
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
  const totalPages = Math.ceil(filteredReports.length / pageSize);

  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const reportStats = useMemo(() => {
    const base = filteredReports;

    return {
      total: base.length,
      pending: base.filter(r => normalizeStatus(r.status) === "Pending").length,
      inProgress: base.filter(r => normalizeStatus(r.status) === "In Progress").length,
      resolved: base.filter(r => normalizeStatus(r.status) === "Resolved").length,
    };
  }, [filteredReports]);

  /* PAGINATION */
  const handlePageChange = (page: number) => { if (page < 1 || page > totalPages) return; setCurrentPage(page); };

  /* Tabs */
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const activeTabRef = (isArchived: boolean) => (el: HTMLButtonElement | null) => {
    tabRefs.current[isArchived ? "archived" : "active"] = el;
  };

  const [indicatorWidth, setIndicatorWidth] = useState(0);
  const [indicatorOffset, setIndicatorOffset] = useState(0);

  useEffect(() => {
    const activeKey = viewArchived ? "archived" : "active";
    const el = tabRefs.current[activeKey];
    if (el) {
      const parentLeft = el.parentElement?.getBoundingClientRect().left || 0;
      const rect = el.getBoundingClientRect();
      setIndicatorWidth(rect.width);
      setIndicatorOffset(rect.left - parentLeft);
    }
  }, [viewArchived]);

  /* Loading */
  const [loadingReports, setLoadingReports] = useState(true);
  const [viewMode, setViewMode] = useState("table");

  return (
    <div className="reportsmgmt-page">
      <div className="page-head">

        <div className="view-toggle">
          <button
            className={`icon-toggle ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <HiOutlineTable />
            <span className="view-toggle-text">Table View</span>
          </button>

          <button
            className={`icon-toggle ${viewMode === "map" ? "active" : ""}`}
            onClick={() => {
              setViewMode("map");
              setViewArchived(false);
            }}
          >
            <HiOutlineMap />
            <span className="view-toggle-text">Map View</span>
          </button>

        </div>
      </div>

      {/* Filters + Search + Create User */}
      <div className="filters">
        <div className="filters-left">
          <div className="select-wrapper">
            <FiUser className="select-icon" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as IncidentCategories | "all")} className="role-select">
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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

          {viewMode === "map" && (
            <div className="select-wrapper">
              <FiCheckCircle className="select-icon" />
              <select value={reportTimeFilter} onChange={(e) =>
                    setReportTimeFilter(
                      e.target.value as
                        | "today"
                        | "7days"
                        | "last30days"
                        | "last12months"
                        | "all"
                    )
                  } 
                className="status-select">

                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="last12months">Last 12 Months</option>
              </select>
            </div>
          )}

          {( searchQuery || categoryFilter !== "all" || statusFilter !== "All" || reportTimeFilter !== "all" ||sortOrder !== null) && (
            <button
              className="clear-filter-btn"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                setStatusFilter("All");
                setReportTimeFilter("all");
                setSortOrder(null);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="filters-right">
          {viewMode === "table" && (
            <div className="page-actions">
              <div
                className="tab-indicator"
                ref={indicatorRef}
                style={{
                  width: indicatorWidth,
                  transform: `translateX(${indicatorOffset}px)`
                }}
              />
              <button
                type="button"
                className={`tab-btn ${!viewArchived ? "active" : ""}`}
                onClick={() => setViewArchived(false)}
                ref={activeTabRef(false)}
              >
                Active
              </button>
              <button
                type="button"
                className={`tab-btn ${viewArchived ? "active" : ""}`}
                onClick={() => setViewArchived(true)}
                ref={activeTabRef(true)}
              >
                Archived
              </button>
            </div>
          )}
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              placeholder="Search by report id, reporter, location...."
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

      {viewMode === "map" && (
        <div className="map-view-wrapper">

          <div className="map-stats-wrapper">
            <div className="map-container">
              <LeafletMap
                selectedReport={selectedReportForMap}
                categoryFilter={categoryFilter}
                reportTimeFilter={reportTimeFilter}
                activeLayers={["Verified Reports"]}
              />
            </div>
            
            {/* Stats */}
            <div className="report-stat-container">
              <div className="report-stat-card total">
                <div className="report-stat-text">
                  <h3>Total Reports</h3>
                  <p className="report-card-value">{reportStats.total}</p>
                </div>
                <MapPin className="report-card-icon" />
              </div>

              <div className="report-stat-card pending">
                <div className="report-stat-text">
                  <h3>Pending Review</h3>
                  <p className="report-card-value">{reportStats.pending}</p>
                </div>
                <Users className="report-card-icon" />
              </div>

              <div className="report-stat-card progress">
                <div className="report-stat-text">
                  <h3>In Progress</h3>
                  <p className="report-card-value">{reportStats.inProgress}</p>
                </div>
                <Users className="report-card-icon" />
              </div>

              <div className="report-stat-card resolved">
                <div className="report-stat-text">
                  <h3>Resolved</h3>
                  <p className="report-card-value">{reportStats.resolved}</p>
                </div>
                <CheckCircle2 className="report-card-icon" />
              </div>
            </div>
          </div>

          <div className="mini-table-wrapper">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Reporter</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loadingReports ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Loading Reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={5  } className="empty">
                      No Reports Found.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const status = normalizeStatus(report.status);
                    const isArchived = normalizeStatus(report.status) === "Archived";
                    console.log("rah", report);
                    return (
                      <tr key={report.id} onClick={() => setSelectedReportMap(report)} title="Click to navigate to pin">
                        <td className="center">#R-0{report.id}</td>
                        <td className="center">{report.user_label}</td>
                        <td className="muted text-wrap">{getIncidentLabel(report.category as IncidentCategories)}</td>

                        <td className="center">
                          <span className={badgeClass(status)}>{status}</span>
                        </td>

                        <td className="center">
                          <div className="row-menu" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="kebab-btn"
                              aria-label="Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMapMenuId((prev) => (prev === report.id ? null : report.id));
                              }}
                            >...</button>

                            {openMapMenuId === report.id && (
                              <div className="kebab-dropdown">
                                <button
                                  className="dropdown-item view-details"
                                  onClick={() => {
                                    setOpenMapMenuId(null)
                                    const latest = reports.find(r => r.id === report.id) ?? report;
                                    setSelectedReport(latest);
                                    setSelectedOfficer(latest.assigned_officer_id ? String(latest.assigned_officer_id) : "");


                                  }}
                                >View Full Details
                                </button>

                                {/*<button
                                  className="dropdown-item view-details"
                                  onClick={async () => {
                                    setOpenMapMenuId(null);

                                    try {
                                      const updated = await patchReport(report.id, {
                                        verified_critical_level: "Critical"
                                      });

                                      setReports(prev =>
                                        prev.map(r =>
                                          r.id === report.id ? { ...r, ...updated } : r
                                        )
                                      );

                                      toast.success("Report escalated to Critical status");

                                    } catch (err: any) {
                                      console.error(err);
                                      toast.error(err?.message || "Failed to escalate report");
                                    }
                                  }}
                                >
                                  Escalate
                                </button>*/}

                                <button
                                  className="dropdown-item view-details danger"
                                  onClick={() => {
                                    setOpenMapMenuId(null);
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


        </div>
      )}

      {viewMode === "table" && (
        <>
          <div className="reports-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="center">Report ID</th>
                  <th className="center">Reporter</th>
                  <th className="center">Category</th>
                  <th className="center">Location</th>
                  <th onClick={toggleSort} className="sort-header center">
                    Submitted{" "}
                    {sortOrder === "asc" ? (
                      <HiChevronUp />
                    ) : sortOrder === "desc" ? (
                      <HiChevronDown />
                    ) : (
                      <HiChevronUpDown />
                    )}
                  </th>
                  <th className="center">Critical Level</th>
                  <th className="center">Status</th>
                  <th className="center">Assigned Officer</th>
                  <th className="th-actions center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loadingReports ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      Loading Reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      No Reports Found.
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => {
                    const status = normalizeStatus(report.status);
                    const isArchived = normalizeStatus(report.status) === "Archived";
                    const { date, time } = formatDateTime(report.created_at);

                    return (
                      <tr key={report.id}>
                        <td className="table-id center">#R-0{report.id}</td>
                        <td className="center">{report.user_label}</td>
                        <td className="table-category center muted">{getIncidentLabel(report.category as IncidentCategories)}</td>
                        <td className="location-cell center" title={report.location_display}>
                          {report.location_display || "-"}
                        </td>
                        <td>
                          <div className="dt center">
                            <div className="dt-date">{date}</div>
                            <div className="dt-time muted">{time}</div>
                          </div>
                        </td>
                        <td className="center">
                          {report.verified_critical_level ? (
                            <span className={`severity-tag ${report.verified_critical_level}`}>
                              {report.verified_critical_level.toUpperCase()}
                            </span>
                          ) : "---"}
                        </td>
                        <td className="center">
                          <span className={badgeClass(status)}>{status}</span>
                        </td>
                        <td className="assigned center">
                          {report.assigned_officer_label ? (
                            <span className="assigned-chip">{report.assigned_officer_label}</span>
                          ) : (
                            <span className="muted">Unassigned</span>
                          )}
                        </td>

                        <td className="center">
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
                                  className="dropdown-item view-details"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    const latest = reports.find(r => r.id === report.id) ?? report;
                                    setSelectedReport(latest);
                                    setSelectedOfficer(latest.assigned_officer_id ? String(latest.assigned_officer_id) : "");


                                  }}
                                >View Full Details
                                </button>

                                <button
                                  className="dropdown-item view-details"
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    toast.warning("Escalate this report?", {
                                      action: {
                                        label: "Confirm",
                                        onClick: async () => {
                                          try {
                                            const updated = await patchReport(report.id, {
                                              verifiedRisk: "critical"
                                            });

                                            setReports(prev =>
                                              prev.map(r =>
                                                r.id === report.id
                                                  ? {
                                                      ...r,
                                                      ...updated,
                                                      lastUpdatedAt: new Date().toISOString()
                                                    }
                                                  : r
                                              )
                                            );

                                            setLoadingReports(true);
                                            toast.success("Report escalated to Critical status");
                                            setLoadingReports(false);

                                          } catch (err: any) {
                                            console.error(err);
                                            toast.error(err?.message || "Failed to escalate report");
                                          }
                                        }
                                      },
                                      cancel: {
                                        label: "Cancel",
                                        onClick: () => { }
                                      }
                                    });
                                  }}
                                >
                                  Escalate
                                </button>

                                <button
                                  className="dropdown-item view-details danger"
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

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
                  Report #{selectedReport.id} • {getIncidentLabel(selectedReport.category as IncidentCategories)}
                </div>
                <div className="modal-sub">
                  {selectedReport.user_label} •{" "}
                  {(selectedReport.status ?? "Pending") as ReportStatus}
                </div>
              </div>
              <button className="icon-btn" onClick={() => { setSelectedReport(null); setSelectedOfficer(""); setOpenMenuId(null); }} title="Close">
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
                    disabled={loadingOfficers}
                  >
                    <option value="" disabled>
                      {loadingOfficers ? "Loading officers..." : "Select Officer.."}
                    </option>

                    {officers
                      .filter(o => o.department_id === selectedReport.department_id)
                      .map((o) => (
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
