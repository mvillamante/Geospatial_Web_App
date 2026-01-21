import { useState } from "react";
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
    title: string;
    category: "Fire" | "Flood" | "Landslide" | "Accident";
    risk: "low" | "moderate" | "high" | "critical";
    location: string;
    time: string;
    lat: number;
    lng: number;
}

interface AlertsPanelProps {
    onReport: () => void;
    onSelectReport?: (report: Report) => void;
    onBarangaySearch?: (barangay: string, severity: string | null) => void;
}

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

export default function AlertsPanel({ onReport, onSelectReport, onBarangaySearch }: AlertsPanelProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedBarangay, setSelectedBarangay] = useState("");
    const [sortNewest, setSortNewest] = useState<boolean>(true);
    const severityPriority: Record<string, number> = {
        critical: 4,
        high: 3,
        moderate: 2,
        low: 1
    };

    const handleBarangaySearch = (value: string) => {
        setSelectedBarangay(value);
        if (onBarangaySearch) {
            const matchingReports = mockReports.filter(r => 
                r.location.toLowerCase().includes(value.toLowerCase())
            );
            
            let highestSeverity: string | null = null;
            if (matchingReports.length > 0) {
                const sorted = matchingReports.sort((a, b) => 
                    severityPriority[b.risk] - severityPriority[a.risk]
                );
                highestSeverity = sorted[0].risk;
            }
            
            onBarangaySearch(value, highestSeverity);
        }
    };

    const filteredReports = mockReports
        .filter(r => selectedCategory === "" || r.category === selectedCategory)
        .filter(r => selectedBarangay === "" || r.location.toLowerCase().includes(selectedBarangay.toLowerCase())
        );

    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortNewest) return new Date(b.time).getTime() - new Date(a.time).getTime();
        return new Date(a.time).getTime() - new Date(b.time).getTime();
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
                        className={`report-card ${report.risk}`}
                        onClick={() => onSelectReport?.(report)}
                    >
                        <div className="report-header">
                            <span className="report-title">{report.title}</span>
                            <span className={`risk-badge ${report.risk}`}>{report.risk.toUpperCase()}</span>
                        </div>

                        <span className="report-location">{report.location}</span>

                        <div className="report-footer">
                            <span>{new Date(report.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </aside >
    );
}
