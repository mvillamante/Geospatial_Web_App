import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
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
};

type ProgressStatus = "Pending" | "In Progress" | "Resolved";

function toProgressStatus(raw: string | undefined | null): ProgressStatus {
  const s = (raw || "").toLowerCase();

  if (s === "resolved") return "Resolved";
  if (s === "in_progress" || s === "in progress" || s === "verified") return "In Progress";

  return "Pending";
}
const ProfilePage: React.FC = () => {
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
    navigate("/login");
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


  const sendResearcherRequest = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch("http://127.0.0.1:8000/api/researcher/request/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to send request");
        return;
      }

      // Success
      setIsRequested(true);
      alert("Researcher request sent!");
    } catch (err) {
      console.error("Request failed:", err);
    }
  };

  const mockAvatarUrl =
    "https://i.pinimg.com/736x/53/ce/e1/53cee1111732dcf17bb5518213ff215a.jpg";

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-card">

        <div className="profile-left">
          <div className="avatar-wrapper">

            <img
              className="avatar"
              src={mockAvatarUrl}
              alt={`${displayName} avatar`}
            />
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
                  <button className="edit-btn" onClick={() => setIsEditingProfile(true)} disabled={profileLoading}>
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
            {!isStaff && (
              <>
                {(!userRole2?.length || userRole2[0] === "") && userRole !== "Researcher" && (
                  <button
                    className={`research-btn ${isRequested ? 'requested' : ''}`}
                    onClick={sendResearcherRequest}
                    disabled={isRequested}
                  >
                    <GraduationCap size={16} className="cap-icon" />
                    {isRequested ? "Request Sent" : "Request Researcher Access"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

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

      {!isStaff && (
        <>
          <div className="section-header">
            <h3 className="section-title">Report History</h3>
          </div>

          <div className="report-list">
            {loadingReports && <p>Loading report history...</p>}
            {reportsError && <p style={{ color: "crimson" }}>{reportsError}</p>}
            {!loadingReports && !reportsError && reports.length === 0 && <p>No reports yet.</p>}

            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </>
      )}

      <div className="logout-section">
        <span className="logout-label">Session</span>
        <button className="logout-btn" onClick={logout} type="button">
          Logout
        </button>
      </div>
    </div>

  );
};

export default ProfilePage;
