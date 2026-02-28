import { useState } from "react";
import type { Report } from "../../../../types/report";

interface ReportModalProps {
  report: Report;
  onClose: () => void;
  onUpdate?: (updatedReport: Report) => void;
}

export default function ReportModal({ report, onClose, onUpdate }: ReportModalProps) {
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [localReport, setLocalReport] = useState(report);
  const [isSending, setIsSending] = useState(false);

  const handleSendReply = async () => {
    const trimmedMessage = replyMessage.trim();

    if (!trimmedMessage && !replyImage) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem("access_token");

      const formData = new FormData();

      if (trimmedMessage) formData.append("reply_message", trimmedMessage);

      if (replyImage && replyImage.size > 0) {
        formData.append("reply_image", replyImage);
      }

      if (!formData.has("reply_message") && !formData.has("reply_image")) {
        alert("Cannot send empty reply.");
        setIsSending(false);
        return;
      }

      console.log("Form Data: ", formData)

      const res = await fetch(
        `http://localhost:8000/api/reports/${report.id}/reply/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Failed to send reply.");

      const data = await res.json();
      setReplyMessage("");
      setReplyImage(null);

      const updatedReport = {
        ...localReport,
        reply_message: data.reply_message,
        reply_image_url: data.reply_image_url,
        status: data.status || localReport.status,
      };

      setLocalReport(updatedReport);
      if (onUpdate) onUpdate(updatedReport);

    } catch (err) {
      console.error(err);
      alert("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };


  const displayCategory =
    report.category === "others" && report.other_category?.trim()
      ? report.other_category.trim()
      : report.category;

  function formatStatus(status: string | undefined | null) {
    if (!status) return "";

    const s = status.toLowerCase();
    switch (s) {
      case "needs_info":
        return "Needs Info";
      case "in_progress":
        return "In Progress";
      case "pending":
        return "Pending";
      case "resolved":
        return "Resolved";
      case "archived":
        return "Archived";
      case "rejected":
        return "Rejected";
      default:
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{displayCategory}</h2>

        <div className="modal-meta">
          <div className="modal-row">
            <strong>Status:</strong> <span>{formatStatus(report.status)}</span>
          </div>
          <div className="modal-row">
            <strong>Location:</strong> <span>{report.location}</span>
          </div>
          <div className="modal-row">
            <strong>Date:</strong> <span>{report.date}</span>
          </div>
        </div>

        <p className="modal-desc">{report.description}</p>

        {report.photo && <img src={report.photo} alt="report" className="report-photo" />}
       
        {/* Officer Note for Rejected */}
        {localReport.status?.toLowerCase() === "rejected" && (
          <div className="note-card rejected-card">
            <div className="note-header">Report Rejected</div>

            {localReport.rejection_reason && (
              <div className="note-content">
                {localReport.rejection_reason}
              </div>
            )}
          </div>
        )}


        {/* Officer Note for Resolved */}
        {localReport.status?.toLowerCase() === "resolved" && localReport.lgu_post && (
          <div className="note-card lgu-post-card">
            <div className="note-header">🏛 LGU Official Update</div>

            <div className="note-section">
              <h4>Incident</h4>
              <p>{localReport.lgu_post.incident}</p>
            </div>

            <div className="note-section">
              <h4>Status</h4>
              <p>{localReport.lgu_post.status}</p>
            </div>

            {localReport.lgu_post?.what_happened && (
              <div className="note-section">
                <h4>What Happened</h4>
                <p>{localReport.lgu_post.what_happened}</p>
              </div>
            )}

            {localReport.lgu_post?.action_taken && (
              <div className="note-section">
                <h4>Action Taken</h4>
                <p>{localReport.lgu_post.action_taken}</p>
              </div>
            )}

            {localReport.lgu_post?.advisory && (
              <div className="note-section">
                <h4>Advisory to Citizens</h4>
                <p>{localReport.lgu_post.advisory}</p>
              </div>
            )}
          </div>
        )}



        {/* Reply Section */}
        {localReport.status === "needs_info" && report.needs_info_note && (
          <div className="note-card needs-info-card">
            <div className="note-header">Officer Note</div>
            <div className="note-content">{report.needs_info_note}</div>

            {!report.reply_message && !report.reply_image_url ? (
              <div className="reply-card">
                <div className="note-header">Your Reply</div>
                <textarea
                  placeholder="Type your reply here..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                  disabled={isSending}
                />
                <div className="reply-actions">
                  <label className="file-upload-btn">
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReplyImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  {replyImage && <span className="file-name">{replyImage.name}</span>}

                  <button
                    disabled={(!replyMessage.trim() && !replyImage) || isSending}
                    onClick={() => {
                      if (window.confirm("Are you sure you want to send this reply? This action cannot be undone.")) {
                        handleSendReply();
                      }
                    }}
                  >
                    {isSending ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>
            ) : (
              // Show read-only reply if it exists
              <div className="reply-card readonly">
                <div className="note-header">Your Reply</div>
                {report.reply_message && (
                  <textarea
                    value={report.reply_message}
                    readOnly
                    rows={3}
                    className="readonly-textarea"
                  />
                )}
                {report.reply_image_url && (
                  <img src={report.reply_image_url} alt="Reply" className="reply-image" />
                )}
              </div>
            )}
          </div>
        )}

        <button
          className="modal-close-btn"
          onClick={() => {
            if (onUpdate) onUpdate(localReport);
            onClose();
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
