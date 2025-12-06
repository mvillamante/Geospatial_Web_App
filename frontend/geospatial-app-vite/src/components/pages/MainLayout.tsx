// Main Layout for all Users (navigations, tabs, map...etc)
import React from "react";
import { DashboardPage, NavigationMenu } from ".";
import "../styles/mainlayout.css";

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      {/* Navigation / Header column */}
      <div className="main-layout-sidebar">
        <NavigationMenu />
      </div>

      {/* Map */}
      <div className="main-layout-map">
        <DashboardPage />
      </div>
    </div>
  );
};

export default MainLayout;

