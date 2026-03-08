import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReportCard from './ReportCard';
import "./ProfilePage.css";
import { getUserRoleAndDisplayName } from "../../../libr/auth";
import type { Report, ReportStatus } from "../../../types/report";
import { FaCog } from "react-icons/fa";
import { toast } from "sonner";

import { getCabuyaoBarangays, getIncidentCategories } from "../../../constants"

// export type ReportCardModel = {
//   id: number;
//   title: string;
//   description: string;
//   category: string;
//   other_category?: string | null;
//   location_display: string;
//   date: string;
//   progressStatus: "Pending" | "In Progress" | "Resolved";
//   status: string;
//   progress: number;
//   lgu_post?: {
//     incident: string;
//     status: string;
//     what_happened?: string | null;
//     action_taken?: string | null;
//     advisory?: string | null;
//     updated_at?: string;
//   } | null;
//   photo?: string | null;
//   officer_note: string | null;
//   needs_info_note?: string | null;
//   reply_message?: string | null;
//   reply_image_url?: string | null;
//   rejection_reason?: string | null;
// };

const API_URL = import.meta.env.VITE_API_URL;

type IncidentReportAPI = {
  id: number;
  category: string;
  description: string;
  other_category?: string | null;
  location_display?: string;
  created_at?: string;
  status?: string;
  suggested_critical_level?: string;
  photo_url?: string | null;
  lgu_post?: {
    incident: string;
    status: string;
    what_happened?: string | null;
    action_taken?: string | null;
    advisory?: string | null;
    updated_at?: string;
  } | null;
  officer_note: string | null;
  needs_info_note?: string | null;
  reply_message?: string | null;
  reply_image_url?: string | null;
  rejection_reason: string | null;
};

type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
type ProgressStatus = "pending" | "In Progress" | "Resolved" | "Needs Info" | "Archived" | "Rejected";

function toProgressStatus(raw: string | undefined | null): ProgressStatus {
  const s = (raw || "").toLowerCase();

  if (s === "resolved") return "Resolved";
  if (s === "in_progress" || s === "in progress" || s === "verified") return "In Progress";

  return "pending";
}
const ProfilePage: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.state?.openVerifyModal) {
      setShowVerifyModal(true);

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const [autoOpenReportId, setAutoOpenReportId] = useState<number | null>(null);

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("unverified");
  const [verificationReason, setVerificationReason] = useState<string>("");

  // const [showResearcherModal, setShowResearcherModal] = useState(false);
  // const [researchPurpose, setResearchPurpose] = useState("");
  // const [researchOrgSchool, setResearchOrgSchool] = useState("");
  // const [researchAttachment, setResearchAttachment] = useState<File | null>(null);
  // const [researchLoading, setResearchLoading] = useState(false);


  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [barangay, setBarangay] = useState("");
  const [address, setAddress] = useState("");
  const [barangayIdFile, setBarangayIdFile] = useState<File | null>(null);

  const [verifyLoading, setVerifyLoading] = useState(false);

  const navigate = useNavigate();
  const { displayName, userRole, userRole2 } = getUserRoleAndDisplayName();

  const normalizedRole = (userRole || "").toLowerCase();
  const normalizedRole2 = (userRole2?.[0] || "").toLowerCase();

  const isStaff =
    normalizedRole === "admin" ||
    normalizedRole === "officer" ||
    normalizedRole2 === "admin" ||
    normalizedRole2 === "officer";

  // const [isRequested, setIsRequested] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);

  const activeReports = reports.filter(
    (r) => r.status?.toLowerCase() !== "archived"
  );

  const archivedReports = reports.filter(
    (r) => r.status?.toLowerCase() === "archived"
  );

  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [profileError, setProfileError] = useState<string | null>(null);


  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // const [originalEmail, setOriginalEmail] = useState("");
  // const [originalPhone, setOriginalPhone] = useState("");

  // const [currentPassword, setCurrentPassword] = useState("");
  // const [newPassword, setNewPassword] = useState("");
  // const [confirmPassword, setConfirmPassword] = useState("");
  // const [passwordLoading, setPasswordLoading] = useState(false);
  // const [showPasswordForm, setShowPasswordForm] = useState(false);

  const logout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  }

  const categoryTitleMap = Object.fromEntries(
    getIncidentCategories().map(cat => [cat.value, cat.label])
  );

  function toReportStatus(raw: string | undefined | null): ReportStatus {
    const s = (raw || "").toLowerCase();

    if (s === "resolved") return "Resolved";
    if (s === "in_progress" || s === "in progress") return "In Progress";
    if (s === "needs_info" || s === "needs info") return "Needs Info";
    if (s === "rejected") return "Rejected";
    if (s === "archived") return "Archived";

    return "Pending";
  }

  useEffect(() => {
    const openReportId = location.state?.openReportId;

    if (openReportId && reports.length > 0) {
      setAutoOpenReportId(openReportId);

      window.history.replaceState({}, document.title);
    }
  }, [location.state, reports]);

  // const statusClassMap: Record<ReportStatus, string> = {
  //   Pending: "pending",
  //   "In Progress": "in_progress",
  //   "Needs Info": "needs_info",
  //   Resolved: "resolved",
  //   Rejected: "rejected",
  //   Archived: "archived",
  // };

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileError(null);
      try {
        const token = localStorage.getItem("access_token");
        const API_URL = import.meta.env.VITE_API_URL;

        const res = await fetch(`${API_URL}/api/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load profile")
        }


        const data = await res.json();
        localStorage.setItem("user_barangay", data.barangay || ""); // Save Current User's Barangay

        const rawStatus = (data.verification_status || "unverified").toLowerCase();

        const normalizedStatus =
          rawStatus === "approved"
            ? "verified"
            : rawStatus === "pending" ||
              rawStatus === "verified" ||
              rawStatus === "rejected"
              ? rawStatus
              : "unverified";
        setVerificationStatus(normalizedStatus);

        setVerificationReason(data.verification_rejection_reason || "");

        const e = data.email ?? "";
        const p = data.phone ?? "";

        setEmail(e);
        setPhone(p);
      } catch (e: any) {
        setProfileError(e?.message || "Failed to load profile");
      }

    }

    fetchProfile();



    const fetchMyReports = async () => {
      setLoadingReports(true);
      setReportsError(null);

      try {
        const token = localStorage.getItem("access_token");
        const API_URL = import.meta.env.VITE_API_URL;

        const res = await fetch(`${API_URL}/api/reports/my/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load report history");
        }

        const data = await res.json();

        const list: IncidentReportAPI[] = Array.isArray(data) ? data : (data.results ?? []);

        const mapped: Report[] = list.map((r) => {
          const dateStr = r.created_at
            ? new Date(r.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            : "";

          const status = toReportStatus(r.status);
          const progressStatus = toProgressStatus(status);

          const progress =
            status.toLowerCase().includes("resolved") ? 1 :
              status.toLowerCase().includes("in_progress") ? 0.6 :
                0.25;

          const customTitle =
            r.category === "others" && r.other_category?.trim()
              ? r.other_category.trim()
              : null;

          return {
            id: r.id,
            title: customTitle || categoryTitleMap[r.category] || "Incident Report",
            description: r.description || "No description provided.",
            category: r.category,
            other_category: r.other_category ?? null,
            location_display: r.location_display || "Unknown location",
            date: dateStr,
            status,
            progressStatus,
            progress,
            lgu_post: r.lgu_post || null,
            photo: r.photo_url ?? undefined,
            officer_note: r.officer_note || null,
            needs_info_note: r.needs_info_note || null,
            reply_message: r.reply_message || null,
            reply_image_url: r.reply_image_url || null,
            rejection_reason: r.rejection_reason || null,
          };
        });
        setReports(mapped);
      } catch (e: any) {
        setReportsError(e?.message || "Something went wrong");
        setReports([]);
      } finally {
        setLoadingReports(false);
      }
    };
    if (!isStaff) {
      fetchMyReports();
    } else {
      setLoadingReports(false);
      setReports([]);
      setReportsError(null);
    }

  }, [isStaff]);


  // const isVerifiedResident = verificationStatus === "verified";


  const submitVerificationRequest = async () => {
    if (!barangay.trim()) {
      toast.error("Please select your barangay.");
      return;
    }

    if (!address.trim()) {
      toast.error("Please enter your address.");
      return;
    }

    if (!barangayIdFile) {
      toast.error("Please upload your Barangay ID.");
      return;
    }

    setVerifyLoading(true);

    try {
      const token = localStorage.getItem("access_token");

      const formData = new FormData();
      formData.append("barangay", barangay.trim());
      formData.append("address", address.trim());
      formData.append("id_image", barangayIdFile);

      const res = await fetch(`${API_URL}/api/resident-verification/request/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Failed to submit verification request.");
      }

      toast.success("Verification request submitted!");

      setVerificationStatus("pending");
      setVerificationReason("");
      setShowVerifyModal(false);

      setBarangay("");
      setAddress("");
      setBarangayIdFile(null);

    } catch (e: any) {
      toast.error(e?.message || "Verification request failed");
    } finally {
      setVerifyLoading(false);
    }
  };

  const updateReport = (updatedReport: Report) => {
    setReports((prev) =>
      prev.map((r) => (r.id === updatedReport.id ? { ...r, ...updatedReport } : r))
    );
  };

  // const mockAvatarUrl =
  //   "https://i.pinimg.com/736x/53/ce/e1/53cee1111732dcf17bb5518213ff215a.jpg";

  return (
    <div className="profile-page">
      {profileError && (
        <div className="profile-error">
          {profileError}
        </div>
      )}
      {/* Profile Header */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="avatar-wrapper">
            <div className="avatar-wrapper">
              <div className="avatar-initials">
                {(displayName ?? "")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>

          </div>

          <div className="profile-info">
            <h2>{displayName}</h2>

            <p className="role-tag">
              {userRole}
              {userRole2?.[0] ? ` & ${userRole2[0]}` : ""}
            </p>

            <div className="profile-mobile-actions">
              <button
                className="settings-btn"
                onClick={() => navigate(`/main/${userRole.toLowerCase()}/settings`)}
              >
                <FaCog />
                <span>Settings</span>
              </button>
            </div>

            <div className="contact-section">
              <div className="contact-row">
                <span className="contact-label">Email</span>
                {/* <input
                  className="contact-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                /> */}
                <span className="contact-value">{email || "—"}</span>
              </div>

              <div className="contact-row">
                <span className="contact-label">Phone</span>

                {/* <input
                  className="contact-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxxx"
                /> */}
                <span className="contact-value">{phone || "—"}</span>

              </div>
            </div>

            {/* Verification + Researcher - only for non-staff */}
            {!isStaff && (
              <>
                {/* Verification */}
                <div className="verification-block">
                  <div className="verification-row">
                    <span className="verification-label">Resident Verification</span>

                    {verificationStatus === "verified" && (
                      <span className="verification-badge verified">Verified Resident</span>
                    )}
                    {verificationStatus === "pending" && (
                      <span className="verification-badge pending">Pending</span>
                    )}
                    {verificationStatus === "rejected" && (
                      <span className="verification-badge rejected">Rejected</span>
                    )}
                    {verificationStatus === "unverified" && (
                      <span className="verification-badge unverified">Unverified</span>
                    )}
                  </div>

                  {verificationStatus === "rejected" && verificationReason && (
                    <p className="verification-reason">Reason: {verificationReason}</p>
                  )}

                  {(verificationStatus === "unverified" || verificationStatus === "rejected") && (
                    <button className="verify-btn" onClick={() => setShowVerifyModal(true)}>
                      {verificationStatus === "rejected" ? "Resubmit Verification" : "Get Verified"}
                    </button>
                  )}

                  {verificationStatus === "pending" && (
                    <button className="verify-btn" disabled>
                      Verification Pending
                    </button>
                  )}
                </div>



              </>
            )}
          </div>
        </div>

        {/* Stats on the right */}
        {!isStaff && (
          <div className="stats">
            <div className="stat-item">
              <h1>{activeReports.length}</h1>
              <span>Total Reports</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <h1 className="verified-count">
                {reports.filter(
                  (r) =>
                    r.status.toLowerCase().includes("verified") ||
                    r.status.toLowerCase().includes("resolved")
                ).length}
              </h1>
              <span>Verified</span>
            </div>
          </div>
        )}
      </div>

      {/* Active Reports */}
      {!isStaff && (
        <>
          <div className="section-header">
            <h3 className="section-title">Active Reports</h3>
          </div>

          <div className="report-container">
            {loadingReports ? (
              <div className="report-loading">Loading reports...</div>
            ) : reportsError ? (
              <div className="report-error">{reportsError}</div>
            ) : reports.length === 0 ? (
              <div className="report-empty">No reports yet.</div>
            ) : (
              activeReports.map((report, index) => (
                <div key={report.id} className="report-row">
                  <ReportCard
                    key={report.id}
                    report={report}
                    onUpdate={updateReport}
                    autoOpen={autoOpenReportId === report.id}
                  />

                  {index !== activeReports.length - 1 && (
                    <div className="report-divider" />
                  )}

                </div>
              ))
            )}
          </div>


        </>
      )}

      {!isStaff && (
        <>
          <div className="section-header">
            <h3 className="section-title">Report History</h3>
          </div>

          <div className="report-container">
            {loadingReports ? (
              <div className="report-loading">Loading history...</div>
            ) : archivedReports.length === 0 ? (
              <div className="report-empty">No archived reports.</div>
            ) : (
              archivedReports.map((report, index) => (
                <div key={report.id} className="report-row">
                  <ReportCard
                    report={report}
                    onUpdate={updateReport}
                    autoOpen={autoOpenReportId === report.id}
                  />

                  {index !== archivedReports.length - 1 && (
                    <div className="report-divider" />
                  )}
                </div>
              ))
            )}
          </div>


        </>
      )}

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Verify as Cabuyao Resident</h3>
            <p className="modal-subtext">
              Submit your barangay details and a clear photo of your Barangay ID. Your request will be reviewed by an admin.
            </p>

            <div className="modal-field">
              <label>Barangay</label>
              <select value={barangay} onChange={(e) => setBarangay(e.target.value)}>
                <option value="">Select barangay</option>
                {getCabuyaoBarangays().map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no., street, purok/subdivision"
              />
            </div>

            <div className="modal-field">
              <label>Barangay ID</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBarangayIdFile(e.target.files?.[0] || null)}
              />
              {barangayIdFile && <small>Selected: {barangayIdFile.name}</small>}
            </div>

            <div className="modal-actions">
              <button className="save-btn" onClick={submitVerificationRequest} disabled={verifyLoading}>
                {verifyLoading ? "Submitting..." : "Submit"}
              </button>

              <button
                className="cancel-btn"
                onClick={() => {
                  setShowVerifyModal(false);
                  setBarangay("");
                  setAddress("");
                  setBarangayIdFile(null);
                }}
                disabled={verifyLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* {showResearcherModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Request Researcher Access</h3>
            <p className="modal-subtext">
              Provide your purpose and organization/school. Your request will be reviewed by an admin.
            </p>

            <div className="modal-field">
              <label>Purpose</label>
              <textarea
                value={researchPurpose}
                onChange={(e) => setResearchPurpose(e.target.value)}
                placeholder="Explain why you need researcher access (e.g., thesis study, data analysis, etc.)"
                rows={4}
              />
            </div>

            <div className="modal-field">
              <label>Organization / School</label>
              <input
                type="text"
                value={researchOrgSchool}
                onChange={(e) => setResearchOrgSchool(e.target.value)}
                placeholder="e.g., --- University"
              />
            </div>

            <div className="modal-field">
              <label>Attachment/Proof (optional)</label>
              <input
                type="file"
                onChange={(e) => setResearchAttachment(e.target.files?.[0] || null)}
              />
              {researchAttachment && <small>Selected: {researchAttachment.name}</small>}
            </div>

            <div className="modal-actions">
              <button className="save-btn" onClick={sendResearcherRequest} disabled={researchLoading}>
                {researchLoading ? "Submitting..." : "Submit"}
              </button>

              <button
                className="cancel-btn"
                onClick={() => {
                  setShowResearcherModal(false);
                  setResearchPurpose("");
                  setResearchOrgSchool("");
                  setResearchAttachment(null);
                }}
                disabled={researchLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )} */}


      {/* Logout */}
      <div className="logout-section">
        <span className="logout-label">Session</span>
        <button className="logout-btn" onClick={logout} type="button">
          Logout
        </button>
      </div>
    </div>
  )
};


export default ProfilePage;
