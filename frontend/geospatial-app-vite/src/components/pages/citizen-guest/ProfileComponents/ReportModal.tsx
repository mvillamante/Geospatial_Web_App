import type { Report } from "../../../../types/report";

interface ReportModalProps {
  report: Report;
  onClose: () => void;
}

export default function ReportModal({ report, onClose }: ReportModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{report.title}</h2>

        <p><strong>Status:</strong> {report.status}</p>
        <p><strong>Location:</strong> {report.location}</p>
        <p><strong>Date:</strong> {report.date}</p>

        <p>{report.description}</p>

        {report.photo && (
          <img src={report.photo} alt="report" />
        )}

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
