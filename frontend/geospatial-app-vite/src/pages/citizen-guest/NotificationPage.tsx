import { useMemo, useState, useEffect, useCallback } from "react";
// import { FaBullhorn, FaExclamationTriangle } from "react-icons/fa";
// import { MdReport, MdInfo } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import "./NotificationPage.css";
import { getUserRoleAndDisplayName } from "../../libr/auth";

type CitizenTab = "all" | "official" | "incident" | "report" | "verification";
type OfficerTab = "all" | "assigned" | "needs_info_reply";

type TabType = CitizenTab | OfficerTab;

type Severity = "low" | "moderate" | "high" | "critical";

type IncidentEvent =
    | "verified"
    | "severity_changed"
    | "resolved";


type ReportStatus = "pending" | "in_progress" | "needs_info" | "resolved" | "rejected" | "archived";

type TimeFilter = "today" | "7days" | "all";

type NotificationType =
    | "official"
    | "incident"
    | "report"
    | "verification"
    | "assigned"
    | "needs_info_reply";


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
    assignedOfficer?: string;
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

// const severityRank = {
//     low: 1,
//     moderate: 2,
//     high: 3,
//     critical: 4
// };

const NotificationPage: React.FC = () => {
    const API_URL = import.meta.env.VITE_API_URL;

    const [receiveHazardAlerts, setReceiveHazardAlerts] = useState(true);
    const [receiveAnnouncements, setReceiveAnnouncements] = useState(true);
    const [alertSeverity, setAlertSeverity] = useState<Severity>("low");

    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("7days");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const { userRole } = getUserRoleAndDisplayName();


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
                    assignedOfficer: n.assigned_officer,
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

        const role = userRole?.toLowerCase();
        return notifications.filter(n => {

            if (role === "citizen") {
                if (!receiveHazardAlerts && n.type === "incident") return false;
                if (!receiveAnnouncements && n.type === "official") return false;
                return true;
            }

            if (role === "officer") {
                return n.type === "assigned" || n.type === "needs_info_reply";
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
        const role = userRole?.toLowerCase();

        console.log("📦 RAW notifications:", notifications);
        console.log("👤 ROLE:", role);
        console.log("⚙️ Preferences:", {
            receiveHazardAlerts,
            receiveAnnouncements
        });

        let base = notifications;

        if (role === "citizen") {
            if (!receiveHazardAlerts) {
                base = base.filter(n => n.type !== "incident");
                console.log("🚫 After removing incidents:", base);
            }

            if (!receiveAnnouncements) {
                base = base.filter(n => n.type !== "official");
                console.log("🚫 After removing official:", base);
            }
        }

        if (role === "officer") {
            base = base.filter(n => n.type === "assigned" || n.type === "needs_info_reply");
            console.log("👮 Officer base (reports only):", base);
        }

        const unread = (list: NotificationItem[]) =>
            list.filter(n => n.isUnread).length;

        if (role === "citizen") {
            const official = base.filter(n => n.type === "official");
            const incident = base.filter(n => n.type === "incident");
            const report = base.filter(n => n.type === "report");

            const result = {
                unreadAll: unread(base),
                unreadOfficial: unread(official),
                unreadIncident: unread(incident),
                unreadReport: unread(report),
            };

            console.log("CITIZEN COUNTS:", result);

            return {
                unreadAll: unread(base),
                unreadOfficial: unread(official),
                unreadIncident: unread(incident),
                unreadReport: unread(report),
                unreadAssigned: 0,
                unreadReplies: 0,
            };
        }

        if (role === "officer") {
            const reports = base;

            const assigned = reports.filter(n => n.type === "assigned");

            const needs_info_reply = reports.filter(n => n.type === "needs_info_reply");

            const result = {
                unreadAll: unread(reports),
                unreadAssigned: unread(assigned),
                unreadReplies: unread(needs_info_reply),
            };

            console.log("Officer counts:", result);

            return result;
        }

        return {
            unreadAll: unread(base),
            unreadOfficial: 0,
            unreadIncident: 0,
            unreadReport: 0,
            unreadAssigned: 0,
            unreadReplies: 0,
        };

    }, [
        notifications,
        userRole,
        receiveHazardAlerts,
        receiveAnnouncements
    ]);

    const listForPage = useMemo(() => {

        // const role = userRole?.toLowerCase();
        let base = filteredNotifications;

        if (activeTab !== "all") {
            base = base.filter(n => n.type === activeTab);
        }

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

    }, [activeTab, filteredNotifications, timeFilter, userRole]);

    useEffect(() => {
        console.log("Active Tab:", activeTab);
        console.log("Notifications being shown:", listForPage);
    }, [activeTab, listForPage]);

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

    // ROLE-BASED TABS AND TITLES ------------------------------------------
    const citizenTabTitles: Record<Exclude<CitizenTab, "all">, string> = {
        official: "Official Announcements",
        incident: "Incident Reports",
        report: "Submitted Reports",
        verification: "Verification Updates",
    };

    const officerTabTitles: Record<Exclude<OfficerTab, "all">, string> = {
        assigned: "Assigned Reports",
        needs_info_reply: "Needs Info Replies",
    };

    const availableTabs = useMemo(() => {
        const role = userRole?.toLowerCase();

        if (role === "officer") {
            return [
                { key: "all", label: "All", badgeCount: counts.unreadAll },
                { key: "assigned", label: "Assigned Reports", badgeCount: 0 },
                { key: "needs_info_reply", label: "Needs Info Replies", badgeCount: 0 },
            ];
        }

        if (role === "citizen") {
            return [
                { key: "all", label: "All", badgeCount: counts.unreadAll },

                ...(receiveAnnouncements
                    ? [{ key: "official", label: "Official", badgeCount: counts.unreadOfficial }]
                    : []),

                { key: "incident", label: "Incidents", badgeCount: counts.unreadIncident },
                { key: "report", label: "My Reports", badgeCount: counts.unreadReport },
            ];
        }

        // fallback
        return [{ key: "all", label: "All", badgeCount: counts.unreadAll }];
    }, [
        userRole,
        receiveAnnouncements,
        counts.unreadAll,
        counts.unreadOfficial,
        counts.unreadIncident,
        counts.unreadReport
    ]);

    const sectionHeaderTitle = useMemo(() => {
        if (userRole === "Officer") {
            return officerTabTitles[activeTab as Exclude<OfficerTab, "all">];
        }

        if (activeTab === "all") return null;

        return citizenTabTitles[activeTab as Exclude<CitizenTab, "all">];
    }, [activeTab, userRole]);

    useEffect(() => {
        if (userRole === "Officer") setActiveTab("all");
        if (userRole === "Citizen") setActiveTab("all");
    }, [userRole]);

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

        if (n.type === "assigned" || n.type === "needs_info_reply") {
            if (n.reportId) {
                navigate("/main/officer/report-verify", {
                    state: { openReportId: n.reportId }
                });
            }
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
                {availableTabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`tab ${activeTab === tab.key ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.key as TabType)}
                    >
                        {tab.label}

                        {tab.badgeCount > 0 && (
                            <span className="tab-badge">{tab.badgeCount}</span>
                        )}
                    </button>
                ))}
            </div>


            {/* Content */}
            <div className="notif-content">
                {loading ? (
                    <LoadingState />
                ) : (
                    <div className="notif-section">
                        {activeTab !== "all" && (
                            <div className="notif-section-header">
                                <h2>{sectionHeaderTitle}</h2>
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
                                        userRole={userRole}
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


function NotificationCard({ n, userRole, onOpen }: { n: NotificationItem; userRole?: string; onOpen?: () => void }) {
    const isIncident = n.type === "incident";
    const incidentUI = isIncident ? formatIncidentLine(n) : null;

    const isReport = n.type === "report";
    const reportUI = isReport ? formatReportLine(n, userRole) : null;

    const pill = (() => {
        if (n.type === "official") return <span className="pill pill-official">Official</span>
        if (n.type === "incident") {
            const sev = incidentUI?.pillSeverity ?? n.severity ?? "high";
            return <span className={`pill pill-${sev}`}>{sev.toUpperCase()}</span>;
        }
        if (n.type === "verification")
            return <span className="pill pill-verification">Verification</span>
        if (n.type === "assigned")
            return <span className="pill pill-report">Assignation</span>
        if (n.type === "needs_info_reply")
            return <span className="pill pill-report">Need Info</span>
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

    function formatReportLine(n: NotificationItem, userRole?: string) {
        const capitalize = (s?: string) =>
            s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

        const category = capitalize(n.reportCategory ?? "Report");
        const barangay = n.reportBarangay ? ` • ${n.reportBarangay}` : "";
        const header = `${category}${barangay}`;

        const isOfficer = userRole?.toLowerCase() === "officer";


        if (isOfficer && n.type === "assigned") {
            return {
                header,
                sub: n.body ?? "You have been assigned a new report.",
            };
        }

        if (isOfficer && n.type === "needs_info_reply") {
            return {
                header,
                sub: "Citizen replied to your request for more information."
            };
        }

        const status = n.statusTo;

        const citizenMessages: Record<string, string> = {
            pending: "Your report has been submitted and is waiting for LGU verification.",
            in_progress: "An officer has started reviewing your report.",
            needs_info: `Needs info: ${n.officerMessage ?? ""}`,
            resolved: `Resolved: ${n.resolutionSummary ?? "The incident has been resolved."}`,
            archived: "The incident report has been archived.",
            rejected: `Rejected: ${n.rejectionReason ?? ""}`,
        };

        const message =
            isOfficer
                ? n.body ??
                n.title ??
                "Report update."
                : (status ? citizenMessages[status] : undefined) ??
                n.body ??
                n.title ??
                "";

        return { header, sub: message };
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