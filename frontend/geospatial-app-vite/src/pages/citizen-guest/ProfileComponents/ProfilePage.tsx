import React, { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import ReportCard from './ReportCard';
import "./ProfilePage.css";
import { getUserRoleAndDisplayName } from "../../../libr/auth";

type ReportCardModel = {
  id: number | string;
  title: string;
  description: string;
  category: string;
  location_display: string;
  date: string;
  status: string;
  progress: number;
  photo?: string | null;
}

type IncidentReportAPI = {
  id: number;
  category: string;
  description: string;
  location_display?: string;
  created_at?: string;
  status?: string;
  photo_url?: string | null; 
};


const ProfilePage: React.FC = () => {
  const { displayName, userRole, userRole2 } = getUserRoleAndDisplayName();

  const [isRequested, setIsRequested] = useState(false);

  const [reports, setReports] = useState<ReportCardModel[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const categoryTitleMap: Record<string, string> = {
    fire: "Fire Incident",
    flood: "Flood Incident",
    accident: "Road Accident",
    landslide: "Landslide Alert",
    others: "Reported Incident",
  };

    useEffect(() => {
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

            const status = r.status || r.verification_status || "Pending";

            let progress = 0;
            if (typeof r.progress === "number") {
              progress = r.progress > 1 ? Math.min(r.progress / 100, 1) : Math.min(r.progress, 1);
            } else {
              progress =
                status.toLowerCase().includes("resolved") ? 1 :
                  status.toLowerCase().includes("review") ? 0.5 :
                    0.25;
            }
            return {
              id: r.id,
              title: categoryTitleMap[r.category] || "Incident Report",
              description: r.description || "No description provided.",
              location: r.location_display || r.barangay || "Unknown location",
              date: dateStr,
              status,
              progress,
              photo: r.photo_url ||  null,
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
      fetchMyReports();
    }, []);

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

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="avatar-wrapper">
            <div className="avatar" />
            <div className="online-indicator" />
          </div>
          <div className="profile-info">
            <h2>{displayName}</h2>
            <p className="role-tag">
              {userRole}
              {userRole2?.[0] ? ` & ${userRole2[0]}` : ""}
            </p>

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

          </div>
        </div>

        <div className="stats">
          <div className="stat-item">
            <h1>12</h1>
            <span>Total Reports</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <h1 className="verified-count">{reports.filter(r => r.status.toLowerCase().includes("verified") || r.status.toLowerCase().includes("resolved")).length}</h1>
            <span>Verified</span>
          </div>
        </div>
      </div>



      <div className="section-header">
        <h3 className="section-title">Report History</h3>
      </div>

      <div className="report-list">
        {loadingReports && <p>Loading report history...</p>}
        {reportsError && <p style={{ color: "crimson" }}>{reportsError}</p>}
        {!loadingReports && !reportsError && reports.length === 0 && (
          <p>No reports yet.</p>
        )}

        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;