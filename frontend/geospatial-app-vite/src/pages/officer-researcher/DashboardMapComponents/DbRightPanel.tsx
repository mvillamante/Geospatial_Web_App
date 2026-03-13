
import React, { useState, useEffect, type JSX } from "react";
import L from "leaflet";
import DbChartsSection from "./right/DbChartsSection";
import DbAnalyticsSection from "./right/DbAnalyticsSection";
import DbExportSection from "./right/DbExportSection";
import DbImportSection from "./right/DbImportSection";
import ChartExportPool from "./right/ChartExportPool";
import "../DashboardMapPage.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toPng } from "html-to-image";
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
  onGeneratingChange?: (generating: boolean) => void;
  setYear?: (y: number) => void;
  setSelectedLayer?: (layer: string) => void;
}

const DbRightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  toggle,
  rightNav,
  userRole,
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

  showEdaModal,
  setShowEdaModal,
  edaSect,
  setEdaSect,
  statisticalSummaryItems,
  keyFindings,
  modelHealthItems,
  onGeneratingChange,
  setYear,
  setSelectedLayer,

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

  const [choroMapImage, setChoroMapImage] = useState<string | null>(null);

  const [aiInsights, setAiInsights] = useState<{
    findings: string[];
    recommendations: string[];
    greenInsights: string[];
    hazardInsights: string[];
    calamityInsights: string[];
  }>({ findings: [], recommendations: [], greenInsights: [], hazardInsights: [], calamityInsights: [] });

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
      scale: 1.5,
      useCORS: true,
    });

    return canvas.toDataURL("image/jpeg", 0.85);
  };


  const fetchAllAiInsights = async (year: number): Promise<{
    findings: string[];
    recommendations: string[];
    greenInsights: string[];
    hazardInsights: string[];
    calamityInsights: string[];
  }> => {
    try {
      const [greenRes, hazardRes, calamityRes] = await Promise.allSettled([
        fetch(`/api/hazard/green-index/ai-insight/?year=${year}`).then(r => r.json()),
        fetch(`/api/hazard/hazard-index/ai-insight/?year=${year}`).then(r => r.json()),
        fetch(`/api/hazard/calamity-risk/ai-insight/?year=${year}`).then(r => r.json()),
      ]);

      const greenData = greenRes.status === "fulfilled" ? greenRes.value : null;
      const hazardData = hazardRes.status === "fulfilled" ? hazardRes.value : null;
      const calamityData = calamityRes.status === "fulfilled" ? calamityRes.value : null;

      const findings: string[] = [];
      if (greenData?.summary) findings.push(greenData.summary);
      if (greenData?.hotspots_insight) findings.push(greenData.hotspots_insight);
      if (hazardData?.summary) findings.push(hazardData.summary);
      if (hazardData?.hotspots_insight) findings.push(hazardData.hotspots_insight);
      if (calamityData?.summary) findings.push(calamityData.summary);

      const recs: string[] = [];
      if (greenData?.areas_for_greening_insight) recs.push(greenData.areas_for_greening_insight);
      if (hazardData?.lower_risk_insight) recs.push(hazardData.lower_risk_insight);
      if (hazardData?.earthquake_typhoon_insight) recs.push(hazardData.earthquake_typhoon_insight);
      if (calamityData?.risk_peak_insight) recs.push(calamityData.risk_peak_insight);
      if (calamityData?.adaptation_insight) recs.push(calamityData.adaptation_insight);

      // Per-section short insights for the index analysis sections
      const greenInsights: string[] = [];
      if (greenData?.summary) greenInsights.push(greenData.summary);
      if (greenData?.hotspots_insight) greenInsights.push(greenData.hotspots_insight);
      if (greenData?.areas_for_greening_insight) greenInsights.push(greenData.areas_for_greening_insight);

      const hazardInsights: string[] = [];
      if (hazardData?.summary) hazardInsights.push(hazardData.summary);
      if (hazardData?.hotspots_insight) hazardInsights.push(hazardData.hotspots_insight);
      if (hazardData?.lower_risk_insight) hazardInsights.push(hazardData.lower_risk_insight);
      if (hazardData?.earthquake_typhoon_insight) hazardInsights.push(hazardData.earthquake_typhoon_insight);

      const calamityInsights: string[] = [];
      if (calamityData?.summary) calamityInsights.push(calamityData.summary);
      if (calamityData?.risk_peak_insight) calamityInsights.push(calamityData.risk_peak_insight);
      if (calamityData?.adaptation_insight) calamityInsights.push(calamityData.adaptation_insight);

      return { findings, recommendations: recs, greenInsights, hazardInsights, calamityInsights };
    } catch (error) {
      console.error("Failed to fetch AI insights:", error);
      return { findings: [], recommendations: [], greenInsights: [], hazardInsights: [], calamityInsights: [] };
    }
  };

  // Cabuyao, Laguna approximate bounds so snapshot captures entire city boundaries
  const CABUYAO_BOUNDS: L.LatLngBoundsLiteral = [
    [14.18, 121.06],
    [14.30, 121.20],
  ];

  const captureChoroplethMap = async (): Promise<string | null> => {
    const mapContainer = document.querySelector(
      ".choroplethview-map .leaflet-container"
    ) as HTMLElement | null;
    if (!mapContainer) return null;

    const leafletMap: L.Map | null = (mapContainer as any)._leafletMapInstance ?? null;
    let prevCenter: L.LatLng | null = null;
    let prevZoom: number | null = null;

    try {
      if (leafletMap) {
        prevCenter = leafletMap.getCenter();
        prevZoom = leafletMap.getZoom();

        // Fit to GeoJSON/FeatureGroup bounds so the entire Cabuyao overlay is visible
        let bounds: L.LatLngBounds | null = null;
        leafletMap.eachLayer((layer: L.Layer) => {
          const l = layer as L.Layer & { getBounds?: () => L.LatLngBounds };
          if (l.getBounds && typeof l.getBounds === "function") {
            const layerBounds: L.LatLngBounds = l.getBounds();
            if (layerBounds.isValid()) {
              bounds = bounds ? bounds.extend(layerBounds) : layerBounds;
            }
          }
        });

        const useBounds = bounds !== null && (bounds as L.LatLngBounds).isValid();
        if (useBounds && bounds) {
          leafletMap.fitBounds(bounds, { animate: false, padding: [20, 20] });
        } else {
          // Fallback: center on Cabuyao bounds so snapshot captures full city
          leafletMap.fitBounds(CABUYAO_BOUNDS, { animate: false, padding: [20, 20] });
        }

        // Wait for tiles to load and the map to settle
        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => { if (!resolved) { resolved = true; resolve(); } };
          leafletMap!.once("moveend", () => setTimeout(done, 600));
          setTimeout(done, 1500);
        });
      }

      const dataUrl = await toPng(mapContainer, {
        cacheBust: true,
        pixelRatio: 1.5,
        backgroundColor: "#f2f2f2",
        filter: (node: HTMLElement) => {
          if (node.classList && node.classList.contains("leaflet-control-container")) return false;
          return true;
        },
      });
      return dataUrl;
    } catch (err) {
      console.error("Map capture failed:", err);
      return null;
    } finally {
      if (leafletMap && prevCenter && prevZoom != null) {
        leafletMap.setView(prevCenter, prevZoom, { animate: false });
      }
    }
  };

  // Reset choropleth map view to center on Cabuyao so snapshot captures full boundaries
  const resetMapToCabuyao = (): Promise<void> => {
    const mapContainer = document.querySelector(
      ".choroplethview-map .leaflet-container"
    ) as HTMLElement | null;
    const leafletMap: L.Map | null = mapContainer ? (mapContainer as any)._leafletMapInstance ?? null : null;
    if (!leafletMap) return Promise.resolve();

    let bounds: L.LatLngBounds | null = null;
    leafletMap.eachLayer((layer: L.Layer) => {
      const l = layer as L.Layer & { getBounds?: () => L.LatLngBounds };
      if (l.getBounds && typeof l.getBounds === "function") {
        const layerBounds: L.LatLngBounds = l.getBounds();
        if (layerBounds.isValid()) {
          bounds = bounds ? bounds.extend(layerBounds) : layerBounds;
        }
      }
    });

    const useBounds = bounds !== null && (bounds as L.LatLngBounds).isValid();
    if (useBounds && bounds) {
      leafletMap.fitBounds(bounds, { animate: false, padding: [20, 20] });
    } else {
      leafletMap.fitBounds(CABUYAO_BOUNDS, { animate: false, padding: [20, 20] });
    }

    return new Promise<void>((resolve) => {
      const done = () => resolve();
      leafletMap.once("moveend", () => setTimeout(done, 400));
      setTimeout(done, 1200);
    });
  };

  // Generate report
  const generateReport = async (reportYear: number) => {
    try {
      // Force Hazard Index layer and report year so snapshot always shows hazard map for chosen year
      if (setSelectedLayer) setSelectedLayer("hazard");
      if (setYear) setYear(reportYear);
      await new Promise(r => setTimeout(r, 1200));

      // Reset map to center on Cabuyao so snapshot captures entire boundaries
      await resetMapToCabuyao();

      setIsGenerating(true);
      onGeneratingChange?.(true);

      await new Promise(r => setTimeout(r, 800));

      const choroCapture = await captureChoroplethMap();

      const [
        riskChart,
        greenChart,
        hazardChart,
        aiData,
      ] = await Promise.all([
        captureChart("chart-risk-likelihood"),
        captureChart("chart-green-index-projection"),
        captureChart("chart-hazard-index-trend"),
        fetchAllAiInsights(reportYear),
      ]);

      setChartImages({
        green: greenChart,
        hazard: hazardChart,
        risk: riskChart
      });

      setChoroMapImage(choroCapture);

      setAiInsights(aiData);

      // allow React to render charts, maps, and AI insights into the hidden report
      await new Promise(r => setTimeout(r, 500));

      const element = document.getElementById("environmental-report");

      if (!element) {
        console.error("Report element not found");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        windowWidth: 794,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const marginX = 8;
      const marginTop = 14;
      const marginBottom = 10;
      const contentW = pdfWidth - marginX * 2;
      const contentH = pdfHeight - marginTop - marginBottom;

      const totalImgHeight = (canvas.height * contentW) / canvas.width;
      const mmToPx = canvas.width / contentW;

      // Detect hard page-break positions from newPage spacer divs
      const domToMm = totalImgHeight / element.offsetHeight;
      const elementRect = element.getBoundingClientRect();
      const breaks: number[] = [0];

      const wrapper = element.querySelector(':scope > div') as HTMLElement;
      if (wrapper) {
        for (const child of Array.from(wrapper.children)) {
          const el = child as HTMLElement;
          if (el.style.pageBreakBefore === 'always' || el.style.breakBefore === 'page') {
            breaks.push((el.getBoundingClientRect().bottom - elementRect.top) * domToMm);
          }
        }
      }
      breaks.push(totalImgHeight);

      // For sections taller than a single page, add intermediate breaks
      const finalBreaks: number[] = [];
      for (let i = 0; i < breaks.length - 1; i++) {
        finalBreaks.push(breaks[i]);
        const span = breaks[i + 1] - breaks[i];
        if (span > contentH) {
          let pos = breaks[i] + contentH;
          while (pos < breaks[i + 1]) {
            finalBreaks.push(pos);
            pos += contentH;
          }
        }
      }
      finalBreaks.push(totalImgHeight);
      const uniqueBreaks = [...new Set(finalBreaks)].sort((a, b) => a - b);

      // Generate PDF pages with margins, using JPEG compression
      const pdf = new jsPDF("p", "mm", "a4");
      for (let i = 0; i < uniqueBreaks.length - 1; i++) {
        if (i > 0) pdf.addPage();
        const startMm = uniqueBreaks[i];
        const endMm = uniqueBreaks[i + 1];
        const sliceH = endMm - startMm;
        const startPx = Math.round(startMm * mmToPx);
        const heightPx = Math.round(sliceH * mmToPx);
        if (heightPx <= 0) continue;
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = heightPx;
        const ctx = slice.getContext('2d');
        if (!ctx) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, startPx, canvas.width, heightPx, 0, 0, canvas.width, heightPx);
        const yPos = i === 0 ? marginTop / 2 : marginTop;
        pdf.addImage(slice.toDataURL("image/jpeg", 0.75), "JPEG", marginX, yPos, contentW, sliceH);
      }

      pdf.save(`Environmental_Report_${reportYear}.pdf`);

    } catch (error) {
      console.error("Report generation failed:", error);
    } finally {
      setIsGenerating(false);
      onGeneratingChange?.(false);
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

          {["analytics", "export", "import"].map((tab) => {
            return (
              <button
                key={tab}
                className={`${rightNav === tab ? "active" : ""}`}
                onClick={() => setRightNav(tab as "analytics" | "export" | "import")}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
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
                  userRole={userRole}
                  keyInsights={keyInsights}
                  colors={colors}
                  insightIcons={insightIcons}
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
          props.mapView !== "choropleth" ? (
            <div className="right-panel-empty-state">
              <div className="right-panel-empty-state">
                <p className="right-panel-empty-title">
                  Switch to the <strong>Choropleth</strong> map to generate a report.
                </p>
              </div>
            </div>
          ) : <>
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
        <div>
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

            choroMapImageUrl={choroMapImage ?? undefined}

            greenInsights={aiInsights.greenInsights.length > 0 ? aiInsights.greenInsights : undefined}
            hazardInsights={aiInsights.hazardInsights.length > 0 ? aiInsights.hazardInsights : undefined}
            calamityInsights={aiInsights.calamityInsights.length > 0 ? aiInsights.calamityInsights : undefined}

            keyFindings={aiInsights.findings.length > 0 ? aiInsights.findings : undefined}
            recommendations={aiInsights.recommendations.length > 0 ? aiInsights.recommendations : undefined}
          />
        </div>
      </div>
    </aside>
  );
};

export default DbRightPanel;