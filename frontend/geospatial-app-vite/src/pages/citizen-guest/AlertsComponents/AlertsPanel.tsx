import { useState, useEffect } from "react";
import { Search } from 'lucide-react';

const barangays = {
    Poblacion: ["Uno", "Dos", "Tres"],
    Lakeside: ["Marinig", "Pulo", "Sala"],
    Others: [
        "Baclaran", "Banay-banay", "Banlic", "Bigaa", "Butong", "Casile",
        "Diezmo", "Gulod", "Mamatid", "Niugan", "Pittland", "San Isidro"
    ]
};

export interface Report {
    id: number;
    incident_type: "fire" | "flood" | "landslide" | "accident";
    verified_critical_level: "low" | "moderate" | "high" | "critical";
    barangay: string;
    created_at: string;
    latitude: number;
    longitude: number;
}

interface AlertsPanelProps {
    onReport: () => void;
    onSelectReport?: (report: Report) => void;
    onBarangaySearch?: (barangay: string, severity: string | null) => void;
}

/*
const mockReports: Report[] = [
    {
        id: 1,
        title: "Residential Fire",
        category: "Fire",
        risk: "high",
        location: "Barangay San Isidro",
        time: "2025-12-29T08:00:00Z",
        lat: 14.2715,
        lng: 121.1240,
    },
    {
        id: 2,
        title: "River Overflow",
        category: "Flood",
        risk: "moderate",
        location: "Barangay Banay-Banay",
        time: "2025-12-29T07:45:00Z",
        lat: 14.2456,
        lng: 121.1158,
    },
    {
        id: 3,
        title: "Landslide Warning",
        category: "Landslide",
        risk: "critical",
        location: "Barangay Pulo",
        time: "2025-12-29T07:30:00Z",
        lat: 14.2280,
        lng: 121.1320,
    },
];
*/

export default function AlertsPanel({ onReport, onSelectReport, onBarangaySearch }: AlertsPanelProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedBarangay, setSelectedBarangay] = useState("");
    const [sortNewest, setSortNewest] = useState<boolean>(true);
    const [reports, setReports] = useState<Report[]>([]);
    const severityPriority: Record<string, number> = {
        critical: 4,
        high: 3,
        moderate: 2,
        low: 1
    };

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        fetch("/api/incident-reports/verified/", {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        })
        .then(async (res) => {
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP error ${res.status}`);
            }
            return res.json();
        })
        .then((data) => {
            console.log("Fetched verified reports:", data);

            const mappedReports: Report[] = (data.results || []).map(r => ({
                id: r.id,
                incident_type: r.category_display ?? r.category ?? "others",
                verified_critical_level: r.suggested_critical_level ?? "low",
                barangay: r.location_display?.split(",")[0].replace("Barangay ", "").trim() ?? "",
                created_at: r.created_at,
                latitude: r.lat ?? 0,
                longitude: r.lng ?? 0,
            }));

            setReports(mappedReports);
        })
        .catch((err) => {
            console.error("Failed to fetch verified reports:", err.message);
            setReports([]);
        });
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
        .filter(r => selectedCategory === "" || r.incident_type.toLowerCase() === selectedCategory.toLowerCase())
        .filter(r => selectedBarangay === "" || r.barangay.toLowerCase().includes(selectedBarangay.toLowerCase()));


    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortNewest) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return (
        <aside className="dashboard-alerts">
            <div className="sheet-handle" />


            {/* SEARCH */}
            <div className="alerts-search-wrapper">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search barangay..."
                        value={selectedBarangay}
                        onChange={(e) => handleBarangaySearch(e.target.value)}
                    />
                </div>
                <Search className="alerts-search-icon" />
            </div>

            {/* FILTERS ROW */}
            <div className="filter-row">
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
            </div>

            {/* CTA */}
            <button className="report-btn" onClick={onReport}>
                + Report Incident
            </button>

            <h3>Verified Reports</h3>
            <ul className="report-list">
                {sortedReports.map((report) => (
                    <li
                        key={report.id}
                        className={`report-card ${report.verified_critical_level}`}
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

                        <div className="report-footer">
                            <span>
                            {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </aside >
    );
}
