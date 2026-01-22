import { X } from "lucide-react";
import type { Report } from "../../../../types/report";

interface ReportModalProps {
  report: Report;
  onClose: () => void;
}

export default function ReportModal({ report, onClose }: ReportModalProps) {
  const displayCategory =
    report.category === "others" && report.other_category?.trim()
      ? report.other_category.trim()
      : report.category;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <h2>{displayCategory}</h2>

        <div className="modal-meta">
          <div className="modal-row">
            <strong>Status:</strong> <span>{report.status}</span>
          </div>
          <div className="modal-row">
            <strong>Location:</strong> <span>{report.location}</span>
          </div>
          <div className="modal-row">
            <strong>Date:</strong> <span>{report.date}</span>
          </div>
        </div>

        <p className="modal-desc">{report.description}</p>

        {report.photo && <img src={report.photo} alt="report" />}

        <button className="modal-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
