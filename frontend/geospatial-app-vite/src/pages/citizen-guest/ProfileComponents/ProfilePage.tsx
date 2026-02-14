import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Rss } from "lucide-react";
import ReportCard from './ReportCard';
import "./ProfilePage.css";
import { getUserRoleAndDisplayName } from "../../../libr/auth";

type ReportCardModel = {
  id: number | string;
  title: string;
  description: string;
  category: string;
  other_category?: string | null;
  location_display: string;
  date: string;
  progressStatus: "Pending" | "In Progress" | "Resolved";
  status: string;
  progress: number;
  photo?: string | null;
  officer_note: string | null;
  needs_info_note?: string;
  reply_message?: string | null;
  reply_image_url?: string | null;
};

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
  officer_note: string | null;
  needs_info_note?: string;
  reply_message?: string | null;
  reply_image_url?: string | null;
};

type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
type ResearcherStatus = "none" | "pending" | "approved" | "rejected";

type ProgressStatus = "Pending" | "In Progress" | "Resolved";

function toProgressStatus(raw: string | undefined | null): ProgressStatus {
  const s = (raw || "").toLowerCase();

  if (s === "resolved") return "Resolved";
  if (s === "in_progress" || s === "in progress" || s === "verified") return "In Progress";

  return "Pending";
}
const ProfilePage: React.FC = () => {
  const [researcherStatus, setResearcherStatus] = useState<ResearcherStatus>("none");
  const [researcherReason, setResearcherReason] = useState("");

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("unverified");
  const [verificationReason, setVerificationReason] = useState<string>("");

  const [showResearcherModal, setShowResearcherModal] = useState(false);
  const [researchPurpose, setResearchPurpose] = useState("");
  const [researchOrgSchool, setResearchOrgSchool] = useState("");
  const [researchAttachment, setResearchAttachment] = useState<File | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);


  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [barangay, setBarangay] = useState("");
  const [address, setAddress] = useState("");
  const [barangayIdFile, setBarangayIdFile] = useState<File | null>(null);

  const [verifyLoading, setVerifyLoading] = useState(false);

  const CABUYAO_BARANGAYS = [
    "Banaybanay",
    "Bigaa",
    "Butong",
    "Casile",
    "Diezmo",
    "Gulod",
    "Mamatid",
    "Marinig",
    "Niugan",
    "Pittland",
    "Pulo",
    "Sala",
    "San Isidro",
    "Baclaran",
    "Barangay Dos",
    "Barangay Tres",
    "Barangay Uno"
  ]

  const navigate = useNavigate();
  const { displayName, userRole, userRole2 } = getUserRoleAndDisplayName();

  const normalizedRole = (userRole || "").toLowerCase();
  const normalizedRole2 = (userRole2?.[0] || "").toLowerCase();

  const isStaff =
    normalizedRole === "admin" ||
    normalizedRole === "officer" ||
    normalizedRole2 === "admin" ||
    normalizedRole2 === "officer";

  const [isRequested, setIsRequested] = useState(false);

  const [reports, setReports] = useState<ReportCardModel[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [originalEmail, setOriginalEmail] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const logout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  }

  const categoryTitleMap: Record<string, string> = {
    fire: "Fire Incident",
    flood: "Flood Incident",
    accident: "Road Accident",
    landslide: "Landslide Alert",
    others: "Reported Incident",
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("http://localhost:8000/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load profile")
        }

        const data = await res.json();

        const rStatus = (data.researcher_status || "none").toLowerCase();
        setResearcherStatus(
          rStatus === "pending" || rStatus === "approved" || rStatus === "rejected"
            ? rStatus
            : "none"
        );

        setResearcherReason(data.researcher_rejection_reason || "");

        const vStatus = (data.verification_status || "unverified").toLowerCase();
        setVerificationStatus(
          vStatus === "pending" || vStatus === "verified" || vStatus === "rejected"
            ? vStatus
            : "unverified"
        );

        const fixedV = vStatus === "approved" ? "verified" : vStatus

        setVerificationReason(data.verification_rejection_reason || "");

        const e = data.email ?? "";
        const p = data.phone ?? "";

        setEmail(e);
        setPhone(p);
        setOriginalEmail(e);
        setOriginalPhone(p);
      } catch (e: any) {
        setProfileError(e?.message || "Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile();



    const fetchMyReports = async () => {
      setLoadingReports(true);
      setReportsError(null);

      try {
        const token = localStorage.getItem("access_token");

        const res = await fetch("http://localhost:8000/api/reports/my/", {
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

        const mapped: ReportCardModel[] = list.map((r) => {
          const dateStr = r.created_at
            ? new Date(r.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            : "";

          const rawStatus = r.status || (r as any).verification_status || "Pending";
          const progressStatus = toProgressStatus(rawStatus);

          const progress =
            rawStatus.toLowerCase().includes("resolved") ? 1 :
              rawStatus.toLowerCase().includes("in_progress") ? 0.6 :
                0.25;


          const customTitle =
            r.category === "others" && r.other_category?.trim()
              ? r.other_category.trim()
              : null;

          return {
            id: r.id,
            title: customTitle ? customTitle : (categoryTitleMap[r.category] || "Incident Report"),
            description: r.description || "No description provided.",
            location: r.location_display || "Unknown location",
            date: dateStr,
            status: rawStatus,
            progressStatus,
            progress,
            photo: r.photo_url || null,
            officer_note: r.officer_note || null,
            needs_info_note: r.needs_info_note || null,
            reply_message: r.reply_message || null,
            reply_image_url: r.reply_image_url || null,
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


  const saveProfile = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch("http://localhost:8000/api/users/me/", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update profile");
      }

      setOriginalEmail(email);
      setOriginalPhone(phone);
      setIsEditingProfile(false);
      alert("Profile updated!")
    } catch (e: any) {
      alert(e?.message || "Update failed");
    }
  };

  const cancelEditProfile = () => {
    setEmail(originalEmail);
    setPhone(originalPhone);
    setIsEditingProfile(false);
  }

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:8000/api/users/change-password/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to change password");
      }

      alert("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      alert(e?.message || "Password change failed");
    } finally {
      setPasswordLoading(false);
    }
  };

  const isVerifiedResident = verificationStatus === "verified";


  const sendResearcherRequest = async () => {

    if (verificationStatus !== "verified") {
      alert("You must be a Verified Resident before requesting Researcher Access.");
      return;
    }


    if (!researchPurpose.trim()) return alert("Please enter your purpose.");
    if (!researchOrgSchool.trim()) return alert("Please enter your organization/school.");

    setResearchLoading(true);

    try {
      const token = localStorage.getItem("access_token");

      const formData = new FormData();
      formData.append("purpose", researchPurpose.trim());
      formData.append("orgSchool", researchOrgSchool.trim());
      if (researchAttachment) formData.append("attachment", researchAttachment)

      const res = await fetch("http://localhost:8000/api/researcher/request/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          data.detail ||
          (typeof data === "object" ? JSON.stringify(data) : "Failed to send request");
        alert(msg);
        return;
      }

      // Success
      setResearcherStatus("pending");
      setResearcherReason("");
      setIsRequested(true)

      setShowResearcherModal(false);

      setResearchPurpose("");
      setResearchOrgSchool("");
      setResearchAttachment(null);

      alert("Researcher request sent!");
    } catch (err) {
      console.error("Request failed:", err);
      alert("Request failed.");
    }
  };

  const submitVerificationRequest = async () => {
    if (!barangay.trim()) {
      alert("Please select your barangay.");
      return;
    }
    if (!address.trim()) {
      alert("Please enter your address.");
      return;
    }
    if (!barangayIdFile) {
      alert("Please upload your Barangay ID.");
      return;
    }

    setVerifyLoading(true);
    try {
      const token = localStorage.getItem("access_token");

      const formData = new FormData();
      formData.append("barangay", barangay.trim()),
        formData.append("address", address.trim()),
        formData.append("id_image", barangayIdFile);

      const res = await fetch("http://127.0.0.1:8000/api/resident-verification/request/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.detail || "Failed to submit verification request.");
        return;
      }

      setVerificationStatus("pending");
      setVerificationReason("");
      setShowVerifyModal(false);

      setBarangay("");
      setAddress("");
      setBarangayIdFile(null);

      alert("Verification request submitted!");
    } catch (e: any) {
      alert(e?.message || "Verification request failed");
    } finally {
      setVerifyLoading(false);
    }
  };

  const updateReport = (updatedReport: ReportCardModel) => {
    setReports((prev) =>
      prev.map((r) => (r.id === updatedReport.id ? { ...r, ...updatedReport } : r))
    );
  };

  const mockAvatarUrl =
    "https://i.pinimg.com/736x/53/ce/e1/53cee1111732dcf17bb5518213ff215a.jpg";

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="avatar-wrapper">
            <img className="avatar" src={mockAvatarUrl} alt={`${displayName} avatar`} />
            <div className="online-indicator" />
          </div>

          <div className="profile-info">
            <h2>{displayName}</h2>

            <p className="role-tag">
              {userRole}
              {userRole2?.[0] ? ` & ${userRole2[0]}` : ""}
            </p>

            <div className="contact-section">
              <div className="contact-row">
                <span className="contact-label">Email</span>
                {isEditingProfile ? (
                  <input
                    className="contact-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                ) : (
                  <span className="contact-value">{email || "—"}</span>
                )}
              </div>

              <div className="contact-row">
                <span className="contact-label">Phone</span>
                {isEditingProfile ? (
                  <input
                    className="contact-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xx xxx xxxx"
                  />
                ) : (
                  <span className="contact-value">{phone || "—"}</span>
                )}
              </div>

              <div className="contact-actions">
                {!isEditingProfile ? (
                  <button
                    className="edit-btn"
                    onClick={() => setIsEditingProfile(true)}
                    disabled={profileLoading}
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button className="save-btn" onClick={saveProfile}>
                      Save
                    </button>
                    <button className="cancel-btn" onClick={cancelEditProfile}>
                      Cancel
                    </button>
                  </>
                )}
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

                {/* Researcher Access */}
                {userRole !== "Researcher" && (
                  <div style={{ marginTop: 10 }}>
                    {!isVerifiedResident && (
                      <p className="verification-reason">
                        You must be a <b>Verified Resident</b> before requesting Researcher Access.
                      </p>
                    )}

                    {researcherStatus === "rejected" && researcherReason && (
                      <p className="verification-reason">Reason: {researcherReason}</p>
                    )}

                    {(researcherStatus === "none" || researcherStatus === "rejected") && (
                      <button
                        className={`research-btn ${isRequested ? "requested" : ""}`}
                        onClick={() => setShowResearcherModal(true)}
                        disabled={isRequested || !isVerifiedResident}
                        title={!isVerifiedResident ? "Verify your resident status first" : ""}
                      >
                        <GraduationCap size={16} className="cap-icon" />
                        {isRequested ? "Request Sent" : "Request Researcher Access"}
                      </button>
                    )}

                    {researcherStatus === "pending" && (
                      <button className="research-btn requested" disabled>
                        <GraduationCap size={16} className="cap-icon" />
                        Researcher Request Pending
                      </button>
                    )}

                    {researcherStatus === "approved" && (
                      <button className="research-btn requested" disabled>
                        <GraduationCap size={16} className="cap-icon" />
                        Researcher Access Approved
                      </button>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </div>

        {/* Stats on the right */}
        {!isStaff && (
          <div className="stats">
            <div className="stat-item">
              <h1>{reports.length}</h1>
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

      {/* Security */}
      <div className="section-header section-header-row">
        <h3 className="section-title">Security</h3>

        <button
          className="security-toggle-btn"
          onClick={() => setShowPasswordForm((v) => !v)}
          aria-expanded={showPasswordForm}
        >
          {showPasswordForm ? "Close" : "Change Password"}
        </button>
      </div>

      {showPasswordForm && (
        <div className="security-card">
          <div className="security-row">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="security-row">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="security-row">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="security-actions">
            <button className="save-btn" onClick={changePassword} disabled={passwordLoading}>
              {passwordLoading ? "Changing..." : "Update Password"}
            </button>

            <button
              className="cancel-btn"
              onClick={() => {
                setShowPasswordForm(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={passwordLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Reports */}
      {!isStaff && (
        <>
          <div className="section-header">
            <h3 className="section-title">Active Reports</h3>
          </div>

          <div className="report-list">
            {loadingReports && <p>Loading report history...</p>}
            {reportsError && <p style={{ color: "crimson" }}>{reportsError}</p>}
            {!loadingReports && !reportsError && reports.length === 0 && <p>No reports yet.</p>}

            {reports.map((report) => (
              <ReportCard key={report.id} report={report} onUpdate={updateReport} />
            ))}
          </div>
        </>
      )}

      {!isStaff && (
        <>
          <div className="section-header">
            <h3 className="section-title">Report History</h3>
          </div>

          <div className="report-list">
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
                {CABUYAO_BARANGAYS.map((b) => (
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

      {showResearcherModal && (
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
      )}


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
