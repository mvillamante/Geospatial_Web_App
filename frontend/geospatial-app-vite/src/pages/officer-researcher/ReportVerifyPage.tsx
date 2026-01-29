import React, { useEffect, useMemo, useState } from "react";
import "./ReportVerifyPage.css";
import {
  MapPin,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowRight,
  MessageSquareText,
  Filter,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { getUserRoleAndDisplayName } from "../../libr/auth";

type ReportCategory = "Fire" | "Flood" | "Landslide" | "Accident" | "Others";
type ReportStatus = "pending" | "in_progress" | "resolved" | "needs_info" | "rejected";
type RiskLevel = "low" | "moderate" | "high" | "critical";

interface CitizenReport {
  id: number;
  title: string;
  category: ReportCategory;

  // citizen suggested severity
  citizenRisk: RiskLevel;

  // officer verified severity (actual level)
  verifiedRisk?: RiskLevel;

  location: string;
  barangay: string;
  createdAt: string;
  reporterName: string;
  description: string;
  lat: number;
  lng: number;

  status: ReportStatus;
  assignedTo?: string;

  // visible update to citizen
  officerNote?: string;

  // for rejected/fake
  rejectionReason?: string;

  lastUpdatedAt: string;
}

const statusLabel: Record<ReportStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  needs_info: "Needs Info",
  rejected: "Rejected",
};

const riskOrder: Record<RiskLevel, number> = { critical: 4, high: 3, moderate: 2, low: 1 };

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusIcon(s: ReportStatus) {
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
}

type ModalType = "none" | "resolve" | "reject";

const ReportVerifyPage: React.FC = () => {
  const { displayName } = getUserRoleAndDisplayName();
  const officerName = `Officer ${displayName ?? ""}`.trim() || "Officer";

  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [selectedId, setSelectedId] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "all">("all");

  // sorting: newest, citizenRisk, effectiveRisk
  const [sortMode, setSortMode] = useState<"newest" | "citizenRisk" | "effectiveRisk">("effectiveRisk");

  // modals
  const [modal, setModal] = useState<ModalType>("none");
  const [resolveTitle, setResolveTitle] = useState("");
  const [resolveMessage, setResolveMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0],
    [reports, selectedId]
  );

  const effectiveRisk = (r: CitizenReport) => r.verifiedRisk ?? r.citizenRisk;

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

      if (sortMode === "citizenRisk") {
        const diff = riskOrder[b.citizenRisk] - riskOrder[a.citizenRisk];
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      // effectiveRisk
      const diff = riskOrder[effectiveRisk(b)] - riskOrder[effectiveRisk(a)];
      if (diff !== 0) return diff;
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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No access token found. Please login again.");

        const res = await fetch("http://localhost:8000/api/reports/queue/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Fetch failed (${res.status}): ${text}`);
        }

        const rawResponse = await res.json();
        console.log("RAW RESPONSE FROM BACKEND:", rawResponse);
        const raw = Array.isArray(rawResponse)
          ? rawResponse
          : rawResponse.results || [];

        const data: CitizenReport[] = raw.map((r: any) => ({
          ...r,
          lat: r.lat != null ? Number(r.lat) : 0,
          lng: r.lng != null ? Number(r.lng) : 0,
          barangay: r.barangay ?? r.location ?? "",
          lastUpdatedAt: r.lastUpdatedAt ?? r.createdAt,
        }));

        setReports(data);
        if (data.length) setSelectedId(data[0].id);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const setVerifiedRisk = (level: RiskLevel) => {
    if (!selected) return;
    updateReport(selected.id, { verifiedRisk: level });
  };

  const assignToMe = () => {
    if (!selected) return;
    updateReport(selected.id, { assignedTo: officerName });
  };

  const setStatus = (status: ReportStatus) => {
    if (!selected) return;

    const patch: Partial<CitizenReport> = { status };

    // auto assign when going in progress
    if (status === "in_progress" && !selected.assignedTo) patch.assignedTo = officerName;

    updateReport(selected.id, patch);
  };

  // Needs info: just set status + store note 
  const markNeedsInfo = () => {
    if (!selected) return;
    if (!selected.officerNote || selected.officerNote.trim().length < 3) {
      alert("Please type an update/request first (Needs Info message).");
      return;
    }
    setStatus("needs_info");
  };

  const openResolveModal = () => {
    if (!selected) return;

    // prefill a structured post template
    setResolveTitle(`Update: ${selected.title}`);
    setResolveMessage(
      `Status: RESOLVED\n\nWhat happened:\n- \n\nAction taken:\n- \n\nAdvisory to citizens:\n- \n`
    );
    setModal("resolve");
  };

  const confirmResolve = () => {
    if (!selected) return;

    const finalPost = `${resolveTitle}\n\n${resolveMessage}`.trim();
    if (finalPost.length < 10) {
      alert("Please write a short resolution update for citizens.");
      return;
    }

    updateReport(selected.id, {
      status: "resolved",
      officerNote: finalPost, // citizen-facing post
      rejectionReason: undefined,
    });

    setModal("none");
    setResolveTitle("");
    setResolveMessage("");
  };

  const openRejectModal = () => {
    if (!selected) return;
    setRejectReason(selected.rejectionReason ?? "");
    setModal("reject");
  };

  const confirmReject = () => {
    if (!selected) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      alert("Please provide a clear reason for rejection.");
      return;
    }

    updateReport(selected.id, {
      status: "rejected",
      rejectionReason: reason,
      officerNote: `Rejected: ${reason}`, // citizen-facing explanation
    });

    setModal("none");
    setRejectReason("");
  };

  const saveNeedsInfoNote = (note: string) => {
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
      <div className="reportverify-stat-container">
        <div className="reportverify-stat-card">
          <div className="reportverify-stat-text">
            <h3>Total Reports</h3>
            <p className="reportverify-card-value">{stats.total}</p>
          </div>
          <MapPin className="reportverify-card-icon" />
        </div>

        <div className="reportverify-stat-card">
          <div className="reportverify-stat-text">
            <h3>Pending Review</h3>
            <p className="reportverify-card-value">{stats.pending}</p>
          </div>
          <Users className="reportverify-card-icon" />
        </div>

        <div className="reportverify-stat-card">
          <div className="reportverify-stat-text">
            <h3>In Progress</h3>
            <p className="reportverify-card-value">{stats.inProgress}</p>
          </div>
          <Users className="reportverify-card-icon" />
        </div>

        <div className="reportverify-stat-card">
          <div className="reportverify-stat-text">
            <h3>Resolved</h3>
            <p className="reportverify-card-value">{stats.resolved}</p>
          </div>
          <CheckCircle2 className="reportverify-card-icon" />
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
                  <option value="effectiveRisk">Sort: Effective Risk (True)</option>
                  <option value="citizenRisk">Sort: Citizen Suggested Risk</option>
                  <option value="newest">Sort: Newest</option>
                </select>
              </div>
            </div>
          </div>

          <ul className="queue-list">
            {filtered.map((r) => {
              const active = r.id === selectedId;
              const eff = effectiveRisk(r);
              return (
                <li
                  key={r.id}
                  className={`queue-item ${active ? "active" : ""} risk-${eff}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="queue-item-top">
                    <div className="queue-title">{r.title}</div>
                    <div className={`queue-risk-pill ${eff}`}>{eff.toUpperCase()}</div>
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
          {loading ? (
            <div className="panel-loading">Loading report…</div>
          ) : error ? (
            <div className="panel-error">Error: {error}</div>
          ) : selected ? (
            <>
              <div className="detail-head">
                <div className="detail-title-wrap">
                  <h2 className="detail-title">{selected.title}</h2>

                  {/* show effective risk, but also allow officer to change verified risk */}
                  <div className="detail-riskWrap">
                    <div className="detail-riskLine">
                      <span className="detail-riskLabel">Effective:</span>
                      <span className={`detail-riskPill ${effectiveRisk(selected)}`}>
                        {effectiveRisk(selected).toUpperCase()}
                      </span>
                    </div>

                    <div className="detail-riskLine">
                      <span className="detail-riskLabel">Citizen:</span>
                      <span className={`detail-riskPill subtle ${selected.citizenRisk}`}>
                        {selected.citizenRisk.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-subline">
                  <span className="detail-chip">{selected.category}</span>
                  <span className="detail-chip subtle">{selected.barangay}</span>
                  <span className="detail-chip subtle">ID #{selected.id}</span>
                </div>
              </div>

              {/* officer verified risk control */}
              <div className="detail-block">
                <div className="detail-label-block">Verified Criticality (Actual Level)</div>
                <div className="risk-control">
                  <ShieldCheck className="risk-control-icon" />
                  <select
                    value={selected.verifiedRisk ?? ""}
                    onChange={(e) => setVerifiedRisk(e.target.value as RiskLevel)}
                  >
                    <option value="">Not yet verified</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="risk-hint">
                  Sorting uses <b>Effective Risk</b> = verified (if set) otherwise citizen suggestion.
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

              {/* assignment + workflow */}
              <div className="detail-block">
                <div className="detail-label-block">Officer Workflow</div>

                <div className="assign-row">
                  <div className="assign-left">
                    <div className="assign-title">Assigned Officer</div>
                    <div className="assign-value">{selected.assignedTo ?? "Unassigned"}</div>
                  </div>

                  <button
                    className="btn ghost"
                    onClick={assignToMe}
                    disabled={!!selected.assignedTo}
                    title={selected.assignedTo ? "Already assigned" : "Assign to yourself"}
                  >
                    <UserPlus className="btn-icon" />
                    Assign to me
                  </button>
                </div>

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
                  <button
                    className="btn primary"
                    onClick={() => setStatus("in_progress")}
                    disabled={selected.status === "in_progress" || selected.status === "resolved"}
                  >
                    Mark In Progress
                  </button>

                  <button className="btn success" onClick={openResolveModal} disabled={selected.status === "resolved"}>
                    Mark Resolved
                  </button>

                  <button className="btn warn" onClick={markNeedsInfo} disabled={selected.status === "resolved"}>
                    Needs Info
                  </button>

                  <button className="btn danger" onClick={openRejectModal} disabled={selected.status === "resolved"}>
                    Reject / Fake
                  </button>
                </div>

                {/* if rejected show reason */}
                {selected.status === "rejected" && selected.rejectionReason && (
                  <div className="reason-box">
                    <div className="reason-title">Rejection reason</div>
                    <div className="reason-text">{selected.rejectionReason}</div>
                  </div>
                )}
              </div>

              {/* Needs info message / update to citizen */}
              <div className="detail-block">
                <div className="detail-label-block">
                  Update / Message to Citizen {selected.status === "needs_info" ? "(Needs Info Sent)" : ""}
                </div>
                <textarea
                  className="note-area"
                  value={selected.officerNote ?? ""}
                  onChange={(e) => saveNeedsInfoNote(e.target.value)}
                  placeholder="Type an update for the citizen. If you click Needs Info, this message will be shown to them."
                />
                <div className="note-hint">
                  Use this for guidance (e.g., “Please send a clearer photo and confirm exact location.”) or for public updates.
                </div>
              </div>
            </>
          ) : (
            <div className="empty-detail">Select a report to review.</div>
          )}
        </aside>
      </div>

      {/* =======================
          MODALS
      ======================= */}
      {
        modal !== "none" && (
          <div className="modal-backdrop" onClick={() => setModal("none")}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              {modal === "resolve" && (
                <>
                  <div className="modal-title">Publish Resolution Update</div>
                  <div className="modal-sub">
                    This will be shown on the citizen side as the final resolution post.
                  </div>

                  <label className="modal-label">Post title</label>
                  <input
                    className="modal-input"
                    value={resolveTitle}
                    onChange={(e) => setResolveTitle(e.target.value)}
                    placeholder="e.g., Update: River Overflow near bridge"
                  />

                  <label className="modal-label">Post content</label>
                  <textarea
                    className="modal-textarea"
                    value={resolveMessage}
                    onChange={(e) => setResolveMessage(e.target.value)}
                  />

                  <div className="modal-actions">
                    <button className="btn ghost" onClick={() => setModal("none")}>
                      Cancel
                    </button>
                    <button className="btn success" onClick={confirmResolve}>
                      Publish & Mark Resolved
                    </button>
                  </div>
                </>
              )}

              {modal === "reject" && (
                <>
                  <div className="modal-title">Reject / Mark as Fake</div>
                  <div className="modal-sub">
                    Provide a reason. This will be shown to the citizen to prevent confusion and duplicates.
                  </div>

                  <label className="modal-label">Reason</label>
                  <textarea
                    className="modal-textarea"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Duplicate report. Incident already handled under Report #101."
                  />

                  <div className="modal-actions">
                    <button className="btn ghost" onClick={() => setModal("none")}>
                      Cancel
                    </button>
                    <button className="btn danger" onClick={confirmReject}>
                      Confirm Rejection
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ReportVerifyPage;
