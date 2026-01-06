import "./ReportsTable.css";

interface Report {
    id: string;
    hazardType: string;
    location: string;
    status: "pending" | "under review"|"assigned"|"resolved";
    reportedDate: string;
}

const mockReports: Report[] = [
    { id: "RPT-001", hazardType: "Road Crash", location: "Brgy San Isidro", status: "pending", reportedDate: "2026-01-05" },
    { id: "RPT-002", hazardType: "Electrical Hazard", location: "Brgy Pulo", status: "resolved", reportedDate: "2026-01-06" },
    { id: "RPT-003", hazardType: "Residential Fire", location: "Brgy San Isidro", status: "pending", reportedDate: "2026-01-04" },
    { id: "RPT-004", hazardType: "Fire Hazard", location: "Brgy Banay-Banay", status: "assigned", reportedDate: "2026-01-05" },
    { id: "RPT-005", hazardType: "Blocked Road", location: "Brgy Pulo", status: "resolved", reportedDate: "2026-01-06" },
    { id: "RPT-006", hazardType: "Residential Fire", location: "Brgy Banay-Banay", status: "pending", reportedDate: "2026-01-05" },
];

export function ReportsTable() {
    return (
        <div className="reports-card">
            <div className="reports-header">
                <h2 className="reports-title">Reports Table</h2>
                <div className="reports-table-wrapper">
                    <table className="reports-table">
                        <thead>
                            <th>ID</th>
                            <th>Hazard Type</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th>Date</th>
                        </thead>
                        <tbody>
                            {mockReports.map((report) => (
                                <tr key={report.id}>
                                    <td className="report-id">{report.id}</td>
                                    <td>{report.hazardType}</td>
                                    <td className="truncate">{report.location}</td>
                                    <td>
                                        <span className={`status-badge ${report.status}`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="report-date">{report.reportedDate}</td>
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    );
}