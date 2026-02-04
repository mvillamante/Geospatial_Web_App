import React from "react";
import { Link } from "react-router-dom";

import { Users, FileText, Clock, AlertTriangle, Shield, Newspaper } from "lucide-react";
import { StatsCard } from "./DashboardComponents/StatsCard";
import { ReportsTable } from "./DashboardComponents/ReportsTable";
import { UserDistributionChart } from "./DashboardComponents/UserDistributionChart";
import { ReportsStatusChart } from "./DashboardComponents/ReportsStatusChart";

import "./DashboardPage.css";

const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <div className="dashboard-subtitle">Overview of users, reports, and community content</div>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="stats-grid">
        <StatsCard
          title="Active Users"
          value="1,245"
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
        />

        <StatsCard
          title="Total Reports"
          value="3,428"
          icon={FileText}
          trend={{ value: 8.2, isPositive: true }}
        />

        <StatsCard
          title="Unassigned Reports"
          value="127"
          icon={Clock}
          trend={{ value: 3.1, isPositive: false }}
        />

        <StatsCard
          title="High/Critical Reports"
          value="18"
          icon={AlertTriangle}
          trend={{ value: 15.3, isPositive: false }}
        />
      </section>

      {/* Middle */}
      <section className="middle-grid">
        {/* Reports needing action */}
        <div className="span-2 panel">
          <div className="panel-head">
            <div className="panel-title">Reports Needing Action</div>
            <Link to="/main/admin/manage-reports" className="panel-link">
              View all reports
            </Link>
          </div>

          <ReportsTable />
        </div>

        {/* Action Center (right column) */}
        <div className="panel action-center">
          <div className="panel-head">
            <div className="panel-title">Action Center</div>
          </div>

          <div className="action-list">
            <div className="action-item">
              <div className="action-title">Unassigned reports</div>
              <div className="action-sub">Assign officers to pending cases</div>
              <button className="action-btn">Open</button>
            </div>


            <div className="action-item">
              <div className="action-title">CMS drafts</div>
              <div className="action-sub">Review unpublished community posts</div>
              <button className="action-btn">Open</button>
            </div>

            <div className="action-item">
              <div className="action-title">User management</div>
              <div className="action-sub">Review roles / disabled accounts</div>
              <button className="action-btn">Open</button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom */}
      <section className="bottom-grid">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Reports by Status</div>
          </div>
          <ReportsStatusChart />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">User Distribution</div>
          </div>
          <UserDistributionChart small />
        </div>
      </section>

    </div>
  );
};

export default DashboardPage;
