import { useState } from "react";
import type { Report } from "../../../types/report";

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
      const API_URL = import.meta.env.VITE_API_URL;

      const res = await fetch(
        `${API_URL}/api/reports/${report.id}/reply/`,
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

  function ReportImage({ src, alt }: { src?: string | null; alt: string }) {
    const [status, setStatus] = useState<"loading" | "loaded" | "error">(
      src ? "loading" : "error"
    );

    if (!src) {
      // No image provided
      return (
        <div className="image-placeholder">
          No Image Provided
        </div>
      );
    }

    return (
      <>
        {status === "loading" && (
          <div className="image-placeholder">Loading image...</div>
        )}
        <img
          src={src}
          alt={alt}
          className={`report-photo ${status === "loaded" ? "visible" : "hidden"}`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
        {status === "error" && (
          <div className="image-placeholder">Failed to Load Image</div>
        )}
      </>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2>{report.title}</h2>

        <div className="modal-meta">
          <div className="modal-row">
            <strong>Status:</strong> <span>{formatStatus(report.status)}</span>
          </div>
          <div className="modal-row">
            <strong>Location:</strong> <span>{report.location_display}</span>
          </div>
          <div className="modal-row">
            <strong>Date:</strong> <span>{report.date}</span>
          </div>
        </div>

        <p className="modal-desc">{report.description}</p>

        <ReportImage src={report.photo} alt="Report Photo" />

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
        {localReport.status === "Needs Info" && report.needs_info_note && (
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
                <ReportImage src={report.reply_image_url} alt="Reply Image" />
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
