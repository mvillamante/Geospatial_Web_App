import { useState, useMemo, useRef, useEffect } from "react";
import { Search } from 'lucide-react';
import { addOfflineReport } from "../../../services/offlineReportsDB";
import { useofflineReports } from "../../../hooks/useOfflineReports";


export interface Report {
    id: number;

    category: string;
    category_display?: string;
    other_category?: string;

    verified_critical_level: "low" | "moderate" | "high" | "critical";

    location_display: string;

    created_at: string;

    lat: number;
    lng: number;

    status?: string;
    assigned_officer_id?: number | null;

    lgu_post?: {
        what_happened?: string;
        action_taken?: string;
        advisory?: string;
        updated_at?: string;
    } | null;
}

interface AlertsPanelProps {
    onReport: () => void;
    onSelectReport?: (report: Report) => void;
    onBarangaySearch?: (barangay: string, severity: string | null) => void;
    initialOpenIncidentId?: number;
    isVerified: boolean | null;
    userBarangay: string;
    isVerificationLoading?: boolean;
    reportTimeFilter: "today" | "7days" | "last30days" | "last12months" | "all";
    setReportTimeFilter: React.Dispatch<React.SetStateAction<"today" | "7days" | "last30days" | "last12months" | "all">>;
    onCollapsePanel?: () => void;
    reports: Report[];
    isLoadingReports?: boolean;
    onRefreshReports?: () => void;
}

export default function AlertsPanel({
    onReport,
    onSelectReport,
    initialOpenIncidentId,
    isVerified,
    userBarangay,
    isVerificationLoading,
    reportTimeFilter,
    setReportTimeFilter,
    onCollapsePanel,
    reports,
    isLoadingReports,
    onRefreshReports
}: AlertsPanelProps) {

    const offlineReports = useofflineReports();
    const hasAutoOpenedRef = useRef(false);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [highlightedId, setHighlightedId] = useState<number | null>(null);

    const chipClass = (active: boolean) => `chip ${active ? "chip-active" : ""}`;

    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedSeverity, setSelectedSeverity] =
        useState<"all" | "low" | "moderate" | "high" | "critical">("all");
    const [selectedStatus, setSelectedStatus] = useState<"all" | "in_progress" | "resolved">("all");

    const [barangayFilter, setBarangayFilter] = useState<"all" | "my">("all");
    const [searchBarangay, setSearchBarangay] = useState("");
    const [sortNewest, setSortNewest] = useState<boolean>(true);

    useEffect(() => {
        if (reports.length) {
            setLastUpdated(new Date())
        }
    }, [reports])


    useEffect(() => {
        if (searchBarangay.trim() !== "") {
            setBarangayFilter("all");
        }
    }, [searchBarangay]);

    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth <= 768;
            setFiltersOpen(!mobile);
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const normalize = (s: string) =>
        s
            .toLowerCase()
            .replace(/brgy\.?/g, "")
            .replace(/barangay/g, "")
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    const normalizedSearch = useMemo(
        () => normalize(searchBarangay),
        [searchBarangay]
    )

    const normalizedUserBarangay = useMemo(
        () => normalize(userBarangay),
        [userBarangay]
    )

    const filteredReports = useMemo(() => {
        return reports.filter(r => {

            if (r.status === "rejected" || r.status === "archived") return false

            if (!(r.assigned_officer_id != null || r.status === "resolved")) return false

            if (selectedCategory !== "all" && r.category.toLowerCase() !== selectedCategory)
                return false

            if (selectedSeverity !== "all" && r.verified_critical_level !== selectedSeverity)
                return false

            if (selectedStatus !== "all" && (r.status ?? "in_progress") !== selectedStatus)
                return false

            const normalizedReport = normalize(r.location_display)

            if (normalizedSearch !== "")
                return normalizedReport.includes(normalizedSearch)

            if (barangayFilter === "my" && normalizedUserBarangay)
                return normalizedReport === normalizedUserBarangay

            return true
        })
    }, [
        reports,
        selectedCategory,
        selectedSeverity,
        selectedStatus,
        barangayFilter,
        normalizedSearch,
        normalizedUserBarangay
    ])

    const sortedReports = useMemo(() => {
        return [...filteredReports].sort((a, b) => {
            if (sortNewest)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    }, [filteredReports, sortNewest]);

    const timeFilters = [
        { value: "all", label: "All Time" },
        { value: "today", label: "Today" },
        { value: "7days", label: "7 Days" },
        { value: "last30days", label: "30 Days" },
        { value: "last12months", label: "12 Months" },
    ] as const;

    useEffect(() => {
        if (!reports.length) return;
        if (!initialOpenIncidentId) return;
        if (hasAutoOpenedRef.current) return;

        setSelectedCategory("all");
        setSelectedSeverity("all");
        setSelectedStatus("all");
        setBarangayFilter("all");

    }, [reports, initialOpenIncidentId]);

    useEffect(() => {
        if (!reports.length) return;
        if (!initialOpenIncidentId) return;
        if (hasAutoOpenedRef.current) return;

        const match = reports.find(r => r.id === initialOpenIncidentId);
        if (!match) return;

        hasAutoOpenedRef.current = true;

        onSelectReport?.(match);
        setHighlightedId(match.id);

        requestAnimationFrame(() => {
            const el = document.getElementById(`report-${match.id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        const timeout = setTimeout(() => {
            setHighlightedId(null);
        }, 2000);

        return () => clearTimeout(timeout);

    }, [sortedReports, reports, initialOpenIncidentId]);


    const timeAgo = (iso: string) => {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    const handleReportClick = async () => {
        const reportPayload = {
            id: Date.now(),
            created_at: new Date().toISOString(),
            status: "pending",

        }
        onReport();
    }


    return (
        <aside className="dashboard-alerts">
            <div className="alerts-controls">

                {/* <button className="sheet-handle-btn">
                    <div className="sheet-handle"></div>
                </button> */}
                <div className="alerts-header">
                    <div className="alerts-header-left">
                        {/* <h1 className="alerts-title">Verified Reports</h1> */}
                        <span className="alerts-subtitle">
                            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not updated yet"}
                        </span>
                    </div>

                    <div className="alerts-header-right">
                        <button
                            type="button"
                            className="filters-toggle-btn"
                            onClick={() => setFiltersOpen((v) => !v)}
                            aria-expanded={filtersOpen}
                        >
                            Filters <span className={`chev ${filtersOpen ? "open" : ""}`}>▾</span>
                        </button>

                        <button
                            className="alerts-refresh-btn"
                            onClick={onRefreshReports}
                            disabled={isLoadingReports}
                            aria-label="Refresh"
                            title="refresh"
                        >
                            {isLoadingReports ? "..." : "↻"}
                        </button>
                    </div>
                </div>


                {/* SEARCH */}
                <div className="alerts-search-wrapper">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search barangay..."
                            value={searchBarangay}
                            onChange={(e) => setSearchBarangay(e.target.value)}
                        />
                        {searchBarangay && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => setSearchBarangay("")}
                                aria-label="Clear search"
                                title="Clear"
                            >
                                x
                            </button>
                        )}
                    </div>
                    <Search className="alerts-search-icon" />
                </div>


                <div className={`filters-collapse ${filtersOpen ? "open" : ""}`}>

                    {/* Severity Filter */}
                    <div className="chip-row">
                        <span className="chip-label">Severity</span>
                        {(["all", "low", "moderate", "high", "critical"] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                className={`${chipClass(selectedSeverity === s)} ${s !== "all" ? s : ""}`}
                                onClick={() => setSelectedSeverity(s)}
                            >
                                {s === "all" ? "All" : s.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Sort Filter */}
                    <div className="chip-row">
                        <span className="chip-label">Sort</span>
                        <button
                            type="button"
                            className={chipClass(sortNewest)}
                            onClick={() => setSortNewest(true)}
                        >
                            Newest
                        </button>
                        <button
                            type="button"
                            className={chipClass(!sortNewest)}
                            onClick={() => setSortNewest(false)}
                        >
                            Oldest
                        </button>
                    </div>

                    {/* Status Filter */}
                    <div className="chip-row">
                        <span className="chip-label">Status</span>
                        {(["all", "in_progress", "resolved"] as const).map((st) => (
                            <button
                                key={st}
                                type="button"
                                className={chipClass(selectedStatus === st)}
                                onClick={() => setSelectedStatus(st)}
                            >
                                {st === "all" ? "All" : st === "in_progress" ? "In progress" : "Resolved"}
                            </button>
                        ))}
                    </div>

                    {/* Barangay Filter */}
                    <div className="chip-row">
                        <span className="chip-label">Barangay</span>

                        <button
                            type="button"
                            className={chipClass(barangayFilter === "all")}
                            onClick={() => setBarangayFilter("all")}
                        >
                            All Barangays
                        </button>

                        {isVerified === true && userBarangay && (
                            <button
                                type="button"
                                className={chipClass(barangayFilter === "my")}
                                onClick={() => setBarangayFilter("my")}
                            >
                                My Barangay
                            </button>
                        )}

                    </div>

                    {/* Time Filter */}
                    <div className="chip-row">
                        <span className="chip-label">Time</span>

                        {timeFilters.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                className={chipClass(reportTimeFilter === t.value)}
                                onClick={() => setReportTimeFilter(t.value)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>


                {/* FILTERS ROW */}
                {/* <div className="filter-row">
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="" disabled>Category</option>
                    <option value="">All</option>
                    <option value="Fire">Fire</option>
                    <option value="Flood">Flood</option>
                    <option value="Landslide">Landslide</option>
                    <option value="Accident">Accident</option>
                </select>

                <select
                    value={sortNewest ? "newest" : "oldest"}
                    onChange={(e) => setSortNewest(e.target.value === "newest")}
                >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                </select>
            </div> */}

                {/* CTA */}
                <button
                    className="report-btn"
                    onClick={handleReportClick}
                    disabled={isVerificationLoading}
                >
                    {isVerificationLoading ? "Checking..." : navigator.onLine ? "+ Report Incident" : "+ Save Offline"}
                </button>
            </div>

            {isLoadingReports && (
                <div className="alerts-loading-overlay">
                    <span className="spinner"></span>
                    Updating reports…
                </div>
            )}

            {/* {offlineReports.length > 0 && (
                <div className="offline-section">
                    <div className="offline-header">
                        Pending Reports ({offlineReports.length})
                    </div>

                    <ul className="offline-list">
                        {offlineReports.map((r) => (
                            <li key={r.id} className="offline-card">
                                <div className="offline-title">
                                    {(r.category || "Incident").toUpperCase()}
                                </div>

                                <div className="offline-location">
                                    {r.location_display || "Unknown location"}
                                </div>

                                <div className="offline-meta">
                                    <span className="offline-status pending">
                                        Pending Sync
                                    </span>

                                    <span>
                                        {new Date(r.created_at).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )} */}

            <div className="alerts-list-area">
                {isLoadingReports ? (
                    <ul className="report-list">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <li key={i} className="report-card-skeleton">
                                <div className="skeleton-line title"></div>
                                <div className="skeleton-line location"></div>
                                <div className="skeleton-line meta"></div>
                            </li>
                        ))}
                    </ul>
                ) : sortedReports.length === 0 ? (
                    <div className="empty-state">
                        <p>No reports found matching your filters.</p>
                        <button className="clear-filters-btn" onClick={() => {
                            setSelectedCategory("all");
                            setSelectedSeverity("all");
                            setBarangayFilter("all");
                            setSelectedStatus("all");
                            setReportTimeFilter("all");
                        }}>Clear Filters</button>
                    </div>
                ) : (
                    <ul className="report-list">
                        {sortedReports.map((report) => (
                            <li
                                id={`report-${report.id}`}
                                key={report.id}
                                className={`report-card-wrapper 
                                    ${report.verified_critical_level}
                                    ${highlightedId === report.id ? "highlighted" : ""}
                                `}
                                onClick={() => { onSelectReport?.(report); onCollapsePanel?.(); }}
                            >
                                <div className="report-header">
                                    <span className="report-title">
                                        {(
                                            report.category === "others"
                                                ? report.other_category || "others"
                                                : report.category_display || report.category
                                        ).toUpperCase()}
                                    </span>
                                    <span className={`risk-badge ${report.verified_critical_level}`}>
                                        {(report.verified_critical_level ?? "low").toUpperCase()}
                                    </span>
                                </div>

                                <span className="report-location">
                                    {report.location_display}
                                </span>

                                <div className="report-meta">
                                    {(() => {
                                        const st = (report.status ?? "in_progress") as "in_progress" | "resolved";
                                        return (
                                            <span className={`meta-pill ${st}`}>
                                                {st === "in_progress" ? "IN PROGRESS" : "RESOLVED"}
                                            </span>
                                        );
                                    })()}

                                    <span className="meta-pill">{timeAgo(report.created_at)}</span>
                                    <span className="meta-pill">
                                        {new Date(report.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>


                                {report.status === "resolved" && report.lgu_post && (
                                    <div className="lgu-preview">
                                        <div className="lgu-preview-header">
                                            🏛 LGU Official Update
                                        </div>

                                        {report.lgu_post.what_happened && (
                                            <div className="lgu-preview-section">
                                                <div className="lgu-preview-title">What Happened</div>
                                                <div className="lgu-preview-body">
                                                    {report.lgu_post.what_happened}
                                                </div>
                                            </div>
                                        )}

                                        {report.lgu_post.action_taken && (
                                            <div className="lgu-preview-section">
                                                <div className="lgu-preview-title">Action Taken</div>
                                                <div className="lgu-preview-body">
                                                    {report.lgu_post.action_taken}
                                                </div>
                                            </div>
                                        )}

                                        {report.lgu_post.advisory && (
                                            <div className="lgu-preview-section">
                                                <div className="lgu-preview-title">Advisory to Citizens</div>
                                                <div className="lgu-preview-body">
                                                    {report.lgu_post.advisory}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </aside >
    );
}
