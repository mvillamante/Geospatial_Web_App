import { useState, useEffect } from "react";
import ProgressBar from './ProgressBar';
import ReportModal from "./ReportModal";
import type { Report } from "../../../types/report";
import type { ReportStatus } from "../../../types/report";
import type { ProgressStatus } from "./ProgressBar";

function mapToProgressStatus(status: ReportStatus): ProgressStatus {
    switch (status) {
        case "Resolved":
        case "Archived":
            return "Resolved";

        case "In Progress":
        case "Needs Info":
            return "In Progress";

        case "Rejected":
            return "Pending";

        default:
            return "Pending";
    }
}

function formatStatus(status: string) {
    return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

interface Props {
    report: Report;
    onUpdate?: (r: Report) => void;
    autoOpen?: boolean;
}


export default function ReportCard({ report, onUpdate, autoOpen }: Props) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (autoOpen) {
            setOpen(true);
        }
    }, [autoOpen]);

    return (
        <>
            <div className="report-card">
                <div>
                    <h4>{report.title}</h4>
                    <p className="muted">
                        {report.location_display} • {report.date}
                    </p>
                </div>

                <ProgressBar status={mapToProgressStatus(report.status)} />

                <div className="report-actions">
                    <span
                        className={`status-pill ${report.status
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                    >
                        {formatStatus(report.status)}
                    </span>

                    <button className="dots-btn" onClick={() => setOpen(true)}>...</button>
                </div>
            </div>


            {open && <ReportModal report={report} onClose={() => setOpen(false)} onUpdate={onUpdate} />}
        </>
    );
}