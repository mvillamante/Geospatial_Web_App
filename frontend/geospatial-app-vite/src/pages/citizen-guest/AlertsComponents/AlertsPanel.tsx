import { useState, useEffect } from "react";
import { Search } from 'lucide-react';


export interface Report {
    id: number;
    incident_type: "fire" | "flood" | "earthquake" | "typhoon" | "chemical / gas leak" | "fallen tree" | "infrastructure damage" | "landslide" | "vehicular accident" | "others";
    verified_critical_level: "low" | "moderate" | "high" | "critical";
    barangay: string;
    created_at: string;
    latitude: number;
    longitude: number;
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
}

export default function AlertsPanel({ onReport, onSelectReport, onBarangaySearch, initialOpenIncidentId }: AlertsPanelProps) {
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [highlightedId, setHighlightedId] = useState<number | null>(null);

    const chipClass = (active: boolean) => `chip ${active ? "chip-active" : ""}`;

    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedSeverity, setSelectedSeverity] =
        useState<"all" | "low" | "moderate" | "high" | "critical">("all");
    const [selectedStatus, setSelectedStatus] = useState<"all" | "in_progress" | "resolved">("all");

    const [selectedBarangay, setSelectedBarangay] = useState("");
    const [sortNewest, setSortNewest] = useState<boolean>(true);
    const [reports, setReports] = useState<Report[]>([]);

    const normalizeIncident = (v: any): Report["incident_type"] => {
        const s = String(v ?? "").toLowerCase();

        if (s.includes("fire")) return "fire";
        if (s.includes("flood")) return "flood";
        if (s.includes("landslide")) return "landslide";
        if (s.includes("chemical") || s.includes("gas")) return "chemical / gas leak";
        if (s.includes("typhoon") || s.includes("storm")) return "typhoon";
        if (s.includes("earthquake")) return "earthquake";
        if (s.includes("fallen tree") || s.includes("tree")) return "fallen tree";
        if (s.includes("infrastructure") || s.includes("damage")) return "infrastructure damage";
        if (s.includes("vehicular") || s.includes("accident")) return "vehicular accident";

        return "others";
    };



    const severityPriority: Record<Report["verified_critical_level"], number> = {
        critical: 4,
        high: 3,
        moderate: 2,
        low: 1,
    };

    const fetchReports = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/incident-reports/verified/", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP error ${res.status}`);
            }

            const data = await res.json();

            const mappedReports: Report[] = (data.results || []).map((r: any) => {
                let lat = r.lat ?? r.latitude;
                let lng = r.lng ?? r.longitude;

                const extractBarangay = (locationDisplay?: string): string => {
                    const s = String(locationDisplay ?? "").trim();
                    if (!s) return "";

                    const m = s.match(/\b(?:barangay|brgy\.?)\s+([^,|\-]+)\b/i);
                    if (m?.[1]) return m[1].trim();

                    return s.split(",")[0].trim();
                };

                return {
                    id: r.id,
                    incident_type: r.category === "others"
                        ? r.other_category || "others"
                        : normalizeIncident(r.category_display ?? r.category),
                    verified_critical_level: r.verified_critical_level ?? "low",
                    barangay: extractBarangay(r.location_display),
                    created_at: r.created_at,
                    latitude: lat ?? 0,
                    longitude: lng ?? 0,

                    assigned_officer_id: r.assigned_officer_id ?? r.assignedOfficerId ?? null,

                    // to check
                    status: normalizeUiStatus(r.status),

                    lgu_post: r.lgu_post ?? null,


                    lastUpdatedAt: r.lastUpdatedAt ?? r.createdAt,
                };
            });

            console.log("verified endpoint payload:", data);
            console.log("count:", data.count, "results:", data.results?.length);



            setReports(mappedReports);
            setLastUpdated(new Date());
        } catch (err: any) {
            console.error("Failed to fetch verified reports:", err.message);
            setReports([]);
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchReports();
    }, []);

    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth <= 768;
            setFiltersOpen(!mobile);
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const handleBarangaySearch = (value: string) => {
        setSelectedBarangay(value);
        if (onBarangaySearch) {
            const matchingReports = reports.filter(r =>
                r.barangay.toLowerCase().includes(value.toLowerCase())
            );

            let highestSeverity: string | null = null;
            if (matchingReports.length > 0) {
                const sorted = matchingReports.sort((a, b) =>
                    severityPriority[b.verified_critical_level] - severityPriority[a.verified_critical_level]
                );
                highestSeverity = sorted[0].verified_critical_level;
            }

            onBarangaySearch(value, highestSeverity);
        }
    };

    const filteredReports = reports
        .filter(r => (r.assigned_officer_id != null) || (r.status === "resolved"))
        .filter(r => selectedCategory === "all" || r.incident_type.toLowerCase() === selectedCategory)
        .filter(r => selectedSeverity === "all" || r.verified_critical_level === selectedSeverity.toLowerCase())
        .filter(r => selectedStatus === "all" || (r.status ?? "in_progress") === selectedStatus)
        .filter(r => selectedBarangay === "" || r.barangay.toLowerCase().includes(selectedBarangay.toLowerCase()));


    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortNewest) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    useEffect(() => {
        if (!reports.length) return;
        if (!initialOpenIncidentId) return;

        const match = reports.find(r => r.id === initialOpenIncidentId);
        if (!match) return;

        onSelectReport?.(match);

        setHighlightedId(match.id);

        requestAnimationFrame(() => {
            const el = document.getElementById(`report-${match.id}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        })

        const timeout = setTimeout(() => {
            setHighlightedId(null);
        }, 2000);

        setSelectedCategory("all");
        setSelectedSeverity("all");
        setSelectedStatus("all");
        setSelectedBarangay("");

        return () => clearTimeout(timeout);



    }, [sortedReports, initialOpenIncidentId]);

    const timeAgo = (iso: string) => {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const normalizeUiStatus = (rawStatus: any): "in_progress" | "resolved" => {
        const s = String(rawStatus ?? "").toLowerCase();
        return s === "resolved" ? "resolved" : "in_progress";
    };

    function renderLguPost(note: string) {
        const lines = note.split("\n");
        const blocks: { title?: string; body: string[] }[] = [];
        let current: { title?: string; body: string[] } = { title: undefined, body: [] };

        const isHeader = (l: string) =>
            /^(status|what happened|action taken|advisory to citizens|advisory)\s*:/i.test(l.trim());

        for (const raw of lines) {
            const line = raw.replace(/\r/g, "");

            if (isHeader(line)) {
                // push previous
                if (current.title || current.body.length) blocks.push(current);
                current = { title: line.replace(/:$/, "").trim(), body: [] };
            } else {
                current.body.push(line);
            }
        }
        if (current.title || current.body.length) blocks.push(current);

        return (
            <div className="lgu-post">
                {blocks.map((b, idx) => (
                    <div className="lgu-post-block" key={idx}>
                        {b.title && <div className="lgu-post-title">{b.title}</div>}
                        <div className="lgu-post-body">{b.body.join("\n").trim()}</div>
                    </div>
                ))}
            </div>
        );
    }


    return (
        <aside className="dashboard-alerts">
            <div className="sheet-handle" />
            <div className="alerts-controls">
                <div className="alerts-header">
                    <div className="alerts-header-left">
                        <h3 className="alerts-title">Verified Reports</h3>
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
                            onClick={fetchReports}
                            disabled={isLoading}
                            aria-label="Refresh"
                            title="refresh"
                        >
                            {isLoading ? "..." : "↻"}
                        </button>
                    </div>
                </div>


                {/* SEARCH */}
                <div className="alerts-search-wrapper">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search barangay..."
                            value={selectedBarangay}
                            onChange={(e) => handleBarangaySearch(e.target.value)}
                        />
                        {selectedBarangay && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => handleBarangaySearch("")}
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
                    {/* CHIPS ROW */}
                    {/* <div className="chip-row">
                        <span className="chip-label">Category</span>
                        {[
                            "all",
                            "fire",
                            "flood",
                            "landslide",
                            "typhoon",
                            "earthquake",
                            "vehicular_accident",
                            "chemical_gas_leak",
                            "fallen_tree",
                            "infrastructure_damage",
                        ].map((c) => (
                            <button
                                key={c}
                                type="button"
                                className={chipClass(selectedCategory === c)}
                                onClick={() => setSelectedCategory(c)}
                            >
                                {c === "all"
                                    ? "All"
                                    : c
                                        .replace(/_/g, " ")
                                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </button>
                        ))}

                    </div> */}

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
                <button className="report-btn" onClick={onReport}>
                    + Report Incident
                </button>
            </div>

            <div className="alerts-list-area">
                {isLoading && reports.length === 0 ? (
                    <div className="empty-state">Loading reports...</div>
                ) : sortedReports.length === 0 ? (
                    <div className="empty-state">
                        <p>No reports found matching your filters.</p>
                        <button className="clear-filters-btn" onClick={() => {
                            setSelectedCategory("all");
                            setSelectedSeverity("all");
                            setSelectedBarangay("");
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
                                onClick={() => onSelectReport?.(report)}
                            >
                                <div className="report-header">
                                    <span className="report-title">
                                        {report.incident_type.toUpperCase()}
                                    </span>
                                    <span className={`risk-badge ${report.verified_critical_level}`}>
                                        {report.verified_critical_level.toUpperCase()}
                                    </span>
                                </div>

                                <span className="report-location">
                                    Barangay {report.barangay}
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
