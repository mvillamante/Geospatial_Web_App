import { useState } from "react";
import ProgressBar from './ProgressBar';
import ReportModal from "./ReportModal";

function formatStatus(status: string) {
    return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}


export default function ReportCard({ report, onUpdate }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            { report.status !== "archived" && (
                <div className="report-card">
                    <div>
                        <h4>{report.title}</h4>
                        <p className="muted">
                            {report.location} • {report.date}
                        </p>
                    </div>

                    <ProgressBar status={report.progressStatus} />

                    <div className="report-actions">
                        <span className={`status-pill ${report.status.replace("_", "-")}`}>
                            {formatStatus(report.status)}
                        </span>



                        <button className="dots-btn" onClick={() => setOpen(true)}>...</button>
                    </div>
                </div>
            )}

            {open && <ReportModal report={report} onClose={() => setOpen(false)} onUpdate={onUpdate} />}
        </>
    );
}