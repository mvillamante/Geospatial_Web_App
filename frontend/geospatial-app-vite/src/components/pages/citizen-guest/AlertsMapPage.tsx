// Current Alerts and Map Page (Citizen & Guest)
import React, { useState } from "react";
import "./AlertsMapPage.css";
import LeafletMap from "../../ui/LeafletMap";
import AlertsPanel from "./AlertsPanel";
import ReportDrawer from "./ReportDrawer";



interface Report {
  id: number;
  title: string;
  category: string;
  risk: "low" | "moderate" | "high" | "critical";
  location: string;
  time: string;
}

const AlertsMapPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchedBarangay, setSearchedBarangay] = useState("");
  const [searchedSeverity, setSearchedSeverity] = useState<string | null>(null);

  const handleBarangaySearch = (barangay: string, severity: string | null) => {
    setSearchedBarangay(barangay);
    setSearchedSeverity(severity);
  };

  // Handle when user clicks on a verified report card
  const handleSelectReport = (report: Report) => {
    // Extract barangay name from location (e.g., "Barangay Pulo" -> "Pulo")
    const barangayName = report.location.replace(/^Barangay\s+/i, "").trim();
    setSearchedBarangay(barangayName);
    setSearchedSeverity(report.risk);
  };

  return (
    <div className="main-layout-map">
      <div className="dashboard-container">
        {/* Alerts Panel */}
        <AlertsPanel 
          onReport={() => setIsDrawerOpen(true)} 
          onBarangaySearch={handleBarangaySearch}
          onSelectReport={handleSelectReport}
        />

        <div className="alerts-map">
          <LeafletMap 
            height="100vh" 
            searchedBarangay={searchedBarangay} 
            searchedSeverity={searchedSeverity}
          />
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
