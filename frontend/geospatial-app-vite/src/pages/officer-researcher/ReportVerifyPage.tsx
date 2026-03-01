import React, { useEffect, useMemo, useState } from "react";
import LeafletMap from "../../components/ui/LeafletMap";
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
import type { Report } from "../citizen-guest/AlertsComponents/AlertsPanel"

type ReportCategory =
  | "fire"
  | "flood"
  | "landslide"
  | "typhoon"
  | "earthquake"
  | "vehicular_accident"
  | "chemical_gas_leak"
  | "fallen_tree"
  | "infrastructure_damage"
  | "others";

const incidentTypeMap: Record<
  ReportCategory,
  Report["incident_type"]
> = {
  fire: "fire",
  flood: "flood",
  landslide: "landslide",
  typhoon: "typhoon",
  earthquake: "earthquake",
  vehicular_accident: "vehicular accident",
  chemical_gas_leak: "chemical / gas leak",
  fallen_tree: "fallen tree",
  infrastructure_damage: "infrastructure damage",
  others: "others",
};


type ReportStatus = "pending" | "in_progress" | "resolved" | "needs_info" | "rejected";
type RiskLevel = "low" | "moderate" | "high" | "critical";

interface CitizenReport {
  id: number;
  title: string;
  category: ReportCategory;
  citizenRisk: RiskLevel;
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
  assignedOfficerId?: number | null;
  officerNote?: string;
  needs_info_note?: string;
  rejection_reason?: string;
  lastUpdatedAt: string;
  photo_url?: string | null;
  reply_message?: string | null;
  reply_image_url?: string | null;

  lgu_post?: {
    what_happened?: string;
    action_taken?: string;
    advisory?: string;
    updated_at?: string;
  } | null;
}

// Report status
const statusLabel: Record<ReportStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  needs_info: "Needs Info",
  rejected: "Rejected",
};

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

  const normalizeRisk = (v: any): RiskLevel => {
    const s = String(v ?? "").toLowerCase();
    if (s === "low" || s === "moderate" || s === "high" || s === "critical") {
      return s as RiskLevel;
    }
    return "low";
  };

  const [whatHappened, setWhatHappened] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [advisory, setAdvisory] = useState("");


  const [scopeFilter, setScopeFilter] = useState<"all" | "mine" | "unassigned">("all");

  const { displayName, currentUserId } = getUserRoleAndDisplayName();
  const myOfficerId = currentUserId != null ? Number(currentUserId) : null;
  const officerName = `Officer ${displayName ?? ""}`.trim() || "Officer";

  const [needsInfoMode, setNeedsInfoMode] = useState(false);

  const riskOrder: Record<RiskLevel, number> = { critical: 4, high: 3, moderate: 2, low: 1 };

  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [selectedId, setSelectedId] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "all">("all");

  // sorting: newest, citizenRisk, effectiveRisk
  const [sortMode] = useState<"newest" | "citizenRisk" | "effectiveRisk">("effectiveRisk");

  // modals
  const [modal, setModal] = useState<ModalType>("none");
  // const [resolveTitle, setResolveTitle] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0],
    [reports, selectedId]
  );


  const selectedReportForMap = useMemo(() => {
    if (!selected) return null;

    return {
      id: selected.id,
      incident_type: incidentTypeMap[selected.category],
      verified_critical_level: selected.verifiedRisk ?? selected.citizenRisk,
      barangay: selected.barangay,
      created_at: selected.createdAt,
      latitude: selected.lat,
      longitude: selected.lng,
      status: selected.status,
      assigned_officer_id: selected.assignedOfficerId ?? null,
      lgu_post: selected.lgu_post ?? null,
    };
  }, [selected]);


  const isAssignedToMe =
    !!selected &&
    myOfficerId != null &&
    selected.assignedOfficerId != null &&
    Number(selected.assignedOfficerId) === myOfficerId;
  // const isAssignedToSomeone = !!selected && !!selected.assignedTo;

  const effectiveRisk = (r: CitizenReport) => r.verifiedRisk ?? r.citizenRisk;

  const isVerifiedSet = !!selected?.verifiedRisk;

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

      const matchesScope =
        scopeFilter === "all"
          ? true
          : scopeFilter === "mine"
            ? myOfficerId != null && r.assignedOfficerId != null && Number(r.assignedOfficerId) === Number(myOfficerId)
            : r.assignedOfficerId == null;

      return matchesQ && matchesStatus && matchesCategory && matchesScope;
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
  }, [reports, query, statusFilter, categoryFilter, sortMode, scopeFilter, myOfficerId]);

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

  // Patching of report
  async function patchReport(id: number, body: any) {
    const token = localStorage.getItem("access_token");
    const API_URL = import.meta.env.VITE_API_URL;

    const res = await fetch(`${API_URL}/api/reports/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log("PATCH RESPONSE:", await res.text());

      throw new Error(`Update failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  // Queue reports on the left
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No access token found. Please login again.");
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/api/reports/queue/`, {
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
          assignedOfficerId: r.assignedOfficerId != null ? Number(r.assignedOfficerId) : null,
          lat: r.lat != null ? Number(r.lat) : 0,
          lng: r.lng != null ? Number(r.lng) : 0,
          barangay: r.barangay ?? r.location ?? "",
          lastUpdatedAt: r.lastUpdatedAt ?? r.createdAt,
          photo_url: r.photo_url ?? r.photoUrl ?? r.photo ?? null,
          reply_message: r.reply_message ?? null,
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

  useEffect(() => {
    if (!selected) return;
  }, [selectedId, selected?.assignedOfficerId, currentUserId]);


  useEffect(() => {
    setNeedsInfoMode(false);
  }, [selectedId]);

  const setVerifiedRisk = async (level: RiskLevel) => {
    if (!selected) return;

    try {
      const updated = await patchReport(selected.id, { verifiedRisk: level });

      setReports(prev =>
        prev.map(r =>
          r.id === selected.id
            ? {
              ...r,
              ...updated,
              verifiedRisk: updated.verified_critical_level ?? level,
              lastUpdatedAt: updated.lastUpdatedAt ?? r.lastUpdatedAt,
            }
            : r
        )
      );
    } catch (e: any) {
      alert(e.message);
    }
  };


  // To assign a report
  const assignToMe = async () => {
    if (!selected) return;

    updateReport(selected.id, {
      assignedOfficerId: Number(myOfficerId),
      assignedTo: officerName,
    });

    try {
      const updated = await patchReport(selected.id, { assignToMe: true });
      console.log("ASSIGN RESPONSE:", updated);


      setReports(prev =>
        prev.map(r =>
          r.id === selected.id
            ? {
              ...r,
              ...updated,
              assignedOfficerId: Number(myOfficerId),
              assignedTo: updated.assignedTo ?? officerName
            }
            : r
        )
      );
    } catch (e: any) {
      alert(e.message);


      updateReport(selected.id, {
        assignedOfficerId: null,
        assignedTo: undefined,
        status: "pending",
      });
    }
  };


  // Save report status
  const setStatus = async (status: ReportStatus) => {
    if (!selected) return;

    try {
      const updated = await patchReport(selected.id, { status });
      console.log("PATCH RESPONSE:", updated);

      setReports(prev =>
        prev.map(r =>
          r.id === selected.id
            ? {
              ...r,
              ...updated,
              status: (updated.status ?? status) as ReportStatus,
              lastUpdatedAt: updated.lastUpdatedAt ?? r.lastUpdatedAt,
            }
            : r
        )
      );
    } catch (e: any) {
      alert(e.message);
    }
  };


  // // Needs info: just set status + store note 
  // const markNeedsInfo = () => {
  //   if (!selected) return;
  //   if (!selected.officerNote || selected.officerNote.trim().length < 3) {
  //     alert("Please type an update/request first (Needs Info message).");
  //     return;
  //   }
  //   setStatus("needs_info");
  // };

  const openResolveModal = () => {
    if (!selected) return;

    // prefill a structured post template
    // setResolveTitle(`Update: ${selected.title}`);
    setModal("resolve");
  };

  const confirmResolve = async () => {
    if (!selected) return;

    if (!whatHappened.trim() || !actionTaken.trim()) {
      alert("Please fill in What Happened and Action Taken.");
      return;
    }

    try {
      const updated = await patchReport(selected.id, {
        status: "resolved",
        lgu_post: {
          what_happened: whatHappened.trim(),
          action_taken: actionTaken.trim(),
          advisory: advisory.trim() || null,
        }
      });


      setReports(prev =>
        prev.map(r =>
          r.id === selected.id
            ? {
              ...r,
              ...updated,
              status: "resolved",
              lgu_post: updated.lgu_post,
              lastUpdatedAt: updated.lastUpdatedAt ?? r.lastUpdatedAt,
            }
            : r
        )
      );

      setModal("none");
      setWhatHappened("");
      setActionTaken("");
      setAdvisory("");

    } catch (e: any) {
      alert(e.message);
    }
  };



  const openRejectModal = () => {
    if (!selected) return;
    setRejectReason(selected.rejection_reason ?? "");
    setModal("reject");
  };

  const confirmReject = async () => {
    if (!selected) return;

    const reason = rejectReason.trim();
    if (reason.length < 5) {
      alert("Please provide a clear reason for rejection.");
      return;
    }

    try {
      const updated = await patchReport(selected.id, {
        status: "rejected",
        rejection_reason: reason,
        officer_note: `Rejected: ${reason}`,
      });

      setReports(prev =>
        prev.map(r =>
          r.id === selected.id
            ? {
              ...r,
              ...updated,
              status: "rejected",
              rejection_reason: updated.rejection_reason ?? reason,
              officerNote: updated.officer_note ?? `Rejected: ${reason}`,
              lastUpdatedAt: updated.lastUpdatedAt ?? r.lastUpdatedAt,
            }
            : r
        )
      );

      setModal("none");
      setRejectReason("");
    } catch (e: any) {
      alert(e.message);
    }
  };



  const saveNeedsInfoNote = (note: string) => {
    if (!selected) return;
    updateReport(selected.id, { needs_info_note: note });
  };

  return (
    <div className="reportverify-page">
      {/* Header */}
      {/* <div className="reportverify-header">
        <div className="reportverify-header-title">
          <h1>Report Verification</h1>
        </div>
        <p className="reportverify-header-desc">Review, validate, and update citizen hazard reports</p>
      </div> */}

      {/* Stats */}
      <div className="reportverify-stat-container">
        <div className="reportverify-stat-card total">
          <div className="reportverify-stat-text">
            <h3>Total Reports</h3>
            <p className="reportverify-card-value">{stats.total}</p>
          </div>
          <MapPin className="reportverify-card-icon" />
        </div>

        <div className="reportverify-stat-card pending">
          <div className="reportverify-stat-text">
            <h3>Pending Review</h3>
            <p className="reportverify-card-value">{stats.pending}</p>
          </div>
          <Users className="reportverify-card-icon" />
        </div>

        <div className="reportverify-stat-card progress">
          <div className="reportverify-stat-text">
            <h3>In Progress</h3>
            <p className="reportverify-card-value">{stats.inProgress}</p>
          </div>
          <Users className="reportverify-card-icon" />
        </div>

        <div className="reportverify-stat-card resolved">
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
                placeholder="Search barangay..."
              />
              <Search className="queue-search-icon" />
            </div>

            <div className="queue-filter has-icon">
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
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
              >
                <option value="all">All Categories</option>
                <option value="fire">Fire</option>
                <option value="flood">Flood</option>
                <option value="landslide">Landslide</option>
                <option value="typhoon">Typhoon</option>
                <option value="earthquake">Earthquake</option>
                <option value="vehicular_accident">Vehicular Accident</option>
                <option value="chemical_gas_leak">Chemical / Gas Leak</option>
                <option value="fallen_tree">Fallen Tree</option>
                <option value="infrastructure_damage">Infrastructure Damage</option>
              </select>
            </div>


            {/* <div className="queue-filter">
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)}>
                <option value="effectiveRisk">Sort: Effective Risk (True)</option>
                <option value="citizenRisk">Sort: Citizen Suggested Risk</option>
                <option value="newest">Sort: Newest</option>
              </select>
            </div> */}

            <div className="queue-filter">
              <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value as any)}>
                <option value="all">All Reports</option>
                <option value="mine">My Reports</option>
                <option value="unassigned">Unassigned</option>
              </select>
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
                    <div className={`queue-risk-pill ${normalizeRisk(eff)}`}>
                      {normalizeRisk(eff).toUpperCase()}
                    </div>

                  </div>

                  <div className="queue-sub">
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

        <section className="verify-map">
          <LeafletMap
            selectedReport={selectedReportForMap}
            activeLayers={["Verified Reports"]}
          />
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
                      {(() => {
                        const eff = effectiveRisk(selected);
                        return (
                          <span className={`detail-riskPill ${eff}`}>
                            {eff.toUpperCase()}
                          </span>
                        );
                      })()}

                    </div>

                    <div className="detail-riskLine">
                      <span className="detail-riskLabel">Citizen:</span>
                      {(() => {
                        const c = normalizeRisk(selected.citizenRisk);
                        return (
                          <span className={`detail-riskPill subtle ${c}`}>
                            {c.toUpperCase()}
                          </span>
                        );
                      })()}

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
                <div className="risk-control">
                  <ShieldCheck className="risk-control-icon" />
                  <select
                    value={selected.verifiedRisk ?? ""}
                    onChange={(e) => setVerifiedRisk(e.target.value as RiskLevel)}
                  >
                    <option value="" disabled>
                      Not yet verified
                    </option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {!isVerifiedSet && (
                  <div className="risk-required-hint">
                    Please set <b>Verified Criticality</b> before taking action.
                  </div>
                )}
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

              {selected.photo_url && (
                <div className="detail-block">
                  <div className="detail-label-block">Photo Evidence</div>
                  <img
                    className="detail-photo"
                    src={selected.photo_url}
                    alt={`Report #${selected.id} photo`}
                    loading="lazy"
                  />
                </div>
              )}


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
                  {(() => {
                    if (!selected) return null;

                    const stepStatus: "pending" | "in_progress" | "resolved" =
                      selected.status === "resolved"
                        ? "resolved"
                        : selected.status === "in_progress"
                          ? "in_progress"
                          : "pending";

                    return (
                      <>
                        <div className={`step ${stepStatus === "pending" ? "active" : "done"}`}>
                          <span className="step-dot" />
                          <span className="step-text">Pending</span>
                        </div>

                        <div
                          className={`step ${stepStatus === "in_progress"
                            ? "active"
                            : stepStatus === "resolved"
                              ? "done"
                              : ""
                            }`}
                        >
                          <span className="step-dot" />
                          <span className="step-text">In Progress</span>
                        </div>

                        <div className={`step ${stepStatus === "resolved" ? "active done" : ""}`}>
                          <span className="step-dot" />
                          <span className="step-text">Resolved</span>
                        </div>
                      </>
                    );
                  })()}
                </div>


                <div className="workflow-actions">
                  <button
                    className="btn primary"
                    onClick={() => setStatus("in_progress")}
                    disabled={!isAssignedToMe || !isVerifiedSet || selected.status === "in_progress" || selected.status === "resolved"}
                  >
                    Mark In Progress
                  </button>

                  <button
                    className="btn warn"
                    onClick={() => setNeedsInfoMode(true)}
                    disabled={!isAssignedToMe || !isVerifiedSet || selected.status === "resolved"}
                  >
                    Needs Info
                  </button>



                  <button
                    className="btn success"
                    onClick={openResolveModal}
                    disabled={!isAssignedToMe || !isVerifiedSet || selected.status === "resolved"}
                  >
                    Mark Resolved
                  </button>

                  <button
                    className="btn danger"
                    onClick={openRejectModal}
                    disabled={!isAssignedToMe || !isVerifiedSet || selected.status === "resolved"}
                  >
                    Reject / Fake
                  </button>

                </div>

                {/* if rejected show reason */}
                {selected.status === "rejected" && selected.rejection_reason && (
                  <div className="reason-box">
                    <div className="reason-title">Rejection reason</div>
                    <div className="reason-text">{selected.rejection_reason}</div>
                  </div>
                )}

                {/* Resolution Summary */}
                {selected.status === "resolved" && selected.lgu_post && (
                  <div className="resolution-container">
                    <div className="detail-block">
                      <div className="detail-label-block">Resolution Summary</div>

                      {selected.lgu_post.what_happened && (
                        <>
                          <div className="resolution-label">What Happened</div>
                          <div className="resolution-box">
                            {selected.lgu_post.what_happened}
                          </div>
                        </>
                      )}

                      {selected.lgu_post.action_taken && (
                        <>
                          <div className="resolution-label">Action Taken</div>
                          <div className="resolution-box">
                            {selected.lgu_post.action_taken}
                          </div>
                        </>
                      )}

                      {selected.lgu_post.advisory && (
                        <>
                          <div className="resolution-label">Advisory</div>
                          <div className="resolution-box advisory">
                            {selected.lgu_post.advisory}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Needs Info Conversation Container */}
              {selected.needs_info_note && !needsInfoMode && (
                <div className="needsinfo-container">

                  {/* Officer Note */}
                  {selected.needs_info_note && (
                    <div className="detail-block">
                      <div className="detail-label-block">Officer Note (Needs Info)</div>
                      <div className="needsinfo-note">
                        {selected.needs_info_note}
                      </div>
                    </div>
                  )}

                  {/* Citizen Reply */}
                  {(selected.reply_message || selected.reply_image_url) && (
                    <div className="detail-block">
                      <div className="detail-label-block">Citizen Reply</div>

                      <div className="citizen-reply-wrapper">
                        <div className="citizen-reply-box">
                          {selected.reply_message && <p className="reply-text">{selected.reply_message}</p>}
                          {selected.reply_image_url && (
                            <div className="reply-image-container">
                              <img src={selected.reply_image_url} alt="Reply" className="reply-image" />
                              <button
                                className="view-full-btn"
                                onClick={() => window.open(selected.reply_image_url!, "_blank")}
                              >
                                View Full
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Needs info message / update to citizen */}
              {(needsInfoMode) && (
                <div className="detail-block">
                  <div className="detail-label-block">
                    Update / Message to Citizen {selected.status === "needs_info" ? "(Needs Info Sent)" : ""}
                  </div>

                  {/* Officer note textarea */}
                  <textarea
                    className="note-area"
                    value={selected.needs_info_note ?? ""}
                    onChange={(e) => saveNeedsInfoNote(e.target.value)}
                    placeholder="Type an update for the citizen..."
                    disabled={!isAssignedToMe || (!needsInfoMode && selected.status !== "needs_info")}
                  />

                  <div className="note-hint">
                    Use this for guidance (e.g., “Please send a clearer photo and confirm exact location.”) or for public updates.
                  </div>

                  {/* Show Send button only when composing Needs Info */}
                  {isAssignedToMe && needsInfoMode && selected.status !== "resolved" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button className="btn ghost" onClick={() => setNeedsInfoMode(false)}>
                        Cancel
                      </button>

                      <button
                        className="btn warn"
                        onClick={async () => {
                          if (!selected.needs_info_note || selected.needs_info_note.trim().length < 3) {
                            alert("Please type an update/request first (Needs Info message).");
                            return;
                          }

                          try {
                            const updated = await patchReport(selected.id, {
                              status: "needs_info",
                              needs_info_note: selected.needs_info_note,
                            });

                            setReports(prev =>
                              prev.map(r =>
                                r.id === selected.id
                                  ? {
                                    ...r,
                                    ...updated,
                                    status: "needs_info",
                                    needs_info_note: updated.needs_info_note ?? selected.needs_info_note,
                                    lastUpdatedAt: updated.lastUpdatedAt ?? r.lastUpdatedAt,
                                  }
                                  : r
                              )
                            );

                            setNeedsInfoMode(false);
                          } catch (e: any) {
                            alert(e.message);
                          }
                        }}
                      >
                        Send Needs Info
                      </button>
                    </div>
                  )}


                </div>
              )}
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

                  <label className="modal-label">What Happened</label>
                  <textarea
                    className="modal-textarea"
                    value={whatHappened}
                    onChange={(e) => setWhatHappened(e.target.value)}
                    placeholder="Describe what happened..."
                  />

                  <label className="modal-label">Action Taken</label>
                  <textarea
                    className="modal-textarea"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="Describe actions taken..."
                  />

                  <label className="modal-label">Advisory to Citizens</label>
                  <textarea
                    className="modal-textarea"
                    value={advisory}
                    onChange={(e) => setAdvisory(e.target.value)}
                    placeholder="Optional advisory..."
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
