import { useState, useEffect } from "react";
import ProgressBar from './ProgressBar';
import ReportModal from "./ReportModal";

function formatStatus(status: string) {
    return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

interface Props {
    report: ReportCardModel;
    onUpdate?: (r: ReportCardModel) => void;
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
            

            {open && <ReportModal report={report} onClose={() => setOpen(false)} onUpdate={onUpdate} />}
        </>
    );
}