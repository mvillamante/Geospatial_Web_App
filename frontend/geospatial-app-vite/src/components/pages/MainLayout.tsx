// Main Layout for all Users (navigations, tabs, map...etc)
import React from "react";
import { Outlet } from 'react-router-dom';
import { NavigationMenu } from "..";
import "./MainLayout.css";

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      {/* Navigation */}
      <NavigationMenu />

      {/* Main */}
      <Outlet />
    </div>
  );
};

export default MainLayout;

