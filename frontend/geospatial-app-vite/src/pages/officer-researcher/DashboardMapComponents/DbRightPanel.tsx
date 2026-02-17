import React, { useState, useEffect } from "react";
import DbChartsSection from "./right/DbChartsSection";
import DbAnalyticsSection from "./right/DbAnalyticsSection";
import DbExportSection from "./right/DbExportSection";
import "../DashboardMapPage.css";

interface RightPanelProps {
  isOpen: boolean;
  toggle: () => void;
  rightNav: "charts" | "analytics" | "export";
  setRightNav: (val: "charts" | "analytics" | "export") => void;
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
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const toggleRightPanel = () => {
    setIsRightPanelOpen((prev) => !prev);
  };

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

  return (
    <aside className={`dbmright-panel ${isRightPanelOpen ? "open" : "closed"}`}>
      {/* Tabs */}
      <div className="right-panel-header">
        <button className="toggle-panel-btn" onClick={toggleRightPanel}>
          {isRightPanelOpen ? "→" : "←"}
        </button>

        <div className="segmented-control small slide three">
          <span className={`slider ${rightNav}`} />

          {["charts", "analytics", "export"].map((tab) => (
            <button
              key={tab}
              className={rightNav === tab ? "active" : ""}
              onClick={() => setRightNav(tab as "charts" | "analytics" | "export")}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="right-panel-content">
        {rightNav === "charts" && (
          <DbChartsSection {...props} />
        )}
        {rightNav === "analytics" && (
          <DbAnalyticsSection
            keyInsights={keyInsights}
            colors={colors}
            insightIcons={insightIcons}
            userRole2={userRole2}
            showEdaModal={showEdaModal}
            setShowEdaModal={setShowEdaModal}
            edaSect={edaSect}
            setEdaSect={setEdaSect}
            statisticalSummaryItems={statisticalSummaryItems}
            keyFindings={keyFindings}
            modelHealthItems={modelHealthItems}
          />
        )}
        {rightNav === "export" && (
          <DbExportSection
            sections={exportSections}
            recentDownloads={recentDownloads}
            handleDownload={handleDownload}
          />
        )}
      </div>
    </aside>
  );
};

export default DbRightPanel;
