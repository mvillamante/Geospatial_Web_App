import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AlertsMapPage.css";
import LeafletMap from "../../../components/ui/LeafletMap";
import AlertsPanel from "./AlertsPanel";
import type { Report } from "./AlertsPanel";
import ReportDrawer from "./ReportDrawer";
import { toast } from "sonner";

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

  const snapPoints = [0.15, 0.55, 0.9];
  const [snapIndex, setSnapIndex] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(snapPoints[1]);

  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const velocityRef = useRef(0);
  const lastMoveTimeRef = useRef(0);


  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = currentHeight;
    lastMoveTimeRef.current = Date.now();
  };
  const [userBarangay, setUserBarangay] = useState("");

  const [searchedBarangay, setSearchedBarangay] = useState("");
  const [searchedSeverity, setSearchedSeverity] = useState<string | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<SelectedReportWithTimestamp | null>(null);

  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);

  const activeLayers = useMemo(() => ["Verified Reports"], []);

  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const [reportTimeFilter, setReportTimeFilter] = useState<"all" | "today" | "7days" | "last30days" | "last12months">("7days");

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const fetchReports = async () => {
    setIsLoadingReports(true);

    try {
      let url = `${API_URL}/api/incident-reports/verified/`;

      if (reportTimeFilter !== "all") {
        url += `?time_filter=${encodeURIComponent(reportTimeFilter)}`;
      }

      const res = await fetch(url);

      if (!res.ok) throw new Error("Failed to fetch reports");

      const data = await res.json();
      console.log("API reports:", data);

      setReports(data.results || []);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportTimeFilter]);

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

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = startYRef.current - currentY;
    const deltaHeight = deltaY / window.innerHeight;

    const newHeight = Math.min(
      0.95,
      Math.max(0.1, startHeightRef.current + deltaHeight)
    );

    const now = Date.now();
    velocityRef.current = deltaY / (now - lastMoveTimeRef.current);
    lastMoveTimeRef.current = now;

    setCurrentHeight(newHeight);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    let projectedHeight = currentHeight;

    // Add momentum
    if (Math.abs(velocityRef.current) > 0.5) {
      projectedHeight += velocityRef.current * 0.2;
    }

    // Find nearest snap point
    const closestIndex = snapPoints.reduce((prev, curr, index) => {
      return Math.abs(curr - projectedHeight) <
        Math.abs(snapPoints[prev] - projectedHeight)
        ? index
        : prev;
    }, 0);

    setSnapIndex(closestIndex);
    setCurrentHeight(snapPoints[closestIndex]);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function checkVerification() {
      const token = localStorage.getItem("access_token");

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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const selectedReport = useMemo(
    () => selectedReportData?.report || null,
    [selectedReportData]
  )

  const reportTimestamp = useMemo(
    () => selectedReportData?.clickedAt || null,
    [selectedReportData]
  )

  return (
    <div className="main-layout-map">
      <div className="dashboard-container">

        <div className="alerts-map">
          <LeafletMap
            reports={reports}
            searchedBarangay={searchedBarangay}
            searchedSeverity={searchedSeverity}
            selectedReport={selectedReport}
            reportClickTimestamp={reportTimestamp}
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
          className="alerts-panel"
          onTouchStart={(e) => {
            if (!(e.target as HTMLElement).closest(".sheet-handle-btn")) return;
            handleTouchStart(e);
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={
            isMobile
              ? {
                height: `${currentHeight * 100}vh`,
                transition: isDragging
                  ? "none"
                  : "height 320ms cubic-bezier(0.22, 1, 0.36, 1)"
              }
              : {}
          }
        >
          {isMobile && (
            <button
              type="button"
              className="sheet-handle-btn"
              onClick={(e) => {
                e.stopPropagation();

                const nextIndex = (snapIndex + 1) % snapPoints.length;
                setSnapIndex(nextIndex);
                setCurrentHeight(snapPoints[nextIndex]);
              }}
              aria-label="Adjust reports panel height"
            >
              <div className="sheet-handle" />
            </button>
          )}


          {/* Alerts Panel */}
          <AlertsPanel
            reports={reports}
            isLoadingReports={isLoadingReports}
            onReport={() => {
              if (isVerified === null) return;

              if (!token) {
                toast.error("You must log in before reporting an incident");
                setShowRedirectPopup(true);
                return;
              }

              if (isVerified === false) {
                toast.warning("Please verify your account first");
                setShowVerifyPrompt(true);
                return;
              }

              setIsDrawerOpen(true);
            }}
            onBarangaySearch={(b, s) => {
              setSnapIndex(1);
              setCurrentHeight(snapPoints[1]);
              handleBarangaySearch(b, s);
            }}

            onSelectReport={(r) => {
              const collapsedIndex = 0;

              setSnapIndex(collapsedIndex);
              setCurrentHeight(snapPoints[collapsedIndex]);

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
