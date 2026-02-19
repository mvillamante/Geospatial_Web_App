import React, { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

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
  const location = useLocation();
  const openIncidentId = location.state?.openIncidentId;
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(true);

  const [searchedBarangay, setSearchedBarangay] = useState("");
  const [searchedSeverity, setSearchedSeverity] = useState<string | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<SelectedReportWithTimestamp | null>(null);

  const activeLayers = useMemo(() => ["Verified Reports"], []);

  const [isVerified, setIsVerified] = useState<boolean | null>(null);

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


  useEffect(() => {
    async function checkVerification() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setIsVerified(false);
        return;
      }

      const res = await fetch("http://localhost:8000/api/users/me/", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        setIsVerified(false);
        return;
      }

      const data = await res.json();
      const rawStatus = (data.verification_status || "").toLowerCase();

      setIsVerified(rawStatus === "approved" || rawStatus === "verified");

    }

    checkVerification();
  }, []);

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
            activeLayers={activeLayers}
          />

          {isVerified === false && (
            <div className="map-overlay">
              <div className="verification-message">
                Verify your account to view hazards near your area.
              </div>
            </div>
          )}
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
          {isVerified && (
            <AlertsPanel
              onReport={() => setIsDrawerOpen(true)}
              onBarangaySearch={(b, s) => {
                setPanelCollapsed(false);
                handleBarangaySearch(b, s);
              }}
              onSelectReport={(r) => {
                setPanelCollapsed(false);
                handleSelectReport(r);
                setSelectedReport(r);
              }}
              initialOpenIncidentId={openIncidentId}
            />
          )}


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
