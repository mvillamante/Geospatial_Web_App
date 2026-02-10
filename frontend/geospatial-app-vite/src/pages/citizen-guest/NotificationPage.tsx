import { useMemo, useState, useEffect } from "react";
import { FaBullhorn, FaExclamationTriangle } from "react-icons/fa";
import { MdReport, MdInfo } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import "./NotificationPage.css";

type NotificationType = "official" | "incident" | "report";

type Severity = "low" | "moderate" | "high" | "critical";
type ReportStatus = "pending" | "in_progress" | "needs_info" | "resolved" | "rejected";

export interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    body?: string;
    timestamp?: string;
    isUnread: boolean;

    severity?: Severity;
    barangay?: string;
    statusFrom?: ReportStatus;
    statusTo?: ReportStatus;
    officerMessage?: string;
    resolutionSummary?: string;
    rejectReason?: string;

    cmsGuideId?: number;
    cmsPostId?: string;
    createdAt?: string;
};

const statusLabel: Record<ReportStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    needs_info: "Needs Info",
    resolved: "Resolved",
    rejected: "Rejected",
};

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

const NotificationPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"all" | NotificationType>("all");
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                setLoading(true)
                const res = await fetch("http://localhost:8000/api/notifications/", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
                });
                const data = await res.json();

                setNotifications(data.map((n: any) => ({
                    id: String(n.id),
                    type: n.type,
                    title: n.title,
                    body: n.body,
                    createdAt: n.created_at,
                    timestamp: n.created_at ? timeAgo(n.created_at) : "",
                    isUnread: !!n.is_unread,

                    severity: n.severity,
                    barangay: n.barangay,
                    statusFrom: n.status_from,
                    statusTo: n.status_to,
                    officerMessage: n.officer_message,
                    resolutionSummary: n.resolution_summary,
                    rejectReason: n.reject_reason,

                    cmsGuideId: n.cms_guide_id,
                    cmsPostId: n.cms_post_id,
                })));
            } finally {
                setLoading(false);
            }
        })();
    }, []);


    const counts = useMemo(() => {
        const unreadAll = notifications.filter(n => n.isUnread).length;
        const unreadOfficial = notifications.filter(n => n.type === "official" && n.isUnread).length;
        const unreadIncident = notifications.filter(n => n.type === "incident" && n.isUnread).length;
        const unreadReport = notifications.filter(n => n.type === "report" && n.isUnread).length;

        return { unreadAll, unreadOfficial, unreadIncident, unreadReport };
    }, [notifications]);

    const grouped = useMemo(() => {
        const official = notifications.filter(n => n.type === "official");
        const incident = notifications.filter(n => n.type === "incident");
        const report = notifications.filter(n => n.type === "report");
        return { official, incident, report };
    }, [notifications]);

    const filtered = useMemo(() => {
        if (activeTab === "all") return notifications;
        return notifications.filter(n => n.type === activeTab);
    }, [activeTab, notifications]);

    const sectionOrder: NotificationType[] = ["official", "incident", "report"];

    const sectionTitle: Record<NotificationType, string> = {
        official: "Official Posts",
        incident: "Verified Incident Alerts",
        report: "Report Status",
    };

    const incidentOnlyHighCritical = (list: NotificationItem[]) =>
        list.filter(n => n.type !== "incident" || (n.severity === "high" || n.severity === "critical"));

    const listForPage = activeTab === "all"
        ? incidentOnlyHighCritical(filtered)
        : incidentOnlyHighCritical(filtered);

    const openNotification = async (n: NotificationItem) => {
        if (n.isUnread) {
            await markOneAsRead(n.id);
        }

        if (n.type == "official" && n.cmsGuideId) {
            navigate("/main/citizen/community-feed", { state: { openPostId: n.cmsGuideId } });
            return;
        }
    }

    const markAllAsRead = async () => {
        setNotifications((prev) => prev.map((x) => ({ ...x, isUnread: false })));

        try {
            await fetch("http://localhost:8000/api/notifications/read/all/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json",
                },
            });
        } catch (e) {

        }
    };

    const markOneAsRead = async (notificationId: string) => {
        setNotifications((prev) =>
            prev.map((x) => (x.id === notificationId ? { ...x, isUnread: false } : x))
        );

        try {
            await fetch("http://localhost:8000/api/notifications/read/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ notification_id: notificationId }),
            });
        } catch (e) {

        };
    }

    return (
        <div className="notif-page">
            <div className="notif-header">
                <div>
                    <h1>Notifications</h1>
                    <p>Updates from LGU, verified hazards, and your report status.</p>
                </div>

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

                <button
                    className={`tab ${activeTab === "official" ? "active" : ""}`}
                    onClick={() => setActiveTab("official")}
                >
                    Official
                    {counts.unreadOfficial > 0 && <span className="tab-dot" />}
                </button>

                <button
                    className={`tab ${activeTab === "incident" ? "active" : ""}`}
                    onClick={() => setActiveTab("incident")}
                >
                    Incidents
                    {counts.unreadIncident > 0 && <span className="tab-dot" />}
                </button>

                <button
                    className={`tab ${activeTab === "report" ? "active" : ""}`}
                    onClick={() => setActiveTab("report")}
                >
                    Reports
                    {counts.unreadReport > 0 && <span className="tab-dot" />}
                </button>
            </div>

            {/* Content */}
            <div className="notif-content">
                {activeTab === "all" ? (
                    sectionOrder.map((section) => {
                        const sectionItems =
                            section === "official" ? grouped.official :
                                section === "incident" ? incidentOnlyHighCritical(grouped.incident) :
                                    grouped.report;

                        if (sectionItems.length === 0) return null;

                        return (
                            <div className="notif-section" key={section}>
                                <div className="notif-section-header">
                                    <h2>{sectionTitle[section]}</h2>
                                    <span className="muted">{sectionItems.length}</span>
                                </div>

                                <div className="notif-list">
                                    {sectionItems.map((n) => (
                                        <NotificationCard
                                            key={n.id}
                                            n={n}
                                            onOpen={() => openNotification(n)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="notif-section">
                        <div className="notif-section-header">
                            <h2>{sectionTitle[activeTab]}</h2>
                            <span className="muted">{listForPage.length}</span>
                        </div>

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

function NotificationCard({ n, onOpen }: { n: NotificationItem; onOpen?: () => void }) {
    const pill = (() => {
        if (n.type === "official") return <span className="pill pill-official">Official</span>
        if (n.type === "incident") {
            return (
                <span className={`pill pill-${n.severity || "high"}`}>
                    {n.severity ? n.severity.toUpperCase() : "INCIDENT"}
                </span>
            );
        }
        return <span className="pill pill-report">Report</span>
    })();


    const metaLine = (() => {
        if (n.type === "incident") {
            return (
                <span className="meta">
                    {n.title}
                    {n.barangay ? ` • Barangay ${n.barangay}` : ""}
                </span>
            );
        }
        if (n.type === "report" && n.statusFrom && n.statusTo) {
            return (
                <span className="meta">
                    {statusLabel[n.statusFrom]} → {statusLabel[n.statusTo]}
                </span>
            );
        }
        return <span className="meta">{n.title}</span>
    })();


    const detail = n.officerMessage || n.resolutionSummary || n.rejectReason || n.body;

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
                    {detail && <div className="detail">{detail}</div>}
                    <div className="time">{n.timestamp}</div>
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
export default NotificationPage;