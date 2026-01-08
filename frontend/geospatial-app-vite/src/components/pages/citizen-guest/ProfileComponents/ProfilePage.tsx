
import React, { useState } from "react";
import ReportCard from './ReportCard';
import "./ProfilePage.css";
import { getUserRoleAndDisplayName } from "../../../../lib/auth";

const mockReports = [
  {
    id: 1,
    title: "Residential Fire",
    description: "Fire reported near residential area. Firefighters on site.",
    location: "Brgy. San Isidro",
    date: "Jan 8, 2025",
    status: "Under Review", // Options: "Pending", "Under Review", "Resolved"
    progress: 0.5, // 50%
    photo: "https://images.unsplash.com/photo-1542345812-d9620567158a?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: 2,
    title: "Road Crash",
    description: "Multi-vehicle accident resolved. No casualties reported.",
    location: "Brgy. San Isidro",
    date: "Jan 7, 2025",
    status: "Resolved",
    progress: 1, // 100%
    photo: "https://images.unsplash.com/photo-1599413410222-09252c797441?auto=format&fit=crop&q=80&w=300"
  }
];

const ProfilePage: React.FC = () => {
  const [isRequested, setIsRequested] = useState(false);
  const { displayName, userRole, profilePath } = getUserRoleAndDisplayName();

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
            <p className="role-tag">{userRole}</p>
            <button 
              className={`research-btn ${isRequested ? 'requested' : ''}`}
              onClick={() => setIsRequested(true)}
            >
              {isRequested ? "Request Sent" : "Request Researcher Access"}
            </button>
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