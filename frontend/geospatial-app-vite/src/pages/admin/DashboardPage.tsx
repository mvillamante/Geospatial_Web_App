import { Users, FileText, Clock, AlertTriangle } from "lucide-react";
import { StatsCard } from "./DashboardComponents/StatsCard";
import { ReportsTable } from "./DashboardComponents/ReportsTable";
import { UserDistributionChart } from "./DashboardComponents/UserDistributionChart";
import { QuickActions } from "./DashboardComponents/QuickActions";
import { ActiveAlertsGuides } from './DashboardComponents/ActiveAlertsGuides';
import React from "react";
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-page">
      <section className="stats-grid">
        <StatsCard
          title="Total Active Users"
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
          title="Pending Reports"
          value="127"
          icon={Clock}
          trend={{ value: 3.1, isPositive: false }}
        />
        <StatsCard
          title="Active Alerts"
          value="18"
          icon={AlertTriangle}
          trend={{ value: 15.3, isPositive: false }}
        />
      </section>

      <section className="middle-grid">
        <div className="span-2">
          <ReportsTable />
          {/* 
          <div>
            <Hazard /> */}
        </div>
      </section>

      <section className="bottom-grid">
        <UserDistributionChart/>
        <ActiveAlertsGuides />
        <QuickActions />
      </section>


    </div>
  );
};

export default DashboardPage;

