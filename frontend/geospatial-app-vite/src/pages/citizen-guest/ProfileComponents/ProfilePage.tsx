import React, { useState } from "react";
import { GraduationCap } from "lucide-react";
import ReportCard from './ReportCard';
import "./ProfilePage.css";
import { getUserRoleAndDisplayName } from "../../../libr/auth";

const mockReports = [
  {
    id: 1,
    title: "Residential Fire",
    description: "Fire reported near residential area. Firefighters on site.",
    location: "Brgy. San Isidro",
    date: "Jan 8, 2025",
    status: "Under Review",
    progress: 0.5,
    photo: "https://i.pinimg.com/736x/d9/cc/08/d9cc08adf42d5f64e2883b0d2e66448b.jpg"
  },
  {
    id: 2,
    title: "Road Crash",
    description: "Multi-vehicle accident resolved. No casualties reported.",
    location: "Brgy. San Isidro",
    date: "Jan 7, 2025",
    status: "Resolved",
    progress: 1,
    photo: "https://i.pinimg.com/736x/c2/4e/bc/c24ebcb2058f189d3e7dba4e49414956.jpg"
  }
];

const ProfilePage: React.FC = () => {
  const { displayName, userRole, userRole2, profilePath } = getUserRoleAndDisplayName();

  const [isRequested, setIsRequested] = useState(false);

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
            <h1 className="verified-count">10</h1>
            <span>Verified</span>
          </div>
        </div>
      </div>

      

      <div className="section-header">
        <h3 className="section-title">Report History</h3>
      </div>

      <div className="report-list">
        {mockReports.map(report => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;