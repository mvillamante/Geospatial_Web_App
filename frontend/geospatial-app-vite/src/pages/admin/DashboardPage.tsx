import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Users, FileText, Clock, AlertTriangle } from "lucide-react";
import { StatsCard } from "./DashboardComponents/StatsCard";
import { ReportsTable } from "./DashboardComponents/ReportsTable";
import { UserDistributionChart } from "./DashboardComponents/UserDistributionChart";
import { ReportsStatusChart } from "./DashboardComponents/ReportsStatusChart";
import { ActionCenter } from "./DashboardComponents/ActionCenter";
import "./DashboardPage.css";

const API_URL = import.meta.env.VITE_API_URL;

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<{
    active_users: number;
    total_reports: number;
    unassigned_reports: number;
    high_critical_reports: number;
  } | null>(null);
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/stats`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch dashboard stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboardStats();
  }, []);
  return (
    <div className="dashboard-page">
      {/* Header */}
      {/* <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <div className="dashboard-subtitle">Overview of users, reports, and community content</div>
        </div>
      </div> */}

      {/* KPI Cards */}
      <section className="stats-grid">
        <StatsCard
          title="Active Users"
          value={stats ? stats.active_users.toLocaleString() : "..."}
          icon={Users}
        />

        <StatsCard
          title="Total Reports"
          value={stats ? stats.total_reports.toLocaleString() : "..."}
          icon={FileText}
        />

        <StatsCard
          title="Unassigned Reports"
          value={stats ? stats.unassigned_reports.toLocaleString() : "..."}
          icon={Clock}
        />

        <StatsCard
          title="High / Critical Reports"
          value={stats ? stats.high_critical_reports.toLocaleString() : "..."}
          icon={AlertTriangle}
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

        <ActionCenter />
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
