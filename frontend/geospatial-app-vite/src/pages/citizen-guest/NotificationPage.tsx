import { useMemo, useState, useEffect, useCallback } from "react";
// import { FaBullhorn, FaExclamationTriangle } from "react-icons/fa";
// import { MdReport, MdInfo } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import "./NotificationPage.css";

type NotificationType = "official" | "incident" | "report" | "verification";

type Severity = "low" | "moderate" | "high" | "critical";

type IncidentEvent =
    | "verified"
    | "severity_changed"
    | "resolved";


type ReportStatus = "pending" | "in_progress" | "needs_info" | "resolved" | "rejected";

type TimeFilter = "today" | "7days" | "all";

export interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    body?: string;
    timestamp?: string;
    isUnread: boolean;

    reportId?: number;
    reportCategory?: string;
    reportBarangay?: string;
    statusFrom?: ReportStatus;
    statusTo?: ReportStatus;
    officerMessage?: string;
    resolutionSummary?: string;
    rejectionReason?: string;

    // For incident
    incidentId?: number;
    barangay?: string;
    category?: string;
    severity?: Severity;
    severityFrom?: Severity;
    severityTo?: Severity;
    incidentEvent?: IncidentEvent;


    cmsGuideId?: number;
    cmsPostId?: string;
    createdAt?: number;
};

// const statusLabel: Record<ReportStatus, string> = {
//     pending: "Pending",
//     in_progress: "In Progress",
//     needs_info: "Needs Info",
//     resolved: "Resolved",
//     rejected: "Rejected",
// };

const timeAgo = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

const severityRank = {
    low: 1,
    moderate: 2,
    high: 3,
    critical: 4
};

const NotificationPage: React.FC = () => {
    const API_URL = import.meta.env.VITE_API_URL;

    const [receiveHazardAlerts, setReceiveHazardAlerts] = useState(true);
    const [receiveAnnouncements, setReceiveAnnouncements] = useState(true);
    const [alertSeverity, setAlertSeverity] = useState<Severity>("low");

    const [activeTab, setActiveTab] = useState<"all" | NotificationType>("all");
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("7days");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();


    // Load preferences from settings
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/me/`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`
                    }
                });

                if (!res.ok) return;

                const data = await res.json();

                setReceiveHazardAlerts(data.receive_hazard_alerts ?? true);
                setReceiveAnnouncements(data.receive_community_announcements ?? true);
                setAlertSeverity(data.alert_severity ?? "low");

            } catch (err) {
                console.error(err);
            }
        };

        fetchPreferences();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true)
                const res = await fetch(`${API_URL}/api/notifications/`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
                });
                const data = await res.json();

                // const recentOnly = data.filter((n: any) => {
                //     if (!n.created_at) return false;
                //     const created = new Date(n.created_at);
                //     const now = new Date();
                //     const diffMs = now.getTime() - created.getTime();
                //     const diffDays = diffMs / (1000 * 60 * 60 * 24);
                //     return diffDays <= 7;
                // });


                const mapped = data.map((n: any) => ({
                    id: String(n.id),
                    type: n.type,
                    title: n.title,
                    body: n.body,
                    createdAt: n.created_at ? new Date(n.created_at).getTime() : 0,
                    isUnread: !!n.is_unread,

                    reportId: n.report_id,
                    reportCategory: n.report_category,
                    reportBarangay: n.report_barangay,
                    statusFrom: n.status_from,
                    statusTo: n.status_to,
                    officerMessage: n.officer_message,
                    resolutionSummary: n.resolution_summary,
                    rejectionReason: n.rejection_reason,

                    cmsGuideId: n.cms_guide_id,
                    cmsPostId: n.cms_post_id,

                    incidentId: n.incident_id,
                    incidentEvent: n.event,
                    category: n.category,
                    severity: n.severity,
                    barangay: n.barangay,
                    severityFrom: n.severity_from,
                    severityTo: n.severity_to,
                }));

                mapped.sort((a: NotificationItem, b: NotificationItem) => b.createdAt! - a.createdAt!);

                setNotifications(mapped);
            } finally {
                setLoading(false);
            }
        })();
    }, []);


    const filteredNotifications = useMemo(() => {

        return notifications.filter(n => {

            if (!receiveHazardAlerts && n.type === "incident") return false;

            if (!receiveAnnouncements && n.type === "official") return false;

            if (n.type === "incident") {
                const sev = n.severityTo ?? n.severity ?? "low";
                return severityRank[sev] >= severityRank[alertSeverity];
            }

            return true;

        });

    }, [
        notifications,
        receiveHazardAlerts,
        receiveAnnouncements,
        alertSeverity
    ]);

    const counts = useMemo(() => {
        const filtered = filteredNotifications;

        const unreadAll = filtered.filter(n => n.isUnread).length;
        const unreadOfficial = filtered.filter(n => n.type === "official" && n.isUnread).length;
        const unreadIncident = filtered.filter(n => n.type === "incident" && n.isUnread).length;
        const unreadReport = filtered.filter(n => n.type === "report" && n.isUnread).length;

        return { unreadAll, unreadOfficial, unreadIncident, unreadReport };

    }, [filteredNotifications]);

    const listForPage = useMemo(() => {

        let base =
            activeTab === "all"
                ? filteredNotifications
                : filteredNotifications.filter(n => n.type === activeTab);

        const now = Date.now();

        base = base.filter(n => {

            if (!n.createdAt) return false;

            if (timeFilter === "all") return true;

            const diffDays = (now - n.createdAt) / (1000 * 60 * 60 * 24);

            if (timeFilter === "today") {
                const created = new Date(n.createdAt);
                const today = new Date();

                return (
                    created.getFullYear() === today.getFullYear() &&
                    created.getMonth() === today.getMonth() &&
                    created.getDate() === today.getDate()
                );
            }

            if (timeFilter === "7days") {
                return diffDays <= 7;
            }

            return true;

        });

        return base;

    }, [activeTab, filteredNotifications, timeFilter]);

    // const grouped = useMemo(() => {
    //     const official = notifications.filter(n => n.type === "official");
    //     const incident = notifications.filter(n => n.type === "incident");
    //     const report = notifications.filter(n => n.type === "report");
    //     return { official, incident, report };
    // }, [notifications]);

    // const filtered = useMemo(() => {
    //     if (activeTab === "all") return notifications;
    //     return notifications.filter(n => n.type === activeTab);
    // }, [activeTab, notifications]);

    // const sectionOrder: NotificationType[] = ["official", "incident", "report"];

    const sectionTitle: Record<NotificationType, string> = {
        official: "Official Announcements",
        incident: "Incident Reports",
        report: "Submitted Reports",
        verification: "Verification Updates",
    };

    // const incidentOnlyHighCritical = (list: NotificationItem[]) =>
    //     list.filter(n => {
    //         if (n.type !== "incident") return true;
    //         const current = n.severityTo ?? n.severity;
    //         return current === "high" || current === "critical";
    //     });

    const markOneAsRead = async (notificationId: string) => {
        setNotifications((prev) =>
            prev.map((x) => (x.id === notificationId ? { ...x, isUnread: false } : x))
        );

        try {
            await fetch(`${API_URL}/api/notifications/read/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ notification_id: notificationId }),
            });

            window.dispatchEvent(new Event("notificationsUpdated"));

        } catch { }
    };

    const openNotification = useCallback(async (n: NotificationItem) => {
        if (n.isUnread) {
            await markOneAsRead(n.id);
        }

        if (n.type == "official" && n.cmsGuideId) {
            navigate("/main/citizen/community-feed", { state: { openPostId: n.cmsGuideId } });
            return;
        }
        if (n.type === "incident" && n.incidentId) {
            navigate("/main/citizen/alerts-map", {
                state: { openIncidentId: n.incidentId }
            })
        }

        if (n.type === "report" && n.reportId) {
            navigate("/main/citizen/profile", {
                state: { openReportId: n.reportId }
            });
            return;
        }
        try {
            await fetch(`${API_URL}/api/notifications/read/all/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json",
                },
            });

            window.dispatchEvent(new Event("notificationsUpdated"));

        } catch { }
    }, [navigate]);


    const markAllAsRead = async () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, isUnread: false }))
        );

        try {
            await fetch(`${API_URL}/api/notifications/read/all/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json",
                },
            });

            window.dispatchEvent(new Event("notificationsUpdated"));

        } catch { }
    };


    // const isToday = (iso?: string) => {
    //     if (!iso) return false;
    //     const d = new Date(iso);
    //     const now = new Date();

    //     return (
    //         d.getFullYear() === now.getFullYear() &&
    //         d.getMonth() === now.getMonth() &&
    //         d.getDate() === now.getDate()
    //     );
    // };

    // const isAllEmpty =
    //     grouped.official.length === 0 &&
    //     incidentOnlyHighCritical(grouped.incident).length === 0 &&
    //     grouped.report.length === 0;

    return (
        <div className="notif-page">
            <div className="notif-header">
                {/* <div>
                    <h1>Notifications</h1>
                    <p className="notif-header-desc">Updates from LGU, verified hazards, and your report status.</p>
                </div> */}

                <div className="notif-actions">
                    <button
                        type="button"
                        className="notif-btn ghost"
                        onClick={markAllAsRead}
                        disabled={loading || notifications.every(n => !n.isUnread)}
                    >
                        Mark all as read
                    </button>
                </div>
                {/* Time Filter */}
                <div className="notif-time-filter">
                    <div
                        className={`dropdown ${isDropdownOpen ? "open" : ""}`}
                    >
                        <div
                            className="dropdown-selected"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDropdownOpen(prev => !prev);
                            }}
                        >
                            {timeFilter === "today" && "Today"}
                            {timeFilter === "7days" && "Last 7 Days"}
                            {timeFilter === "all" && "All Time"}
                            <span className="dropdown-arrow">▾</span>
                        </div>

                        {isDropdownOpen && (
                            <div className="dropdown-menu">
                                <div
                                    className="dropdown-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTimeFilter("today");
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    Today
                                </div>

                                <div
                                    className="dropdown-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTimeFilter("7days");
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    Last 7 Days
                                </div>

                                <div
                                    className="dropdown-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTimeFilter("all");
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    All Time
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Tabs */}
            <div className="notif-tabs">
                <button
                    className={`tab ${activeTab === "all" ? "active" : ""}`}
                    onClick={() => setActiveTab("all")}
                >
                    All
                    {counts.unreadAll > 0 && <span className="tab-badge">{counts.unreadAll}</span>}
                </button>

                {receiveAnnouncements && (
                    <button
                        className={`tab ${activeTab === "official" ? "active" : ""}`}
                        onClick={() => setActiveTab("official")}
                    >
                        Official
                        {counts.unreadOfficial > 0 && (
                            <span className="tab-badge">{counts.unreadOfficial}</span>
                        )}
                    </button>
                )}

                <button
                    className={`tab ${activeTab === "incident" ? "active" : ""}`}
                    onClick={() => setActiveTab("incident")}
                >
                    Incidents
                    {counts.unreadIncident > 0 && (
                        <span className="tab-badge">{counts.unreadIncident}</span>
                    )}
                </button>

                <button
                    className={`tab ${activeTab === "report" ? "active" : ""}`}
                    onClick={() => setActiveTab("report")}
                >
                    My Reports
                    {counts.unreadReport > 0 && (
                        <span className="tab-badge">{counts.unreadReport}</span>
                    )}
                </button>
            </div>


            {/* Content */}
            <div className="notif-content">
                {loading ? (
                    <LoadingState />
                ) : (
                    <div className="notif-section">
                        {activeTab !== "all" && (
                            <div className="notif-section-header">
                                <h2>{sectionTitle[activeTab]}</h2>
                                <span className="muted">{listForPage.length}</span>
                            </div>
                        )}

                        <div className="notif-list">
                            {listForPage.length === 0 ? (
                                <EmptyState />
                            ) : (
                                listForPage.map((n) => (
                                    <NotificationCard
                                        key={n.id}
                                        n={n}
                                        onOpen={() => openNotification(n)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

function formatIncidentLine(n: NotificationItem) {
    const capitalize = (s?: string) =>
        s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

    const extractBarangayCity = (full?: string) => {
        if (!full) return "";
        const parts = full.split(",").map(p => p.trim());

        if (parts.length >= 2) {
            const lastTwo = parts.slice(-2);
            return lastTwo.join(", ");
        }

        return full;
    };

    const barangay = n.barangay ? ` • ${extractBarangayCity(n.barangay)}` : "";

    const cat = n.category ?? n.title;

    if (n.incidentEvent === "severity_changed") {
        const from = capitalize(n.severityFrom);
        const to = capitalize(n.severityTo ?? n.severity);

        return {
            header: "Verified severity changed",
            sub: `${cat} (${from} → ${to})${barangay}`,
            pillSeverity: n.severityTo ?? n.severity ?? "high",
        };
    }

    if (n.incidentEvent === "resolved") {
        const category = capitalize(n.category ?? "Hazard");
        const severity = capitalize(n.severity ?? "High");

        return {
            header: `${category} has been resolved`,
            sub: `${severity}${barangay}`,
            pillSeverity: n.severity ?? "high",
        };
    }



    if (n.incidentEvent === "verified") {
        return {
            header: "Verified incident",
            sub: `${cat} (${capitalize(n.severity)})${barangay}`,
            pillSeverity: n.severity ?? "high",
        };
    }

    return {
        header: n.title,
        sub: n.body,
        pillSeverity: n.severity ?? "high",
    };
}


function NotificationCard({ n, onOpen }: { n: NotificationItem; onOpen?: () => void }) {
    const isIncident = n.type === "incident";
    const incidentUI = isIncident ? formatIncidentLine(n) : null;

    const isReport = n.type === "report";
    const reportUI = isReport ? formatReportLine(n) : null;

    const pill = (() => {
        if (n.type === "official") return <span className="pill pill-official">Official</span>
        if (n.type === "incident") {
            const sev = incidentUI?.pillSeverity ?? n.severity ?? "high";
            return <span className={`pill pill-${sev}`}>{sev.toUpperCase()}</span>;
        }
        if (n.type === "verification")
            return <span className="pill pill-verification">Verification</span>
        return <span className="pill pill-report">Report</span>
    })();


    const metaLine = (() => {
        if (n.type === "incident") {
            return <span className="meta"> {incidentUI?.header} </span>;
        }
        if (n.type === "report") {
            return <span className="meta"> {reportUI?.header} </span>;
        }
        return <span className="meta">{n.title}</span>;
    })();

    const detailLine = (() => {
        if (n.type == "incident") {
            return incidentUI?.sub;
        }
        if (n.type === "report") {
            return reportUI?.sub;
        }
        return n.body;
    })();

    function formatReportLine(n: NotificationItem) {
        const capitalize = (s?: string) =>
            s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
        const category = capitalize(n.reportCategory ?? "Report");
        const barangay = n.reportBarangay ? ` • ${n.reportBarangay}` : "";


        if (n.statusTo === "in_progress") {
            return {
                header: `${category}${barangay}`,
                sub: "An officer has started reviewing your report.",
            };
        }

        if (n.statusTo === "needs_info") {
            return {
                header: `${category}${barangay}`,
                sub: `Needs info: ${n.officerMessage ?? ""}`,
            };
        }

        if (n.statusTo === "resolved") {
            return {
                header: `${category}${barangay}`,
                sub: `Resolved: ${n.resolutionSummary ?? "The incident has been resolved."}`,
            };
        }

        if (n.statusTo === "rejected") {
            return {
                header: `${category}${barangay}`,
                sub: `Rejected: ${n.rejectionReason ?? ""}`,
            };
        }

        return {
            header: `${category}${barangay}`,
            sub: n.body
        };
    }

    return (
        <button
            type="button"
            className={`notif-card ${n.isUnread ? "unread" : ""}`}
            onClick={() => onOpen?.()}
            aria-label={`Open notification: ${n.title}`}>
            <div className="notif-card-left">
                {pill}
                <div className="notif-card-main">
                    {metaLine}
                    {detailLine && <div className="detail">{detailLine}</div>}
                    <div className="time">
                        {n.createdAt ? timeAgo(new Date(n.createdAt).toISOString()) : ""}
                    </div>
                </div>
            </div>


            <div className="notif-card-right">
                {n.isUnread && <span className="unread-dot" />}
                <span className="chev">›</span>
            </div>
        </button>
    );
}

function EmptyState() {
    return (
        <div className="notif-empty">
            <div className="notif-empty-card">
                <h3>No notifications</h3>
                <p>You're all caught up. New advisories and updates will appear here.</p>
            </div>
        </div>
    )
}

function LoadingState() {
    return (
        <div className="notif-list">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="notif-card skeleton">
                    <div className="skeleton-pill" />
                    <div className="skeleton-content">
                        <div className="skeleton-line short" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line tiny" />
                    </div>
                </div>
            ))}
        </div>
    );
}
export default NotificationPage;