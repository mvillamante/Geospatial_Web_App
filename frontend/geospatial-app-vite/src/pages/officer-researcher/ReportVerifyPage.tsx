import React, { useMemo, useState } from "react";
import "./ReportVerifyPage.css";
import { MapPin, Users, Search, CheckCircle2, XCircle, Clock3, ArrowRight, MessageSquareText, Filter } from "lucide-react";
import { getUserRoleAndDisplayName } from "../../libr/auth";

type ReportCategory = "Fire" | "Flood" | "Landslide" | "Accident";
type ReportStatus = "pending" | "in_progress" | "resolved" | "needs_info" | "rejected";
type RiskLevel = "low" | "moderate" | "high" | "critical";

interface CitizenReport {
  id: number;
  title: string;
  category: ReportCategory;
  risk: RiskLevel;
  location: string;
  barangay: string;
  createdAt: string; 
  reporterName: string;
  description: string;
  lat: number;
  lng: number;

  status: ReportStatus;
  assignedTo?: string;
  officerNote?: string;
  lastUpdatedAt: string; 
}

const statusLabel: Record<ReportStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  needs_info: "Needs Info",
  rejected: "Rejected",
};

const statusIcon = (s: ReportStatus) => {
  switch (s) {
    case "pending":
      return <Clock3 className="status-icon pending" />;
    case "in_progress":
      return <ArrowRight className="status-icon inprogress" />;
    case "resolved":
      return <CheckCircle2 className="status-icon resolved" />;
    case "needs_info":
      return <MessageSquareText className="status-icon needsinfo" />;
    case "rejected":
      return <XCircle className="status-icon rejected" />;
  }
};

const mockReports: CitizenReport[] = [
  {
    id: 101,
    title: "River Overflow near bridge",
    category: "Flood",
    risk: "high",
    location: "Near bridge, Barangay Banay-Banay",
    barangay: "Banay-Banay",
    createdAt: "2026-01-20T02:15:00Z",
    reporterName: "Juan Dela Cruz",
    description: "Water rising quickly, road passable but getting worse. Please advise.",
    lat: 14.2456,
    lng: 121.1158,
    status: "pending",
    lastUpdatedAt: "2026-01-20T02:15:00Z",
  },
  {
    id: 102,
    title: "Residential Fire reported",
    category: "Fire",
    risk: "critical",
    location: "Purok 2, Barangay San Isidro",
    barangay: "San Isidro",
    createdAt: "2026-01-20T01:40:00Z",
    reporterName: "Maria Santos",
    description: "Smoke visible, flames spreading. Neighbors evacuating.",
    lat: 14.2715,
    lng: 121.1240,
    status: "in_progress",
    assignedTo: "Officer Hopps",
    officerNote: "Dispatched BFP + barangay responders. Monitoring updates.",
    lastUpdatedAt: "2026-01-20T02:05:00Z",
  },
  {
    id: 102,
    title: "Residential Fire reported",
    category: "Fire",
    risk: "low",
    location: "Purok 2, Barangay San Isidro",
    barangay: "San Isidro",
    createdAt: "2026-01-20T01:40:00Z",
    reporterName: "Maria Santos",
    description: "Smoke visible, flames spreading. Neighbors evacuating.",
    lat: 14.2715,
    lng: 121.1240,
    status: "in_progress",
    assignedTo: "Officer Hopps",
    officerNote: "Dispatched BFP + barangay responders. Monitoring updates.",
    lastUpdatedAt: "2026-01-20T02:05:00Z",
  },
  {
    id: 103,
    title: "Minor road accident",
    category: "Accident",
    risk: "moderate",
    location: "Highway shoulder, Barangay Pulo",
    barangay: "Pulo",
    createdAt: "2026-01-19T23:20:00Z",
    reporterName: "Anonymous",
    description: "Two motorcycles involved. Traffic slow but moving.",
    lat: 14.2280,
    lng: 121.1320,
    status: "resolved",
    officerNote: "Cleared; EMS checked victims. Traffic normalized.",
    lastUpdatedAt: "2026-01-20T00:10:00Z",
  },
];

const riskOrder: Record<RiskLevel, number> = { critical: 4, high: 3, moderate: 2, low: 1 };

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const ReportVerifyPage: React.FC = () => {
  const { userRole, displayName } = getUserRoleAndDisplayName();

  const [reports, setReports] = useState<CitizenReport[]>(mockReports);
  const [selectedId, setSelectedId] = useState<number>(mockReports[0]?.id ?? 0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "all">("all");
  const [sortMode, setSortMode] = useState<"newest" | "risk">("risk");

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0],
    [reports, selectedId]
  );

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === "pending").length;
    const inProgress = reports.filter((r) => r.status === "in_progress").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    return { total, pending, inProgress, resolved };
  }, [reports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = reports.filter((r) => {
      const matchesQ =
        q === "" ||
        r.title.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.barangay.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;

      return matchesQ && matchesStatus && matchesCategory;
    });

    list = [...list].sort((a, b) => {
      if (sortMode === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const riskDiff = riskOrder[b.risk] - riskOrder[a.risk];
      if (riskDiff !== 0) return riskDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [reports, query, statusFilter, categoryFilter, sortMode]);

  const updateReport = (id: number, patch: Partial<CitizenReport>) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
            ...r,
            ...patch,
            lastUpdatedAt: new Date().toISOString(),
          }
          : r
      )
    );
  };


  const setStatus = (status: ReportStatus) => {
    if (!selected) return;
    const patch: Partial<CitizenReport> = { status };
    // Basic workflow helpers
    if (status === "in_progress" && !selected.assignedTo) patch.assignedTo = `Officer ${displayName ?? ""}`.trim() || "Officer";
    updateReport(selected.id, patch);
  };

  const saveNote = (note: string) => {
    if (!selected) return;
    updateReport(selected.id, { officerNote: note });
  };


  return (
    <div className="reportverify-page">
      {/* Header */}
      <div className="reportverify-header">
        <div className="reportverify-header-title">
          <MapPin className="reportverify-title-icon" />
          <h1>Report Verification</h1>
        </div>
        <p className="reportverify-header-desc">Review, validate, and update citizen hazard reports</p>
      </div>

      {/* Stats */}
      <div className="evac-stat-container">
        <div className="evac-stat-card evac-stat-primary">
          <div className="evac-stat-text">
            <h3>Total Reports</h3>
            <p className="evac-card-value">{stats.total}</p>
          </div>
          <MapPin className="evac-card-icon" />
        </div>

        <div className="evac-stat-card evac-stat-secondary">
          <div className="evac-stat-text">
            <h3>Pending Review</h3>
            <p className="evac-card-value">{stats.pending}</p>
          </div>
          <Users className="evac-card-icon" />
        </div>

        <div className="evac-stat-card evac-stat-primary">
          <div className="evac-stat-text">
            <h3>In Progress</h3>
            <p className="evac-card-value">{stats.inProgress}</p>
          </div>
          <Users className="evac-card-icon" />
        </div>

        <div className="evac-stat-card evac-stat-secondary">
          <div className="evac-stat-text">
            <h3>Resolved</h3>
            <p className="evac-card-value">{stats.resolved}</p>
          </div>
          <CheckCircle2 className="evac-card-icon" />
        </div>
      </div>

      {/* Main layout */}
      <div className="verify-layout">
        {/* Left: Queue */}
        <section className="verify-queue">
          <div className="queue-toolbar">
            <div className="queue-search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, barangay, location, reporter..."
              />
              <Search className="queue-search-icon" />
            </div>

            <div className="queue-filters">
              <div className="queue-filter">
                <Filter className="queue-filter-icon" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="needs_info">Needs Info</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="queue-filter">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)}>
                  <option value="all">All Categories</option>
                  <option value="Fire">Fire</option>
                  <option value="Flood">Flood</option>
                  <option value="Landslide">Landslide</option>
                  <option value="Accident">Accident</option>
                </select>
              </div>

              <div className="queue-filter">
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)}>
                  <option value="risk">Sort: Risk</option>
                  <option value="newest">Sort: Newest</option>
                </select>
              </div>
            </div>
          </div>

          <ul className="queue-list">
            {filtered.map((r) => {
              const active = r.id === selectedId;
              return (
                <li
                  key={r.id}
                  className={`queue-item ${active ? "active" : ""} risk-${r.risk}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="queue-item-top">
                    <div className="queue-title">{r.title}</div>
                    <div className={`queue-risk-pill ${r.risk}`}>{r.risk.toUpperCase()}</div>
                  </div>

                  <div className="queue-sub">
                    <span className="queue-badge">{r.category}</span>
                    <span className="queue-dot">•</span>
                    <span className="queue-location">{r.barangay}</span>
                  </div>

                  <div className="queue-meta">
                    <div className={`queue-status ${r.status}`}>
                      {statusIcon(r.status)}
                      <span>{statusLabel[r.status]}</span>
                    </div>
                    <span className="queue-time">{formatTime(r.createdAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right: Detail / Workflow */}
        <aside className="verify-detail">
          {selected ? (
            <>
              <div className="detail-head">
                <div className="detail-title-wrap">
                  <h2 className="detail-title">{selected.title}</h2>
                  <div className={`detail-risk ${selected.risk}`}>{selected.risk.toUpperCase()}</div>
                </div>

                <div className="detail-subline">
                  <span className="detail-chip">{selected.category}</span>
                  <span className="detail-chip subtle">{selected.barangay}</span>
                  <span className="detail-chip subtle">ID #{selected.id}</span>
                </div>
              </div>

              <div className="detail-block">
                <div className="detail-row">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{selected.location}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reporter</span>
                  <span className="detail-value">{selected.reporterName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Submitted</span>
                  <span className="detail-value">{formatTime(selected.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{formatTime(selected.lastUpdatedAt)}</span>
                </div>
              </div>

              <div className="detail-block">
                <div className="detail-label-block">Citizen Description</div>
                <p className="detail-desc">{selected.description}</p>
              </div>

              {/* Workflow controls */}
              <div className="detail-block">
                <div className="detail-label-block">Officer Workflow</div>

                <div className="workflow-steps">
                  <div className={`step ${selected.status === "pending" ? "active" : selected.status !== "pending" ? "done" : ""}`}>
                    <span className="step-dot" />
                    <span className="step-text">Pending</span>
                  </div>
                  <div className={`step ${selected.status === "in_progress" ? "active" : selected.status === "resolved" ? "done" : ""}`}>
                    <span className="step-dot" />
                    <span className="step-text">In Progress</span>
                  </div>
                  <div className={`step ${selected.status === "resolved" ? "active done" : ""}`}>
                    <span className="step-dot" />
                    <span className="step-text">Resolved</span>
                  </div>
                </div>

                <div className="workflow-actions">

                  <button className="btn primary" onClick={() => setStatus("in_progress")} disabled={selected.status === "in_progress" || selected.status === "resolved"}>
                    Mark In Progress
                  </button>

                  <button className="btn success" onClick={() => setStatus("resolved")} disabled={selected.status === "resolved"}>
                    Mark Resolved
                  </button>

                  <button className="btn warn" onClick={() => setStatus("needs_info")} disabled={selected.status === "resolved"}>
                    Needs Info
                  </button>

                  <button className="btn danger" onClick={() => setStatus("rejected")} disabled={selected.status === "resolved"}>
                    Reject
                  </button>
                </div>
              </div>

              <div className="detail-block">
                <div className="detail-label-block">Update / Note to Citizen</div>
                <textarea
                  className="note-area"
                  value={selected.officerNote ?? ""}
                  onChange={(e) => saveNote(e.target.value)}
                  placeholder="Type your update. This can be shown to citizens (e.g., 'Responders dispatched, please avoid the area')."
                />
              </div>
            </>
          ) : (
            <div className="empty-detail">Select a report to review.</div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ReportVerifyPage;
