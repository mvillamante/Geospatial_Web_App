import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("access_token");

  const navigate = useNavigate();
  const location = useLocation();
  const openIncidentId = location.state?.openIncidentId;
  // const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const [userBarangay, setUserBarangay] = useState("");

  const [searchedBarangay, setSearchedBarangay] = useState("");
  const [searchedSeverity, setSearchedSeverity] = useState<string | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<SelectedReportWithTimestamp | null>(null);

  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);

  const activeLayers = useMemo(() => ["Verified Reports"], []);

  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const [reportTimeFilter, setReportTimeFilter] = useState<"all" | "today" | "7days" | "last30days" | "last12months">("all");

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

      console.log("isVerified:", isVerified);
      console.log("userBarangay:", userBarangay);

      if (!token) {
        setIsVerified(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/users/me/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        setIsVerified(false);
        return;
      }


      const data = await res.json();
      setIsVerified(!!data.is_resident_verified);
      setUserBarangay(data.barangay || "");
    }

    checkVerification();
  }, []);

  return (
    <div className="main-layout-map">
      <div className="dashboard-container">

        <div className="alerts-map">
          <LeafletMap
            searchedBarangay={searchedBarangay}
            searchedSeverity={searchedSeverity}
            selectedReport={selectedReportData?.report || null}
            reportClickTimestamp={selectedReportData?.clickedAt || null}
            activeLayers={activeLayers}
            reportTimeFilter={reportTimeFilter}
          />

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

          {/* {isVerified === false && (
            <div className="map-overlay">
              <div className="verification-message">
                Verify your account to view hazards near your area.
              </div>
            </div>
          )} */}
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
            onReport={() => {
              if (isVerified === null) return;

              if (!token) {
                setShowRedirectPopup(true);
                return;
              }

              if (isVerified === false) {
                setShowVerifyPrompt(true);
                return;
              }

              setIsDrawerOpen(true);
            }}
            onBarangaySearch={(b, s) => {
              setPanelCollapsed(false);
              handleBarangaySearch(b, s);
            }}
            onSelectReport={(r) => {
              setPanelCollapsed(false);
              handleSelectReport(r);
            }}
            initialOpenIncidentId={openIncidentId}
            isVerified={isVerified}
            userBarangay={userBarangay}
            reportTimeFilter={reportTimeFilter}
            setReportTimeFilter={setReportTimeFilter}
          />


        </div>


        {/* Drawer */}
        <ReportDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />

        {showVerifyPrompt && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <h3>Verification Required</h3>
              <p>
                You need to get verified as a Cabuyao resident before you can report incidents.
              </p>
              <div className="modal-actions">
                <button
                  className="save-btn"
                  onClick={() => {
                    setShowVerifyPrompt(false);
                    navigate("/main/citizen/profile", {
                      state: { openVerifyModal: true }
                    });
                  }}
                >
                  Get Verified
                </button>

                <button
                  className="cancel-btn"
                  onClick={() => setShowVerifyPrompt(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showRedirectPopup && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <h3>Login Required</h3>
              <p>
                You must log in before you can report an incident.
              </p>

              <div className="modal-actions">
                <button
                  className="save-btn"
                  onClick={() => {
                    setShowRedirectPopup(false);
                    navigate("/?modal=login");
                  }}
                >
                  Login Now
                </button>

                <button
                  className="cancel-btn"
                  onClick={() => setShowRedirectPopup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsMapPage;
