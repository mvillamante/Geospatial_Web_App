// Current Alerts and Map Page (Citizen & Guest)
import React, { useState } from "react";
import "./AlertsMapPage.css";
import LeafletMap from "../../ui/LeafletMap";
import AlertsPanel from "./AlertsPanel";
import ReportDrawer from "./ReportDrawer";



const AlertsMapPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="main-layout-map">
      <div className="dashboard-container">
        {/* Alerts Panel */}
        <AlertsPanel onReport={() => setIsDrawerOpen(true)} />

        <div className="alerts-map">
          <LeafletMap height="100vh" />
        </div>

        {/* Floating Controls */}
        <div className="map-legend-box">
          <h4>Severity Level</h4>
          <ul>
            <li className="low">Low Risk</li>
            <li className="moderate">Moderate Risk</li>
            <li className="high">High Risk</li>
            <li className="critical">Critical Risk</li>
          </ul>
        </div>

        {/* Drawer */}
        <ReportDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>
    </div>
  );
};

export default AlertsMapPage;
