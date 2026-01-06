import { useState } from "react";
import ProgressBar from './ProgressBar';
import ReportModal from "./ReportModal";

export default function ReportCard({ report }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <div className="report-card">
                <div>
                    <h4>{report.title}</h4>
                    <p className="muted">
                        {report.location} • {report.date}
                    </p>
                </div>

                <ProgressBar status={report.status} />

                <div className="report-actions">
                    <span className={`status-pill ${report.status.toLowerCase().replace(" ", '-')}`}>
                        {report.status}
                    </span>
                    <button className="dots-btn" onClick={() => setOpen(true)}>...</button>
                </div>
            </div>

            {open && <ReportModal report={report} onClose={() => setOpen(false)} />}
        </>
    );
}