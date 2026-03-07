
import React, { useState, useEffect, type JSX } from "react";
import DbChartsSection from "./right/DbChartsSection";
import DbAnalyticsSection from "./right/DbAnalyticsSection";
import DbExportSection from "./right/DbExportSection";
import DbImportSection from "./right/DbImportSection";
import ChartExportPool from "./right/ChartExportPool";
import "../DashboardMapPage.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import EnvironmentalReportTemplate from "../../../components/reports/EnvironmentalReportTemplate";
import { useGreenIndexData } from "../../../hooks/useGreenIndexData";
import { useHazardData } from "../../../hooks/useHazardData";
import { useCalamityRiskData } from "../../../hooks/useCalamityRiskData";

interface RightPanelProps {
  isOpen: boolean;
  toggle: () => void;
  rightNav: "analytics" | "export" | "import";
  setRightNav: (val: "analytics" | "export" | "import") => void;
  exportSections: any[];
  recentDownloads: any[];
  handleDownload: (item: any, section: string) => void;
  // Props for charts section
  universalGreenAvg?: number | null;
  universalHazardAvg?: number | null;
  universalCalamityAvg?: number | null;

  reportYear: number
  setReportYear: (y: number) => void

  reportType: "full" | "green" | "hazard" | "calamity"
  setReportType: (t: "full" | "green" | "hazard" | "calamity") => void

  reportFormat: "pdf" | "docx"
  setReportFormat: (f: "pdf" | "docx") => void

  setRecentDownloads: React.Dispatch<React.SetStateAction<any[]>>;

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
  setRecentDownloads,
  handleDownload,

  reportYear,
  setReportYear,
  reportFormat,
  setReportFormat,

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

  const [isGenerating, setIsGenerating] = useState(false);

  const { cityAverage: reportGreenAvg, data: reportGreenData } =
    useGreenIndexData(reportYear, true);

  const { cityAverage: reportHazardAvg, data: reportHazardData } =
    useHazardData(reportYear, true);

  const { cityAverage: reportCalamityAvg, data: reportCalamityData } =
    useCalamityRiskData(reportYear, true);

  const toggleRightPanel = () => {
    setIsRightPanelOpen((prev) => !prev);
  };

  const [chartImages, setChartImages] = useState({
    green: null as string | null,
    hazard: null as string | null,
    risk: null as string | null
  });

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

  const captureChart = async (chartId: string) => {
    const chartElement = document.getElementById(chartId);

    if (!chartElement) return null;

    const canvas = await html2canvas(chartElement, {
      scale: 2,
      useCORS: true,
    });

    return canvas.toDataURL("image/png");
  };


  // Generate report
  const generateReport = async (reportYear: number) => {
    try {
      setIsGenerating(true);

      const riskChart = await captureChart("chart-risk-likelihood");
      const greenChart = await captureChart("chart-green-index-projection");
      const hazardChart = await captureChart("chart-hazard-index-trend");

      setChartImages({
        green: greenChart,
        hazard: hazardChart,
        risk: riskChart
      });

      // allow React to render the charts into the hidden report
      await new Promise(r => setTimeout(r, 300));

      const element = document.getElementById("environmental-report");

      if (!element) {
        console.error("Report element not found");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Environmental_Report_${reportYear}.pdf`);

    } catch (error) {
      console.error("Report generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert barangay data into ranking arrays
  const greenRanking = Object.entries(reportGreenData ?? {})
    .map(([name, data]: any) => ({
      name,
      score: data.green_index ?? 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const hazardRanking = Object.entries(reportHazardData ?? {})
    .map(([name, data]: any) => ({
      name,
      score: data.hazard_index ?? 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const calamityRanking = Object.entries(reportCalamityData ?? {})
    .map(([name, data]: any) => ({
      name,
      score: data.calamity_risk ?? 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return (
    <aside className={`dbmright-panel ${isRightPanelOpen ? "open" : "closed"}`}>
      {/* Tabs */}
      <div className="right-panel-header">
        <button className="toggle-panel-btn" onClick={toggleRightPanel}>
          {isRightPanelOpen ? "→" : "←"}
        </button>

        <div className="segmented-control small slide three">
          <span className={`slider ${rightNav}`} />

          {["analytics", "export", "import"].map((tab) => (
            <button
              key={tab}
              className={rightNav === tab ? "active" : ""}
              onClick={() => setRightNav(tab as "analytics" | "export" | "import")}
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
            <h4>Export Section</h4>
            <div className="report-generator">

              <h3>Environmental Risk and Sustainability Reports</h3>

              <p className="report-description">
                Generate a comprehensive environmental risk assessment report
                for the selected year. The report includes Green Index, Hazard Index,
                Calamity Risk analysis, and barangay-level insights.
              </p>

              {/* Year */}
              <label>Report Year</label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
              >
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button
                className="generate-report-btn"
                onClick={() => generateReport(reportYear)}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating report..." : "Generate Full Report"}
              </button>

            </div>

            <ChartExportPool visible={true} year={props.year} />

            <DbExportSection
              sections={exportSections}
              recentDownloads={recentDownloads}
              handleDownload={handleDownload}
            />
          </>
        )}

        {rightNav === "import" && (
          <DbImportSection
            getGreenIndexColor={props.getGreenIndexColor}
            getHazardIndexColor={props.getHazardIndexColor}
            getCalamityRiskColor={props.getCalamityRiskColor}
          />
        )}
      </div>
      {/* Hidden report container for PDF generation */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1
        }}
      >
        <div id="environmental-report">
          <EnvironmentalReportTemplate
            year={reportYear}
            greenIndexAvg={reportGreenAvg ?? 0}
            hazardIndexAvg={reportHazardAvg ?? 0}
            calamityRiskAvg={reportCalamityAvg ?? 0}

            greenBarangays={greenRanking}
            hazardBarangays={hazardRanking}
            calamityBarangays={calamityRanking}

            greenChart={chartImages.green}
            hazardChart={chartImages.hazard}
            riskChart={chartImages.risk}
          />
        </div>
      </div>
    </aside>
  );
};

export default DbRightPanel;
