// Current Alerts and Map Page (Citizen & Guest)
import React, { useState } from "react";
import "./AlertsMapPage.css";
import LeafletMap from "../../../components/ui/LeafletMap";
import AlertsPanel from "./AlertsPanel";
import type { Report } from "./AlertsPanel";
import ReportDrawer from "./ReportDrawer";

interface SelectedReportWithTimestamp {
  report: Report;
  clickedAt: number;
}

const AlertsMapPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(true);

  const [searchedBarangay, setSearchedBarangay] = useState("");
  const [searchedSeverity, setSearchedSeverity] = useState<string | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<SelectedReportWithTimestamp | null>(null);

  const handleBarangaySearch = (barangay: string, severity: string | null) => {
    setSearchedBarangay(barangay);
    setSearchedSeverity(severity);
    setSelectedReportData(null);
  };

  const handleSelectReport = (report: Report) => {
    setSelectedReportData({
      report,
      clickedAt: Date.now()
    });
    setSearchedBarangay("");
    setSearchedSeverity(null);
  };

  return (
    <div className="main-layout-map">
      <div className="dashboard-container">

        <div className="alerts-map">
          <LeafletMap
            height="100vh"
            searchedBarangay={searchedBarangay}
            searchedSeverity={searchedSeverity}
            selectedReport={selectedReportData?.report || null}
            reportClickTimestamp={selectedReportData?.clickedAt || null}
            activeLayers={["Verified Reports"]}
          />
        </div>

        <div
          className={`alerts-panel ${panelCollapsed ? "collapsed" : ""}`}
          onClick={() => panelCollapsed && setPanelCollapsed(false)}
        >
          <button
            type="button"
            className="sheet-handle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setPanelCollapsed((v) => !v);
            }}
            aria-expanded={!panelCollapsed}
            aria-label={panelCollapsed ? "Expand reports panel" : "Collapse reports panel"}
          >
            <div className="sheet-handle" />
          </button>


          {/* Alerts Panel */}
          <AlertsPanel
            onReport={() => setIsDrawerOpen(true)}
            onBarangaySearch={(b, s) => {
              setPanelCollapsed(false);
              handleBarangaySearch(b, s);
            }}
            onSelectReport={(r) => {
              setPanelCollapsed(false);
              handleSelectReport(r);
            }}
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
    </div >

  );
};

export default AlertsMapPage;
