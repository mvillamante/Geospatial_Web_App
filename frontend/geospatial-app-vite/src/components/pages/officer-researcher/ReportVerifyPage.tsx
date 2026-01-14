import React from "react";
import './ReportVerifyPage.css';
import { MapPin, Users } from "lucide-react";
import { getUserRoleAndDisplayName } from "../../../libr/auth";

const ReportVerifyPage: React.FC = () => {
  const { userRole, displayName, profilePath } = getUserRoleAndDisplayName();

  return (
    <div className="reportverify-page"> 
      <div className="reportverify-header">
        <div className="reportverify-header-title">
          <MapPin className="reportverify-title-icon" />
          <h1>Report Verification</h1>
        </div>

        <p className="reportverify-header-desc">
          Review and validate citizen hazard reports
        </p>
      </div>

      <div className="evac-stat-container">
        <div className="evac-stat-card evac-stat-primary">
          <div className="evac-stat-text">
            <h3>Total Reports</h3>
            <p className="evac-card-value">4</p>
          </div>
          <MapPin className="evac-card-icon" />
        </div>

        <div className="evac-stat-card evac-stat-secondary">
          <div className="evac-stat-text">
            <h3>Pending Review</h3>
            <p className="evac-card-value">3</p>
            </div>
          <Users className="evac-card-icon" />
        </div>

         <div className="evac-stat-card evac-stat-primary">
          <div className="evac-stat-text">
            <h3>Validated</h3>
            <p className="evac-card-value">1</p>
          </div>
          <MapPin className="evac-card-icon" />
        </div>
      </div>



    </div>
  );
};

export default ReportVerifyPage;

