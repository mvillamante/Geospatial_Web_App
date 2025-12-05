// Main Layout for all Users (navigations, tabs, map...etc)
import React from "react";
import { DashboardPage, NavigationMenu } from ".";
import "../styles/mainlayout.css";

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      {/* Header */}
      <header className="main-layout-header">
        Header Area
      </header>

      {/* Body */}
      <div className="main-layout-body">
        {/* Navigation Sidebar */}
        <aside className="main-layout-sidebar">
          <NavigationMenu />
        </aside>

        {/* Main Dashboard Content */}
        <main className="main-layout-content">
          <DashboardPage />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
