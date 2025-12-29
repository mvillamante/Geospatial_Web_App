import { useState } from "react";

const barangays = {
    Poblacion: ["Uno", "Dos", "Tres"],
    Lakeside: ["Marinig", "Pulo", "Sala"],
    Others: [
        "Baclaran", "Banay-banay", "Banlic", "Bigaa", "Butong", "Casile",
        "Diezmo", "Gulod", "Mamatid", "Niugan", "Pittland", "San Isidro"
    ]
};

interface Report {
    id: number;
    title: string;
    category: "Fire" | "Flood" | "Landslide" | "Accident";
    risk: "low" | "moderate" | "high" | "critical";
    location: string;
    time: string;
}

interface AlertsPanelProps {
    onReport: () => void;
    onSelectReport: (report: Report) => void;
}

const mockReports: Report[] = [
    {
        id: 1,
        title: "Residential Fire",
        category: "Fire",
        risk: "high",
        location: "Barangay San Juan",
        time: "2025-12-29T08:00:00Z",
    },
    {
        id: 2,
        title: "River Overflow",
        category: "Flood",
        risk: "moderate",
        location: "Barangay Banay-Banay",
        time: "2025-12-29T07:45:00Z",
    },
    {
        id: 3,
        title: "Landslide Warning",
        category: "Landslide",
        risk: "critical",
        location: "Barangay Pulo",
        time: "2025-12-29T07:30:00Z",
    },
];

export default function AlertsPanel({ onReport, onSelectReport }: AlertsPanelProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedBarangay, setSelectedBarangay] = useState("");
    const [sortNewest, setSortNewest] = useState<boolean>(true);

    const filteredReports = mockReports
        .filter(r =>selectedCategory === "" || r.category === selectedCategory)
        .filter(r => selectedBarangay === "" || r.location.toLowerCase().includes(selectedBarangay.toLowerCase())
        );

    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortNewest) return new Date(b.time).getTime() - new Date(a.time).getTime();
        return new Date(a.time).getTime() - new Date(b.time).getTime();
    });

    return (
        <aside className="dashboard-alerts">
            <button className="report-btn" onClick={onReport}>
                + Report Incident
            </button>

            <label>Search Barangay...</label>
            <select value={selectedBarangay} onChange={e => setSelectedBarangay(e.target.value)}>
                <option value="">All Barangays</option>
                {Object.entries(barangays).map(([group, names]) => (
                    <optgroup label={group} key={group}>
                        {names.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </optgroup>
                ))}
            </select>

            <div className="filters">
                <label>Category Filter</label>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                    <option value="">All</option>
                    <option value="Fire">Fire</option>
                    <option value="Flood">Flood</option>
                    <option value="Landslide">Landslide</option>
                    <option value="Accident">Accident</option>
                </select>

                <label>Sort by Time</label>
                <select value={sortNewest ? "newest" : "oldest"} onChange={e => setSortNewest(e.target.value === "newest")}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            <h3>Verified Reports</h3>
            <ul className="report-list">
                {sortedReports.map((report) => (
                    <li
                        key={report.id}
                        className={`report-card ${report.risk}`}
                        onClick={() => onSelectReport(report)}
                        style={{ cursor: "pointer" }}
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
