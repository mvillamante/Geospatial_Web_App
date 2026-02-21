import React, { useState, useEffect, type JSX } from "react";
import DbChartsSection from "./right/DbChartsSection";
import DbAnalyticsSection from "./right/DbAnalyticsSection";
import DbExportSection from "./right/DbExportSection";
import ChartExportPool from "./right/ChartExportPool";
import "../DashboardMapPage.css";

interface RightPanelProps {
  isOpen: boolean;
  toggle: () => void;
  rightNav: "analytics" | "export";
  setRightNav: (val: "analytics" | "export") => void;
  exportSections: any[];
  recentDownloads: any[];
  handleDownload: (item: any, section: string) => void;
  // Props for charts section
  universalGreenAvg?: number | null;
  universalHazardAvg?: number | null;
  universalCalamityAvg?: number | null;
  mapView?: string;
  selected?: string;
  year?: number;
  greenCityAverage?: number | null;
  hazardCityAverage?: number | null;
  calamityCityAverage?: number | null;

  // Per-barangay data for KPI summaries
  greenDataByBarangay?: Record<string, any> | null;
  hazardDataByBarangay?: Record<string, any> | null;
  calamityDataByBarangay?: Record<string, any> | null;

  getHazardIndexColor?: (val: number) => string;
  getGreenIndexColor?: (val: number) => string;
  getCalamityRiskColor?: (val: number) => string;
  
  // Props for analytics
  keyInsights?: any[];
  colors?: string[];
  insightIcons?: JSX.Element[];
  userRole?: string;
  userRole2?: string[];
  setShowEdaModal?: (val: boolean) => void;
  showEdaModal?: boolean;
  // Props for EDA modal
  edaSect?: "edastats" | "modelperf";
  setEdaSect?: React.Dispatch<
    React.SetStateAction<"edastats" | "modelperf">
  >;
  statisticalSummaryItems?: any[];
  keyFindings?: any[];
  modelHealthItems?: any[];
}

const DbRightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  toggle,
  rightNav,
  setRightNav,
  exportSections,
  recentDownloads,
  handleDownload,

  keyInsights,
  colors,
  insightIcons,
  userRole2,

  showEdaModal,
  setShowEdaModal,
  edaSect,
  setEdaSect,
  statisticalSummaryItems,
  keyFindings,
  modelHealthItems,

  ...props
}) => {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(
  props.mapView === "choropleth"
);

const toggleRightPanel = () => {
  setIsRightPanelOpen((prev) => !prev);
};

useEffect(() => {
  const timer = setTimeout(() => {
    if (props.mapView === "choropleth") {
      setIsRightPanelOpen(true);
    } else if (props.mapView === "interactive") {
      setIsRightPanelOpen(false);
    }
  }, 0);

  return () => clearTimeout(timer);
}, [props.mapView]);

  useEffect(() => { /* automatically closes */
    const handleResize = () => {
        if (window.innerWidth <= 1056) {
          setIsRightPanelOpen(false);
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

  if (!isOpen) return null;

  const shouldBlurAnalytics =
    rightNav === "analytics" &&
    props.mapView === "choropleth" &&
    (!props.selected || props.selected === "none");

  return (
    <aside className={`dbmright-panel ${isRightPanelOpen ? "open" : "closed"}`}>
      {/* Tabs */}
      <div className="right-panel-header">
        <button className="toggle-panel-btn" onClick={toggleRightPanel}>
          {isRightPanelOpen ? "→" : "←"}
        </button>

        <div className="segmented-control small slide two">
          <span className={`slider ${rightNav}`} />

          {["analytics", "export"].map((tab) => (
            <button
              key={tab}
              className={rightNav === tab ? "active" : ""}
              onClick={() => setRightNav(tab as "analytics" | "export")}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="right-panel-content">
        {rightNav === "analytics" && (
          <div>
            {shouldBlurAnalytics ? (
              <div className="right-panel-empty-state">
                <p className="right-panel-empty-title">
                  Choose a layer to view this section.
                </p>
              </div>
            ) : props.mapView === "interactive" ? (
              <div className="right-panel-empty-state">
                <p className="right-panel-empty-title">
                  Click the <strong>Choropleth</strong> map to view this section.
                </p>
              </div>
            ) : (
              <>
                <DbChartsSection {...props} />
                <DbAnalyticsSection
                  keyInsights={keyInsights}
                    colors={colors}
                    insightIcons={insightIcons}
                    userRole2={userRole2}
                    mapView={props.mapView}
                    selected={props.selected}
                    year={props.year}
                    showEdaModal={showEdaModal}
                    setShowEdaModal={setShowEdaModal}
                    edaSect={edaSect}
                    setEdaSect={setEdaSect}
                    statisticalSummaryItems={statisticalSummaryItems}
                    keyFindings={keyFindings}
                    modelHealthItems={modelHealthItems}
                  />
              </>
            )}
          </div>
        )}

        {rightNav === "export" && (
          <>
            <ChartExportPool visible={true} year={props.year} />
            <DbExportSection
              sections={exportSections}
              recentDownloads={recentDownloads}
              handleDownload={handleDownload}
            />
          </>
        )}
      </div>
    </aside>
  );
};

export default DbRightPanel;
